import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Tldraw, createShapeId, useEditor, type Editor, type TLShapeId } from 'tldraw'
import { CardUtil, readingOf, type CardShape } from './CardShape'
import { API_URL, askModel, measurePixels, shrink, type ModelReading } from './reading'
import { mixFor } from './music'
import { play, startSound } from './sound'

const STAGE = createShapeId('stage')
const STAGE_W = 1120
const STAGE_H = 640

type Sample = {
  file: string
  credit: { name: string; profile: string; photo: string }
  readings: Record<string, ModelReading>
}

// Which model reads photos. Jev by default; developers can switch with ?dev in the URL.
const DEV = new URLSearchParams(location.search).has('dev')
let currentModel = localStorage.getItem('thaalam-model') ?? 'jev'

// Tiny store so the overlay can show what's playing.
let mix = { code: '', bpm: 0, scale: '', count: 0 }
const listeners = new Set<() => void>()
const setMix = (m: typeof mix) => {
  mix = m
  listeners.forEach((l) => l())
}
const useMix = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => mix)

let started = false

function ensureStage(editor: Editor) {
  if (editor.getShape(STAGE)) return
  editor.createShape({ id: STAGE, type: 'frame', x: 0, y: 0, props: { w: STAGE_W, h: STAGE_H, name: 'Stage' } })
}

// Next free slot on the stage, in page coordinates.
function freeSpot(editor: Editor) {
  const n = editor.getSortedChildIdsForParent(STAGE).length
  const col = n % 5
  const row = Math.floor(n / 5) % 2
  return { x: 40 + col * 212, y: 60 + row * 280 }
}

async function addCard(editor: Editor, src: string, model: ModelReading | null, at?: { x: number; y: number }) {
  const id = createShapeId()
  const spot = at ?? freeSpot(editor)
  editor.createShape({ id, type: 'card', x: spot.x, y: spot.y, parentId: at ? undefined : STAGE, props: { src } })
  if (at) {
    const stage = editor.getShapePageBounds(STAGE)
    if (stage?.containsPoint(at)) editor.reparentShapes([id], STAGE)
  }
  const pixels = await measurePixels(src)
  const update = (props: Partial<CardShape['props']>) =>
    editor.getShape(id) && editor.updateShape({ id, type: 'card', props })
  update({ pixels: JSON.stringify(pixels) })
  try {
    const m = model ?? (await askModel(src, currentModel))
    update({ model: JSON.stringify(m), status: 'ready' })
  } catch (e) {
    console.warn(e)
    update({ status: 'ready' }) // pixels alone still make a part
  }
}

function stageCards(editor: Editor) {
  return editor
    .getSortedChildIdsForParent(STAGE)
    .map((id) => editor.getShape(id as TLShapeId))
    .filter((s): s is CardShape => s?.type === 'card' && s.props.status === 'ready')
    .flatMap((s) => {
      const reading = readingOf(s)
      return reading ? [{ id: s.id, reading }] : []
    })
}

function onMount(editor: Editor) {
  ensureStage(editor)
  ;(window as any).editor = editor
  const fitStage = () => {
    const b = editor.getShapePageBounds(STAGE)
    if (b) editor.zoomToBounds(b.clone().expandBy(40), { animation: { duration: 0 }, targetZoom: 1 })
  }
  requestAnimationFrame(fitStage)

  editor.registerExternalContentHandler('files', async (info) => {
    const point = (info as { point?: { x: number; y: number } }).point ?? editor.getViewportPageBounds().center
    for (const [i, file] of info.files.filter((f) => f.type.startsWith('image/')).entries()) {
      const src = await shrink(file)
      addCard(editor, src, null, { x: point.x - 90 + i * 30, y: point.y - 118 + i * 30 })
    }
  })

  let timer = 0
  const refresh = () => {
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      const cards = stageCards(editor)
      const m = mixFor(cards)
      setMix({ code: m.code, bpm: m.bpm, scale: m.scale, count: cards.length })
      if (started) play(m.code)
    }, 120)
  }
  editor.store.listen(refresh, { scope: 'document' })
  refresh()
}

function Overlay() {
  const editor = useEditor()
  const m = useMix()
  const [on, setOn] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(currentModel)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/samples/samples.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch(() => setSamples([]))
    fetch(`${API_URL}/api/health`)
      .then((r) => r.json())
      .then((h: { default: string; models: string[] }) => {
        setModels(h.models)
        // Fall back to the server's default if the saved choice isn't available here.
        if (!h.models.includes(currentModel)) pickModel(h.default)
      })
      .catch(() => setModels([]))
  }, [])

  const pickModel = (m: string) => {
    currentModel = m
    localStorage.setItem('thaalam-model', m)
    setModel(m)
  }

  const start = async () => {
    await startSound()
    started = true
    setOn(true)
    play(mix.code)
  }

  return (
    <div className="overlay">
      <div className="topbar">
        <span className="brand">Thaalam</span>
        {on ? (
          <span className="status">
            {m.count ? `${m.count} playing · ${m.bpm} BPM · ${m.scale}` : 'Drop a photo on the stage'}
          </span>
        ) : (
          <button className="primary" onClick={start}>Tap to start sound</button>
        )}
        <button onClick={() => fileRef.current?.click()}>Add photo</button>
        <button onClick={() => setShowCode((v) => !v)}>{showCode ? 'Hide code' : 'Code'}</button>
        {DEV && (
          <select className="model" value={model} onChange={(e) => pickModel(e.target.value)} title="Model that reads photos">
            {models.map((m) => (
              <option key={m} value={m}>
                {m === 'jev' ? 'Jev' : m === 'vegaml' ? 'vegaml (local)' : m}
              </option>
            ))}
          </select>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (e) => {
            for (const f of Array.from(e.target.files ?? [])) addCard(editor, await shrink(f), null)
            e.target.value = ''
          }}
        />
      </div>

      {showCode && <pre className="code">{m.code || '// nothing on the stage yet'}</pre>}

      {samples.length > 0 && (
        <div className="tray">
          <span>Try one</span>
          {samples.map((s) => (
            <button
              key={s.file}
              className="sample"
              title={`Photo by ${s.credit.name} on Unsplash`}
              onClick={async () =>
                addCard(editor, await toDataUrl(`/samples/${s.file}`), s.readings[currentModel] ?? null)
              }
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

export default function App() {
  return (
    <div className="app">
      <Tldraw shapeUtils={[CardUtil]} onMount={onMount} components={{ InFrontOfTheCanvas: Overlay, StylePanel: null }} />
    </div>
  )
}
