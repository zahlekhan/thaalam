import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { CARD_H, CARD_W, Card, Stage, readingOf, type CardNode, type StageNode } from './CardShape'
import { API_URL, askModel, measurePixels, PhotoRejected, shrink, uploadPhoto, type ModelReading } from './reading'
import { mixFor } from './music'
import { play, startSound } from './sound'
import { Camera, hasLiveCamera } from './Camera'
import {
  cards,
  createRoom,
  doc,
  joinRoom,
  onPeers,
  peerCount,
  pendingPhotos,
  photos,
  roomFromUrl,
  type CardData,
} from './room'

const STAGE_W = 1120
const STAGE_H = 640

type Sample = {
  file: string
  credit: { name: string; profile: string; photo: string }
  readings: Record<string, ModelReading>
}

// Which model reads photos. Jev by default; switch it from the Options menu.
let currentModel = localStorage.getItem('thaalam-model') ?? 'jev'

// A shared link drops you straight into its room.
const initialRoom = roomFromUrl()
if (initialRoom) joinRoom(initialRoom)

// Tiny store so the overlay can show what's playing.
let mix = { code: '', bpm: 0, scale: '', count: 0 }
const listeners = new Set<() => void>()
const setMix = (m: typeof mix) => {
  mix = m
  listeners.forEach((l) => l())
}
const useMix = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => mix)

// One-line notice (e.g. a rejected photo). Same listener set as the mix store.
let notice = ''
let noticeTimer = 0
function notify(msg: string) {
  notice = msg
  listeners.forEach((l) => l())
  clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice = ''
    listeners.forEach((l) => l())
  }, 5000)
}
const useNotice = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => notice)

let started = false

const nodeTypes = { card: Card, stage: Stage }

const STAGE_NODE: StageNode = {
  id: 'stage',
  type: 'stage',
  position: { x: 0, y: 0 },
  width: STAGE_W,
  height: STAGE_H,
  data: {},
  draggable: false,
  selectable: false,
  deletable: false,
  focusable: false,
  zIndex: -1,
}

const FIT_STAGE = { nodes: [{ id: 'stage' }], padding: 0.05, maxZoom: 1 }

// A card plays when its centre is on the stage.
const onStage = (c: Pick<CardData, 'x' | 'y'>) => {
  const cx = c.x + CARD_W / 2
  const cy = c.y + CARD_H / 2
  return cx >= 0 && cx <= STAGE_W && cy >= 0 && cy <= STAGE_H
}

// Next free slot on the stage.
function freeSpot() {
  const n = Array.from(cards.values()).filter(onStage).length
  const col = n % 5
  const row = Math.floor(n / 5) % 2
  return { x: 40 + col * 212, y: 60 + row * 280 }
}

async function addCard(src: string, model: ModelReading | null, at?: { x: number; y: number }) {
  const id = crypto.randomUUID()
  const spot = at ?? freeSpot()
  // The photo stays local until the model clears it — peers see a
  // "Listening..." card but never the image before that.
  pendingPhotos.set(id, src)
  doc.transact(() => {
    cards.set(id, { id, x: spot.x, y: spot.y, status: 'reading', model: '', pixels: '' })
  })
  // The card may be moved or removed while we read it, so always patch the latest copy.
  const update = (patch: Partial<CardData>) => {
    const c = cards.get(id)
    if (c) cards.set(id, { ...c, ...patch })
  }
  update({ pixels: JSON.stringify(await measurePixels(src)) })
  try {
    const m = model ?? (await askModel(src, currentModel))
    // Cleared — park it in R2 so rooms and the public gallery can link to it.
    photos.set(id, await uploadPhoto(src))
    pendingPhotos.delete(id)
    update({ model: JSON.stringify(m), status: 'ready' })
  } catch (e) {
    if (e instanceof PhotoRejected) {
      pendingPhotos.delete(id)
      doc.transact(() => {
        cards.delete(id)
        photos.delete(id)
      })
      notify(e.message)
      return
    }
    console.warn('[thaalam] model reading failed, using pixels only:', e)
    // Model unreachable: keep the photo (shared now) and let pixels make a part.
    photos.set(id, src)
    pendingPhotos.delete(id)
    update({ status: 'ready' })
  }
}

function stageCards() {
  return Array.from(cards.values())
    .filter((c) => c.status === 'ready' && onStage(c))
    .sort((a, b) => a.id.localeCompare(b.id)) // same order on every device
    .flatMap((c) => {
      const reading = readingOf(c)
      return reading ? [{ id: c.id, reading }] : []
    })
}

