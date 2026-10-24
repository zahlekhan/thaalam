import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, type NodeChange } from '@xyflow/react'
import qrcode from 'qrcode-generator'
import { CARD_H, CARD_W, Card, describe, type CardNode } from './CardShape'
import { API_URL, shrink, type ModelReading } from './reading'
import { mixFor } from './music'
import { play, startSound, stopSound } from './sound'
import { addCard, playingCards, removeCards, toggleMute } from './canvas'
import {
  cards,
  createRoom,
  getName,
  joinRoom,
  onPeers,
  peerNames,
  pendingPhotos,
  photos,
  randomName,
  roomFromUrl,
  setName,
} from './room'
import { dismissToast, toast, useToast } from './toast'
import {
  BackIcon,
  CloseIcon,
  MuteIcon,
  SoundIcon,
  TrashIcon,
  CodeIcon,
  CopyIcon,
  GalleryIcon,
  MoreIcon,
  PeopleIcon,
  PhotoIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
} from './icons'

type Sample = {
  file: string
  credit: { name: string; profile: string; photo: string }
  readings: Record<string, ModelReading>
}

// Which model reads photos. Jev by default; developers can switch with ?dev in the URL.
const DEV = new URLSearchParams(location.search).has('dev')
let currentModel = localStorage.getItem('thaalam-model') ?? 'jev'

// A shared link drops you straight into its room.
const initialRoom = roomFromUrl()
if (initialRoom) joinRoom(initialRoom)

// Tiny store so the bars can show what's playing.
type Mix = { code: string; bpm: number; mood: string; count: number; total: number }
let mix: Mix = { code: '', bpm: 0, mood: '', count: 0, total: 0 }
const mixListeners = new Set<() => void>()
const useMix = () => useSyncExternalStore((l) => (mixListeners.add(l), () => mixListeners.delete(l)), () => mix)

type SoundState = 'off' | 'loading' | 'on'
let sound: SoundState = 'off'
const soundListeners = new Set<() => void>()
const useSound = () => useSyncExternalStore((l) => (soundListeners.add(l), () => soundListeners.delete(l)), () => sound)

const nodeTypes = { card: Card }

// Half-size of the area new cards land in, in canvas units around the middle of the door.
const REGION = { w: 460, h: 520 }

// Where the most readable cards are, so a phone can open on the busy part of the door.
// Cards stacked on top of each other don't count extra: you can't read them anyway.
function densest(points: { x: number; y: number }[]) {
  let best = points[0]
  let most = -1
  const stacked = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < CARD_W * 0.6 && Math.abs(a.y - b.y) < CARD_H * 0.6
  for (const p of points) {
    const near = points.filter((q) => (q === p || !stacked(p, q)) && Math.hypot(q.x - p.x, q.y - p.y) < 420).length
    if (near > most) {
      best = p
      most = near
    }
  }
  return best
}

// Rebuild the flow's nodes from the shared doc, keeping local UI state (selection, drag, size).
function nodesFromDoc(prev: CardNode[]): CardNode[] {
  const old = new Map(prev.map((n) => [n.id, n]))
  return Array.from(cards.values()).map((c) => ({
    ...old.get(c.id),
    id: c.id,
    type: 'card',
    position: { x: c.x, y: c.y },
    data: c,
    ariaLabel: describe(c).label,
  }))
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(t.tagName))

