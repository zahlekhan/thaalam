// What we know about a photo: pixel facts measured in code, plus the model's answers.

export type Role = 'kick' | 'percussion' | 'bass' | 'chords' | 'melody' | 'texture'
export type Mood = 'calm' | 'happy' | 'tense' | 'festive' | 'melancholy'
export type Texture = 'wooden' | 'organic' | 'metallic' | 'electronic' | 'airy'

// The photo's gist: whole-photo qualities the model reads, each a small choice. See CONTEXT.md.
export const GIST = {
  space: ['open', 'room', 'close'],
  gesture: ['rising', 'falling', 'level', 'round', 'scattered'],
  order: ['ordered', 'balanced', 'chaotic'],
  weight: ['heavy', 'medium', 'light'],
  focus: ['one', 'few', 'many'],
  light: ['dawn', 'day', 'golden', 'night', 'artificial'],
  motion: ['still', 'moving'],
  surface: ['smooth', 'rough'],
} as const
export type Gist = { [K in keyof typeof GIST]: (typeof GIST)[K][number] }

export type Answer = { choice: string; prob: number; unsure: boolean }
export type ModelReading = {
  model: string
  answers: Partial<Record<'mood' | 'energy' | 'texture' | 'role' | keyof Gist, Answer>>
}

export type Pixels = {
  brightness: number // 0 dark .. 1 bright
  warmth: number // -1 blue .. 1 amber
  busyness: number // 0 smooth .. 1 detailed
  palette: string[] // main colours, strongest first
  hue: number // 0..11, the strongest hue bucket
  // Added later; cards measured before then don't have these.
  saturation?: number // 0 grey .. 1 vivid
  clash?: number // 0 one hue .. 1 colours from all round the wheel
  sharpness?: number // 0 soft, blurry edges .. 1 hard edges
}

// How the colour field feels, like a Rothko: light colours feel pleasant, vivid ones
// energetic, a clash of hues tense. Both 0..1.
export type ColourFeel = { valence: number; arousal: number }

export type Reading = {
  role: Role
  mood: Mood
  energy: number
  texture: Texture
  gist: Gist
  colour: ColourFeel
  colourMood: Mood // the mood the colours alone suggest
  moodProb: number
  model: string
  guessed: boolean // true when the model was unsure and pixels filled in
  pixels: Pixels
}

// Downscale a photo for upload and display.
export async function shrink(file: Blob, max = 512): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

export async function measurePixels(src: string): Promise<Pixels> {
  const img = new Image()
  img.src = src
  await img.decode()
  const N = 64
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, N, N)
  const d = ctx.getImageData(0, 0, N, N).data

  let lum = 0
  let warm = 0
  let edges = 0
  let satSum = 0
  let hueX = 0, hueY = 0, hueW = 0
  let strong = 0, soft = 0
  const luma = new Float32Array(N * N)
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < N * N; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    luma[i] = l
    lum += l
    warm += (r - b) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const h = hueOf(r, g, b)
    satSum += sat
    // Hue spread only counts colourful pixels; greys have no hue.
    if (sat > 0.25 && max > 40) {
      hueX += Math.cos((h * Math.PI) / 180)
      hueY += Math.sin((h * Math.PI) / 180)
      hueW++
    }
    const k = Math.floor(h / 30) % 12
    const w = sat * (max / 255) + 0.02
    buckets[k].w += w
    buckets[k].r += r * w
    buckets[k].g += g * w
    buckets[k].b += b * w
  }
  for (let y = 0; y < N - 1; y++)
    for (let x = 0; x < N - 1; x++) {
      const i = y * N + x
      const dx = Math.abs(luma[i] - luma[i + 1]), dy = Math.abs(luma[i] - luma[i + N])
      edges += dx + dy
      for (const e of [dx, dy]) {
        if (e > 0.12) strong++
        else if (e > 0.02) soft++
      }
    }

  const ranked = buckets.map((b, i) => ({ ...b, i })).sort((a, b) => b.w - a.w)
  const palette = ranked.slice(0, 3).filter((b) => b.w > 0).map((b) => {
    const hex = (v: number) => Math.round(v / b.w).toString(16).padStart(2, '0')
    return `#${hex(b.r)}${hex(b.g)}${hex(b.b)}`
  })
  return {
    brightness: lum / (N * N),
    warmth: Math.max(-1, Math.min(1, (warm / (N * N)) * 3)),
    busyness: Math.min(1, (edges / ((N - 1) * (N - 1))) * 4),
    palette,
    hue: ranked[0].i,
    saturation: satSum / (N * N),
    clash: hueW ? 1 - Math.hypot(hueX, hueY) / hueW : 0,
    sharpness: strong + soft ? strong / (strong + soft) : 0.5,
  }
}

function hueOf(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}

// Combine the model's answers with pixel facts. Where the model is unsure, pixels decide.
// Model answers are only trusted when they're in the question's own vocabulary —
// an off-menu choice would crash the lookup tables in music.ts.
const MOODS = new Set<Mood>(['calm', 'happy', 'tense', 'festive', 'melancholy'])
const TEXTURES = new Set<Texture>(['wooden', 'organic', 'metallic', 'electronic', 'airy'])
const ROLES = new Set<Role>(['kick', 'percussion', 'bass', 'chords', 'melody', 'texture'])
const ENERGIES = new Set(['1', '2', '3', '4', '5'])