// Rebuild the flow's nodes from the shared doc, keeping local UI state (selection, drag, size).
function nodesFromDoc(prev: Node[]): Node[] {
  const old = new Map(prev.map((n) => [n.id, n]))
  return [
    STAGE_NODE,
    ...Array.from(cards.values()).map(
      (c): CardNode => ({
        ...(old.get(c.id) as CardNode | undefined),
        id: c.id,
        type: 'card',
        position: { x: c.x, y: c.y },
        data: { ...c, onStage: onStage(c) },
      })
    ),
  ]
}

function Board() {
  const flow = useReactFlow()
  const [nodes, setNodes] = useState<Node[]>(() => nodesFromDoc([]))

  useEffect(() => {
    let timer = 0
    const refresh = () => {
      setNodes(nodesFromDoc)
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        const playing = stageCards()
        const m = mixFor(playing)
        setMix({ code: m.code, bpm: m.bpm, scale: m.scale, count: playing.length })
        if (started) play(m.code)
      }, 120)
    }
    cards.observe(refresh)
    refresh()
    return () => cards.unobserve(refresh)
  }, [])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((n) => applyNodeChanges(changes, n))
    doc.transact(() => {
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          const c = cards.get(ch.id)
          if (c) cards.set(ch.id, { ...c, x: ch.position.x, y: ch.position.y })
        } else if (ch.type === 'remove' && cards.has(ch.id)) {
          cards.delete(ch.id)
          photos.delete(ch.id)
        }
      }
    })
  }, [])

  const dropImages = useCallback(
    async (files: File[], clientX: number, clientY: number) => {
      const p = flow.screenToFlowPosition({ x: clientX, y: clientY })
      for (const [i, file] of files.filter((f) => f.type.startsWith('image/')).entries()) {
        addCard(await shrink(file), null, { x: p.x - CARD_W / 2 + i * 30, y: p.y - CARD_H / 2 + i * 30 })
      }
    },
    [flow]
  )

  // Keep the stage in view when the window changes size (phone rotation, split screens).
  useEffect(() => {
    const fit = () => flow.fitView(FIT_STAGE)
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [flow])

  // Pasted images land in the middle of the screen.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) dropImages(files, innerWidth / 2, innerHeight / 2)
    }
    addEventListener('paste', onPaste)
    return () => removeEventListener('paste', onPaste)
  }, [dropImages])

  return (
    <div
      className="app"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        dropImages(Array.from(e.dataTransfer.files), e.clientX, e.clientY)
      }}
    >
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={FIT_STAGE}
        minZoom={0.1}
      />
      <Overlay />
      <Disclaimer />
    </div>
  )
}

function usePeers() {
  const [n, setN] = useState(peerCount)
  const [room, setRoom] = useState(initialRoom)
  useEffect(() => onPeers(() => setN(peerCount())), [room])
  return { n, room, setRoom }
}