function Board() {
  const flow = useReactFlow<CardNode>()
  const [nodes, setNodes] = useState<CardNode[]>(() => nodesFromDoc([]))
  const soundState = useSound()
  const [joined, setJoined] = useState(false)
  const fitted = useRef(false)
  const m = useMix()

  useEffect(() => {
    let timer = 0
    const refresh = () => {
      setNodes(nodesFromDoc)
      // The first time a room's cards arrive, frame them.
      if (!fitted.current && cards.size > 0) {
        fitted.current = true
        // After React Flow measures the nodes. Phones open on the busiest part at a readable size
        // (pan for the rest); wider screens fit the whole door.
        setTimeout(() => {
          if (innerWidth < 640) {
            const c = densest(Array.from(cards.values()).map((c) => ({ x: c.x + CARD_W / 2, y: c.y + CARD_H / 2 })))
            flow.setCenter(c.x, c.y, { zoom: 0.72 })
          } else flow.fitView({ padding: { top: '96px', bottom: '120px', left: '4%', right: '4%' }, maxZoom: 1, minZoom: 0.4 }) // clear of both bars
        }, 80)
      }
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        const playing = playingCards()
        const m = mixFor(playing)
        mix = { code: m.code, bpm: m.bpm, mood: m.mood ?? '', count: playing.length, total: cards.size }
        mixListeners.forEach((l) => l())
        if (sound === 'on') play(m.code)
      }, 120)
    }
    cards.observe(refresh)
    refresh()
    return () => cards.unobserve(refresh)
  }, [flow])

  const setSound = (s: SoundState) => {
    sound = s
    soundListeners.forEach((l) => l())
  }
  const startPlaying = useCallback(async () => {
    setSound('loading')
    try {
      await startSound()
      setSound('on')
      play(mix.code)
    } catch (e) {
      console.error(e)
      setSound('off')
      toast("Couldn't load the sounds. Check your connection and press play again.", { tone: 'error' })
    }
  }, [])
  const toggleSound = useCallback(() => {
    if (sound === 'on') {
      stopSound()
      setSound('off')
    } else if (sound === 'off') startPlaying()
  }, [startPlaying])

  const onNodesChange = useCallback((changes: NodeChange<CardNode>[]) => {
    const kept = changes.filter((ch) => ch.type !== 'remove')
    setNodes((n) => applyNodeChanges(kept, n))
    removeCards(changes.flatMap((ch) => (ch.type === 'remove' ? [ch.id] : [])))
    for (const ch of changes) {
      if (ch.type === 'position' && ch.position) {
        const c = cards.get(ch.id)
        if (c) cards.set(ch.id, { ...c, x: ch.position.x, y: ch.position.y })
      }
    }
  }, [])

  // New photos land somewhere free on the fridge: never on top of another card, and inside
  // a portrait-friendly region so a phone at a readable zoom can see most of the door.
  const landingSpot = useCallback(() => {
    const taken = Array.from(cards.values()).map((c) => ({ x: c.x + CARD_W / 2, y: c.y + CARD_H / 2 }))
    const free = (p: { x: number; y: number }) =>
      taken.every((t) => Math.abs(t.x - p.x) > CARD_W * 1.1 || Math.abs(t.y - p.y) > CARD_H * 1.05)
    const pick = (x0: number, x1: number, y0: number, y1: number) => ({
      x: x0 + Math.random() * Math.max(0, x1 - x0),
      y: y0 + Math.random() * Math.max(0, y1 - y0),
    })

    // First try what you can see (between the bars), clipped to the shared region.
    const zoom = flow.getZoom()
    const tl = flow.screenToFlowPosition({ x: (CARD_W / 2) * zoom, y: 80 + (CARD_H / 2) * zoom })
    const br = flow.screenToFlowPosition({ x: innerWidth - (CARD_W / 2) * zoom, y: innerHeight - 110 - (CARD_H / 2) * zoom })
    const x0 = Math.max(tl.x, -REGION.w), x1 = Math.min(br.x, REGION.w)
    const y0 = Math.max(tl.y, -REGION.h), y1 = Math.min(br.y, REGION.h)
    if (x1 > x0 && y1 > y0) {
      for (let i = 0; i < 40; i++) {
        const p = pick(x0, x1, y0, y1)
        if (free(p)) return p
      }
    }
    // Nothing free in view: widen the search across the door, then bring that spot into view.
    for (let i = 0; i < 300; i++) {
      const grow = 1 + i / 60
      const p = pick(-REGION.w * grow, REGION.w * grow, -REGION.h * grow, REGION.h * grow)
      if (free(p)) {
        flow.setCenter(p.x, p.y, { zoom, duration: 300 })
        return p
      }
    }
    return pick(-REGION.w, REGION.w, -REGION.h, REGION.h)
  }, [flow])

  const addFiles = useCallback(
    async (files: File[], at?: { x: number; y: number }) => {
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (files.length && !images.length) toast('Only photos can go on the fridge.', { tone: 'error' })
      for (const [i, file] of images.entries()) {
        const spot = at ? { x: at.x + i * 24, y: at.y + i * 24 } : landingSpot()
        addCard(await shrink(file), null, spot, currentModel)
      }
    },
    [landingSpot]
  )

  const addSample = useCallback(
    async (s: Sample) => {
      addCard(await shrink(await (await fetch(`/samples/${s.file}`)).blob()), s.readings[currentModel] ?? null, landingSpot(), currentModel)
    },
    [landingSpot]
  )

  // Pasted images land in the middle of the screen.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) addFiles(files)
    }
    addEventListener('paste', onPaste)
    return () => removeEventListener('paste', onPaste)
  }, [addFiles])

  // Keyboard: Space plays or stops, M mutes the selected cards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!joined || typing(e.target) || document.querySelector('.sheet')) return
      if (e.key === ' ') {
        e.preventDefault()
        toggleSound()
      } else if (e.key === 'm' || e.key === 'M') {
        flow.getNodes().filter((n) => n.selected).forEach((n) => toggleMute(n.id))
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [flow, joined, toggleSound])

  return (
    <div
      className={`app${nodes.some((n) => n.selected) ? ' has-selection' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        addFiles(Array.from(e.dataTransfer.files), flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }))
      }}
    >
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: innerWidth / 2, y: innerHeight * 0.45, zoom: 1 }}
        minZoom={0.3}
        maxZoom={2}
        zoomOnDoubleClick={false}
        deleteKeyCode={['Backspace', 'Delete']}
        attributionPosition="top-right"
        aria-label="Fridge door with photo cards"
      />
      <TopBar />
      <SelectionBar nodes={nodes} onDone={() => flow.setNodes((ns) => ns.map((n) => ({ ...n, selected: false })))} />
      <BottomBar soundState={soundState} onToggleSound={toggleSound} onFiles={addFiles} onSample={addSample} />
      {m.total === 0 && joined && <EmptyHint />}
      <ToastView />
      {!joined && (
        <JoinSheet
          onJoin={(withSound) => {
            setJoined(true)
            if (withSound) startPlaying()
          }}
        />
      )}
    </div>
  )
}

// Tapping a card shows its actions here, above the bottom bar: in thumb reach, never off-screen.
function SelectionBar({ nodes, onDone }: { nodes: CardNode[]; onDone: () => void }) {
  const picked = nodes.filter((n) => n.selected && n.data.status === 'ready')
  if (!picked.length) return null
  const one = picked.length === 1 ? picked[0].data : null
  const allMuted = picked.every((n) => n.data.muted)
  const thumb = one ? (photos.get(one.id) ?? pendingPhotos.get(one.id)) : null
  return (
    <div className="selection" role="toolbar" aria-label="Selected photo">
      {thumb && <img src={thumb} alt="" />}
      <span className="selection-name">
        <b>{one ? describe(one).title : `${picked.length} photos`}</b>
        <span>{one ? describe(one).line : 'selected'}</span>
      </span>
      <button onClick={() => picked.forEach((n) => (allMuted || !n.data.muted) && toggleMute(n.id))}>
        {allMuted ? <SoundIcon size={20} /> : <MuteIcon size={20} />}
        {allMuted ? 'Unmute' : 'Mute'}
      </button>
      <button
        onClick={() => {
          removeCards(picked.map((n) => n.id))
          onDone()
        }}
      >
        <TrashIcon size={20} />
        Delete
      </button>
    </div>
  )
}

const MOOD_WORD: Record<string, string> = { calm: 'calm', happy: 'happy', tense: 'tense', festive: 'festive', melancholy: 'moody' }

function TopBar() {
  const m = useMix()
  const soundState = useSound()
  const [changed, setChanged] = useState(false)
  const prev = useRef({ bpm: 0, mood: '' })

  // A tempo or mood change stays highlighted until someone notices: a tap on the chip...
  useEffect(() => {
    const p = prev.current
    if (p.bpm && m.bpm && (p.bpm !== m.bpm || p.mood !== m.mood)) setChanged(true)
    prev.current = { bpm: m.bpm, mood: m.mood }
  }, [m.bpm, m.mood])

  // ...or until their next tap anywhere, which means they've seen it.
  useEffect(() => {
    if (!changed) return
    const clear = () => setChanged(false)
    const t = setTimeout(() => addEventListener('pointerdown', clear, { once: true }), 800)
    return () => {
      clearTimeout(t)
      removeEventListener('pointerdown', clear)
    }
  }, [changed])

  const photosWord = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`
  let text = `${m.count} playing · ${m.bpm} BPM · ${MOOD_WORD[m.mood] ?? m.mood}`
  if (!m.total) text = 'Nothing on the fridge yet'
  else if (soundState !== 'on') text = `Sound off · ${photosWord(m.total)}`
  else if (!m.count) text = `${m.total} muted · nothing playing`

  return (
    <header className="topbar">
      <Wordmark />
      <button
        className={`status${changed ? ' changed' : ''}`}
        onClick={() => setChanged(false)}
        aria-label={changed ? `${text}. The mix just changed.` : text}
      >
        {text}
      </button>
      <div className="sr-only" aria-live="polite">
        {text}
      </div>
    </header>
  )
}

const WORD_COLORS = ['--kick', '--bass', '--percussion', '--chords', '--texture', '--melody', '--kick']

function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label="Thaalam">
      {'thaalam'.split('').map((ch, i) => (
        <span key={i} style={{ color: `var(${WORD_COLORS[i]})` }} aria-hidden="true">
          {ch}
        </span>
      ))}
    </a>
  )
}