export function combine(m: ModelReading | null, pixels: Pixels): Reading {
  const p = { saturation: 0.3, clash: 0, sharpness: 0.5, ...pixels }
  const a = m?.answers
  const use = <T extends string>(k: keyof ModelReading['answers'], ok: Set<string> | readonly string[]) => {
    const x = a?.[k]
    const allowed = ok instanceof Set ? ok.has(x?.choice ?? '') : ok.includes(x?.choice ?? '')
    return (x && !x.unsure && allowed ? x.choice : null) as T | null
  }

  const colour = colourFeel(p)
  // Vivid colour pushes energy up a step, grey colour pulls it down.
  const nudge = colour.arousal > 0.75 ? 1 : colour.arousal < 0.2 ? -1 : 0
  const energy = Number(use('energy', ENERGIES) ?? Math.round(1 + p.busyness * 4)) + nudge
  const mood = use<Mood>('mood', MOODS) ?? moodOf(colour)
  const texture = use<Texture>('texture', TEXTURES) ?? (p.warmth > 0.1 ? 'wooden' : p.brightness > 0.6 ? 'airy' : 'electronic')
  const byHue: Role[] = ['chords', 'melody', 'kick', 'texture']
  const role =
    use<Role>('role', ROLES) ?? (p.brightness < 0.3 ? 'bass' : p.busyness > 0.55 ? 'percussion' : byHue[p.hue % 4])

  // Where the model gives no gist answer, pixels give a plain guess.
  const gist: Gist = {
    space: use('space', GIST.space) ?? 'room',
    gesture: use('gesture', GIST.gesture) ?? 'level',
    order: use('order', GIST.order) ?? (p.busyness > 0.55 ? 'chaotic' : 'balanced'),
    weight: use('weight', GIST.weight) ?? (p.brightness < 0.3 ? 'heavy' : p.brightness > 0.7 ? 'light' : 'medium'),
    focus: use('focus', GIST.focus) ?? (p.busyness > 0.6 ? 'many' : 'one'),
    light: use('light', GIST.light) ?? (p.brightness < 0.25 ? 'night' : p.warmth > 0.3 ? 'golden' : 'day'),
    motion: use('motion', GIST.motion) ?? 'still',
    surface: use('surface', GIST.surface) ?? (p.busyness > 0.5 && p.sharpness > 0.5 ? 'rough' : 'smooth'),
  }

  return {
    role,
    mood,
    energy: Number.isFinite(energy) ? Math.max(1, Math.min(5, energy)) : 3,
    texture,
    gist,
    colour,
    colourMood: moodOf(colour),
    moodProb: a?.mood?.prob ?? 0,
    model: m?.model ?? 'pixels',
    guessed: !a || (['mood', 'energy', 'texture', 'role'] as const).some((k) => a[k]?.unsure),
    pixels: p,
  }
}

const clamp = (v: number) => Math.max(0, Math.min(1, v))

// Light colours read pleasant, warm ones a little more so, clashing ones less.
// Vivid colours read energetic. Typical photos have saturation 0.1 to 0.6.
function colourFeel(p: Required<Pixels>): ColourFeel {
  return {
    valence: clamp(0.65 * p.brightness + 0.2 * ((p.warmth + 1) / 2) + 0.15 * (1 - p.clash)),
    arousal: clamp(p.saturation / 0.6 + (p.clash > 0.6 ? 0.15 : 0)),
  }
}

function moodOf({ valence, arousal }: ColourFeel): Mood {
  if (valence >= 0.5) return arousal >= 0.7 ? 'festive' : arousal >= 0.45 ? 'happy' : 'calm'
  return arousal >= 0.5 ? 'tense' : 'melancholy'
}

export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

// The server refused the photo itself (nudity/profanity), not just the reading.
export class PhotoRejected extends Error {}

export async function askModel(src: string, model: string): Promise<ModelReading> {
  const blob = await (await fetch(src)).blob()
  const form = new FormData()
  form.append('photo', blob, 'photo.jpg')
  const r = await fetch(`${API_URL}/api/analyze?model=${encodeURIComponent(model)}`, { method: 'POST', body: form })
  if (!r.ok) {
    let detail = `analyze failed: ${r.status}`
    try {
      detail = (await r.json()).detail ?? detail
    } catch {}
    if (r.status === 422) throw new PhotoRejected(detail)
    throw new Error(detail)
  }
  return r.json()
}

// Store a cleared photo in R2 and get back its permanent URL. Falls back to
// the inline data URL when upload isn't available (local dev without R2).
export async function uploadPhoto(src: string): Promise<string> {
  try {
    const blob = await (await fetch(src)).blob()
    const form = new FormData()
    form.append('photo', blob, 'photo.jpg')
    const r = await fetch(`${API_URL}/api/photos`, { method: 'POST', body: form })
    if (r.ok) return (await r.json()).url
  } catch (e) {
    console.warn(e)
  }
  return src
}