function Overlay() {
  const m = useMix()
  const notice = useNotice()
  const { n, room, setRoom } = usePeers()
  const [on, setOn] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(currentModel)
  const [camera, setCamera] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const captureRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/samples/samples.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch((e) => {
        console.warn('[thaalam] could not load samples:', e)
        setSamples([])
      })
    fetch(`${API_URL}/api/health`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((h: { default: string; models: string[] }) => {
        setModels(h.models)
        // Fall back to the server's default if the saved choice isn't available here.
        if (!h.models.includes(currentModel)) pickModel(h.default)
      })
      .catch((e) => {
        console.warn(`[thaalam] backend health check failed (${API_URL || 'same origin'}/api/health):`, e)
        setModels([])
      })
  }, [])

  const pickModel = (m: string) => {
    currentModel = m
    localStorage.setItem('thaalam-model', m)
    setModel(m)
  }

  // Whether this room is listed in the public gallery.
  useEffect(() => {
    if (!room) return setIsPublic(false)
    fetch(`${API_URL}/api/rooms/${room}`)
      .then((r) => r.json())
      .then((s) => setIsPublic(!!s.published))
      .catch(() => {})
  }, [room])

  const togglePublic = async () => {
    if (!room) return
    try {
      await fetch(`${API_URL}/api/rooms/${room}/${isPublic ? 'unpublish' : 'publish'}`, { method: 'POST' })
      setIsPublic(!isPublic)
    } catch {
      notify("Couldn't reach the server")
    }
  }

  const start = async () => {
    await startSound()
    started = true
    setOn(true)
    play(mix.code)
  }

  const invite = async () => {
    if (!room) setRoom(createRoom())
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Share this link', location.href)
    }
  }

  return (
    <div className="overlay">
      <div className="topbar">
        <span className="brand">Thaalam</span>
        {notice && <span className="notice">{notice}</span>}
        {on ? (
          <span className="status">
            {m.count ? `${m.count} playing · ${m.bpm} BPM · ${m.scale}` : 'Drop a photo on the stage'}
          </span>
        ) : (
          <button className="primary" onClick={start}>Tap to start sound</button>
        )}
        <button onClick={() => fileRef.current?.click()}>Add photo</button>
        <button onClick={() => (hasLiveCamera() ? setCamera(true) : captureRef.current?.click())}>Camera</button>
        <button onClick={invite} title={room ? `Room ${room}` : 'Create a room and copy its link'}>
          {copied ? 'Link copied' : room ? `Room · ${n} here` : 'Invite friends'}
        </button>
        {room && (
          <button
            onClick={togglePublic}
            title={isPublic ? 'Listed in the public gallery — click to unlist' : 'List this canvas in the public gallery'}
          >
            {isPublic ? 'Public' : 'Share publicly'}
          </button>
        )}
        <a className="nav" href="/gallery">
          Gallery
        </a>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (e) => {
            for (const f of Array.from(e.target.files ?? [])) addCard(await shrink(f), null)
            e.target.value = ''
          }}
        />
        <input
          ref={captureRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) addCard(await shrink(f), null)
            e.target.value = ''
          }}
        />
      </div>

      {camera && (
        <Camera
          onClose={() => setCamera(false)}
          onShot={async (photo) => {
            setCamera(false)
            addCard(await shrink(photo), null)
          }}
        />
      )}

      {showCode && <pre className="code">{m.code || '// nothing on the stage yet'}</pre>}

      <div className="options">
        {optionsOpen && (
          <div className="options-menu">
            <label>
              <input type="checkbox" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} />
              Show code
            </label>
            {models.length > 0 && (
              <label>
                Model
                <select value={model} onChange={(e) => pickModel(e.target.value)} title="Model that reads photos">
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m === 'jev' ? 'Jev' : m === 'vegaml' ? 'vegaml (local)' : m}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        <button className="options-toggle" onClick={() => setOptionsOpen((v) => !v)} aria-expanded={optionsOpen}>
          {optionsOpen ? 'Close' : 'Options'}
        </button>
      </div>

      {samples.length > 0 && (
        <div className="tray">
          <span>Try one</span>
          {samples.map((s) => (
            <button
              key={s.file}
              className="sample"
              title={`Photo by ${s.credit.name} on Unsplash`}
              onClick={async () => addCard(await toDataUrl(`/samples/${s.file}`), s.readings[currentModel] ?? null)}
            >
              <img src={`/samples/${s.file}`} alt="" />
            </button>
          ))}
          <a className="credit" href="/samples/CREDITS.md" target="_blank" rel="noreferrer">
            Photos: Unsplash
          </a>
        </div>
      )}
    </div>
  )
}

async function toDataUrl(url: string) {
  return shrink(await (await fetch(url)).blob())
}

// Shown once, then remembered on this device.
function Disclaimer() {
  const [show, setShow] = useState(() => localStorage.getItem('thaalam-seen-disclaimer-v2') !== '1')
  if (!show) return null
  return (
    <div className="disclaimer-backdrop">
      <div className="disclaimer">
        <p>
          Photos you add are shared with everyone in the room and read by an AI model. Nudity and
          profanity are not allowed. Canvases are permanent — publishing one lists it in the public
          gallery for anyone to open.
        </p>
        <button
          className="primary"
          onClick={() => {
            localStorage.setItem('thaalam-seen-disclaimer-v2', '1')
            setShow(false)
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

type GalleryRoom = { room: string; at: number; cards: number; previews: string[] }

function GalleryPage() {
  const [rooms, setRooms] = useState<GalleryRoom[] | null>(null)
  useEffect(() => {
    fetch(`${API_URL}/api/gallery`)
      .then((r) => r.json())
      .then((g) => setRooms(g.rooms ?? []))
      .catch(() => setRooms([]))
  }, [])
  return (
    <div className="gallery-page">
      <div className="topbar">
        <span className="brand">Thaalam</span>
        <span className="status">Public canvases</span>
        <a className="nav" href="/">
          Back to canvas
        </a>
      </div>
      <div className="gallery-grid">
        {rooms === null ? (
          <p className="gallery-empty">Loading…</p>
        ) : rooms.length === 0 ? (
          <p className="gallery-empty">Nothing public yet — share a canvas to see it here.</p>
        ) : (
          rooms.map((r) => (
            <a key={r.room} className="gallery-card" href={`/?room=${r.room}`}>
              <div className="gallery-thumbs">
                {r.previews.length ? (
                  r.previews.map((p) => <img key={p} src={p} alt="" />)
                ) : (
                  <div className="gallery-noimg" />
                )}
              </div>
              <div className="gallery-meta">
                <span>Room {r.room}</span>
                <span>
                  {r.cards} cards · {new Date(r.at).toLocaleDateString()}
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  )
}

export default function App() {
  if (location.pathname === '/gallery') return <GalleryPage />
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  )
}