function EmptyHint() {
  return (
    <p className="empty-hint">
      Stick a photo on the fridge.
      <span>Each photo plays one part of the loop.</span>
    </p>
  )
}

function usePeers() {
  const [names, setNames] = useState(peerNames)
  const [room, setRoom] = useState(initialRoom)
  useEffect(() => {
    let known = peerNames()
    setNames(known)
    return onPeers(() => {
      const now = peerNames()
      // Announce people once they've joined with a name, not when their page first connects.
      for (const [client, name] of now) {
        if (name !== 'Someone' && (known.get(client) ?? 'Someone') === 'Someone') toast(`${name} joined`, { ms: 3000 })
      }
      known = now
      setNames(now)
    })
  }, [room])
  return { names: Array.from(names.values()), room, setRoom }
}

type Sheet = null | 'add' | 'invite' | 'more' | 'code'

function BottomBar({
  soundState,
  onToggleSound,
  onFiles,
  onSample,
}: {
  soundState: SoundState
  onToggleSound: () => void
  onFiles: (files: File[]) => void
  onSample: (s: Sample) => void
}) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const peers = usePeers()
  const here = peers.names.length + 1
  const close = () => setSheet(null)

  return (
    <>
      <nav className="bottombar" aria-label="Controls">
        <button
          className={`play ${soundState}`}
          onClick={onToggleSound}
          disabled={soundState === 'loading'}
          aria-label={soundState === 'on' ? 'Stop' : soundState === 'loading' ? 'Loading sounds' : 'Play'}
        >
          {soundState === 'on' ? <StopIcon size={24} /> : <PlayIcon size={24} />}
        </button>
        {soundState === 'loading' ? (
          <span className="loading-note">Loading sounds…</span>
        ) : (
          <button className="bar-btn" onClick={() => setSheet('add')}>
            <PlusIcon size={20} />
            Add photo
          </button>
        )}
        <button className="bar-btn invite" onClick={() => setSheet('invite')}>
          <PeopleIcon size={20} />
          {here > 1 ? (
            <>
              Invite <span className="wide-only">· {here} here</span>
              <span className="narrow-only">· {here}</span>
            </>
          ) : (
            'Invite'
          )}
        </button>
        <button className="bar-btn icon" onClick={() => setSheet(sheet === 'more' ? null : 'more')} aria-label="More" aria-expanded={sheet === 'more'}>
          <MoreIcon size={22} />
        </button>
      </nav>
      {sheet === 'more' && <MoreMenu onClose={close} onCode={() => setSheet('code')} />}
      {sheet === 'add' && <AddSheet onClose={close} onFiles={onFiles} onSample={onSample} />}
      {sheet === 'invite' && <InviteSheet onClose={close} peers={peers} />}
      {sheet === 'code' && <CodeSheet onClose={close} />}
    </>
  )
}

// A bottom sheet on phones, a centred panel on wider screens. Esc or the backdrop closes it.
function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button, input')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AddSheet({ onClose, onFiles, onSample }: { onClose: () => void; onFiles: (f: File[]) => void; onSample: (s: Sample) => void }) {
  const [samples, setSamples] = useState<Sample[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    fetch('/samples/samples.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch(() => setSamples([]))
  }, [])
  const scene = (file: string) => file.replace(/\.\w+$/, '')
  return (
    <SheetFrame title="Add a photo" onClose={onClose}>
      <button className="big-btn" data-autofocus onClick={() => fileRef.current?.click()}>
        <PhotoIcon size={22} />
        Choose photos
      </button>
      <p className="hint">Or drop or paste photos anywhere on the fridge.</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
          onClose()
        }}
      />
      <h3>Try a sample</h3>
      {samples === null ? (
        <p className="hint">Loading samples…</p>
      ) : samples.length === 0 ? (
        <p className="hint">Samples aren't available right now.</p>
      ) : (
        <div className="samples">
          {samples.map((s) => (
            <button
              key={s.file}
              className="sample"
              onClick={() => {
                onSample(s)
                onClose()
              }}
              aria-label={`Add the ${scene(s.file)} sample photo`}
            >
              <img src={`/samples/${s.file}`} alt="" />
              <span>{scene(s.file)}</span>
            </button>
          ))}
        </div>
      )}
      <a className="credit" href="/samples/CREDITS.md" target="_blank" rel="noreferrer">
        Sample photos from Unsplash
      </a>
    </SheetFrame>
  )
}

function Qr({ text }: { text: string }) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const cells: string[] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cells.push(`M${c} ${r}h1v1h-1z`)
  return (
    <svg className="qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label="QR code for the room link">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={cells.join('')} fill="currentColor" />
    </svg>
  )
}

function InviteSheet({ onClose, peers }: { onClose: () => void; peers: ReturnType<typeof usePeers> }) {
  const { room, setRoom, names } = peers
  const [copied, setCopied] = useState(false)
  const [isPublic, setIsPublic] = useState<boolean | null>(null)
  const [confirming, setConfirming] = useState(false)
  const linkRef = useRef<HTMLInputElement>(null)

  // Opening the invite turns a solo canvas into a room; whatever is on it carries over.
  useEffect(() => {
    if (!room) setRoom(createRoom())
  }, [room, setRoom])

  useEffect(() => {
    if (!room) return
    fetch(`${API_URL}/api/rooms/${room}`)
      .then((r) => r.json())
      .then((s) => setIsPublic(!!s.published))
      .catch(() => setIsPublic(false))
  }, [room])

  const link = room ? location.href : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      linkRef.current?.select()
      toast("Couldn't copy automatically. The link is selected, so copy it from there.")
    }
  }

  const setListing = async (publish: boolean) => {
    try {
      const r = await fetch(`${API_URL}/api/rooms/${room}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' })
      if (!r.ok) throw new Error(`${r.status}`)
      setIsPublic(publish)
      setConfirming(false)
      toast(publish ? 'Listed in the public gallery.' : 'Removed from the public gallery.')
    } catch {
      toast("Couldn't reach the server, so nothing changed. Try again in a moment.", { tone: 'error' })
    }
  }

  return (
    <SheetFrame title="Invite friends" onClose={onClose}>
      {room && (
        <div className="invite-grid">
          <Qr text={link} />
          <div>
            <p className="hint">Scan this, or send the link. Anyone with it can add, move and mute photos.</p>
            <div className="link-row">
              <input ref={linkRef} readOnly value={link} aria-label="Room link" onFocus={(e) => e.target.select()} />
              <button className="copy" onClick={copy} data-autofocus>
                <CopyIcon size={18} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
      <h3>Here now</h3>
      <ul className="people">
        <li className="me">{getName() || 'You'} (you)</li>
        {names.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      <div className="publish">
        {isPublic === null ? null : isPublic ? (
          <>
            <p>
              <b>This canvas is in the public gallery.</b> Anyone can open it there.
            </p>
            <button className="text-btn" onClick={() => setListing(false)}>
              Remove from gallery
            </button>
          </>
        ) : confirming ? (
          <>
            <p>
              <b>List this canvas in the public gallery?</b> Anyone can open it and see these photos. You can remove it any
              time.
            </p>
            <div className="row">
              <button className="primary-btn" onClick={() => setListing(true)}>
                List it publicly
              </button>
              <button className="text-btn" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button className="text-btn" onClick={() => setConfirming(true)}>
            <GalleryIcon size={18} />
            Share in the public gallery…
          </button>
        )}
      </div>
    </SheetFrame>
  )
}

function MoreMenu({ onClose, onCode }: { onClose: () => void; onCode: () => void }) {
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(currentModel)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    if (DEV)
      fetch(`${API_URL}/api/health`)
        .then((r) => r.json())
        .then((h: { default: string; models: string[] }) => setModels(h.models))
        .catch(() => setModels([]))
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  const pickModel = (m: string) => {
    currentModel = m
    localStorage.setItem('thaalam-model', m)
    setModel(m)
  }
  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="menu" role="menu">
        <button role="menuitem" onClick={onCode} autoFocus>
          <CodeIcon size={20} />
          See the code
        </button>
        <a role="menuitem" href="/gallery">
          <GalleryIcon size={20} />
          Public gallery
        </a>
        {DEV && (
          <label className="model">
            Model
            <select value={model} onChange={(e) => pickModel(e.target.value)}>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m === 'jev' ? 'Jev' : m === 'vegaml' ? 'vegaml (local)' : m}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </>
  )
}

function CodeSheet({ onClose }: { onClose: () => void }) {
  const m = useMix()
  // The pulse hooks are plumbing, not music; hide them so the pattern reads.
  const code = m.code.replace(/\.onTrigger\(hit\('[^']+'\), false\)/g, '')
  return (
    <SheetFrame title="The loop as Strudel code" onClose={onClose}>
      <p className="hint">This is the pattern your fridge is playing. It updates as photos change.</p>
      <pre className="code">{code || '// Nothing is playing yet.'}</pre>
    </SheetFrame>
  )
}

function JoinSheet({ onJoin }: { onJoin: (withSound: boolean) => void }) {
  const [name, setNameInput] = useState(getName)
  const [suggestion] = useState(randomName)
  const inRoom = !!initialRoom
  const join = (withSound: boolean) => {
    setName(name || suggestion)
    onJoin(withSound)
  }
  return (
    <div className="sheet-backdrop join">
      <form
        className="sheet join-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        onSubmit={(e) => {
          e.preventDefault()
          join(true)
        }}
      >
        <Wordmark />
        <h1 id="join-title">{inRoom ? 'Join the jam' : 'Make a loop from photos'}</h1>
        <p className="lede">Stick photos on the fridge. Each one plays a part, and they all play together.</p>
        <label className="name-field">
          Your name
          <input
            value={name}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={suggestion}
            maxLength={24}
            autoComplete="nickname"
            autoFocus
          />
        </label>
        <button className="primary-btn wide" type="submit">
          <PlayIcon size={20} />
          {inRoom ? 'Join the jam' : 'Start jamming'}
        </button>
        <button className="text-btn" type="button" onClick={() => join(false)}>
          Look around without sound
        </button>
        <p className="fine">
          Photos you add are shared with everyone in the room and read by an AI model. No nudity or profanity. Canvases are
          kept, and sharing one in the public gallery lets anyone open it.
        </p>
      </form>
    </div>
  )
}

function ToastView() {
  const t = useToast()
  if (!t) return null
  return (
    <div className={`toast${t.tone === 'error' ? ' error' : ''}`} role={t.tone === 'error' ? 'alert' : 'status'} key={t.id}>
      <span>{t.text}</span>
      {t.action && (
        <button
          onClick={() => {
            t.action!.run()
            dismissToast()
          }}
        >
          {t.action.label}
        </button>
      )}
      <button className="icon-btn" onClick={dismissToast} aria-label="Dismiss">
        <CloseIcon size={16} />
      </button>
    </div>
  )
}

type GalleryRoom = { room: string; at: number; cards: number; previews: string[]; names?: string[]; mood?: string }

// "Ravi", "Ravi & Asha", "Ravi, Asha & Mango Kazoo".
const joinNames = (names: string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`

const PREVIEW_MAGNETS = ['--kick', '--bass', '--percussion', '--chords']
const PREVIEW_TILT = [-5, 4, -2, 6]

function GalleryPage() {
  const [rooms, setRooms] = useState<GalleryRoom[] | null>(null)
  const [failed, setFailed] = useState(false)
  const last = localStorage.getItem('thaalam-last-room')
  useEffect(() => {
    fetch(`${API_URL}/api/gallery`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((g) => setRooms(g.rooms ?? []))
      .catch(() => {
        setFailed(true)
        setRooms([])
      })
  }, [])
  return (
    <div className="gallery-page">
      <header className="gallery-head">
        <Wordmark />
        <a className="back" href={last ? `/?room=${last}` : '/'}>
          <BackIcon size={20} />
          {last ? 'Back to your canvas' : 'Start a canvas'}
        </a>
      </header>
      <h1>Public gallery</h1>
      <p className="lede">Canvases people chose to share. Open one to hear it and add your own photos.</p>
      {rooms === null ? (
        <p className="gallery-empty">Loading the gallery…</p>
      ) : failed ? (
        <p className="gallery-empty">Couldn't load the gallery. Check your connection and refresh.</p>
      ) : rooms.length === 0 ? (
        <p className="gallery-empty">
          Nothing here yet. In a room, open Invite and choose “Share in the public gallery”.
        </p>
      ) : (
        <ul className="gallery-grid">
          {rooms.map((r) => (
            <li key={r.room}>
              <a className="fridge" href={`/?room=${r.room}`}>
                <div className="mini-door">
                  {r.previews.slice(0, 4).map((p, i) => (
                    <span key={p} className="mini-print" style={{ rotate: `${PREVIEW_TILT[i]}deg` }}>
                      <span className="mini-magnet" style={{ background: `var(${PREVIEW_MAGNETS[i]})` }} />
                      <img src={p} alt="" />
                    </span>
                  ))}
                </div>
                <span className="fridge-meta">
                  <b>{r.names?.length ? joinNames(r.names) : 'A shared fridge'}</b>
                  <span>
                    {[MOOD_WORD[r.mood ?? ''] ?? r.mood, `${r.cards} ${r.cards === 1 ? 'photo' : 'photos'}`, new Date(r.at).toLocaleDateString()]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
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
