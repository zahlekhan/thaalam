// Readings in, Strudel code out. The model never writes music: it reads the photo's gist
// and mood, and these menus decide what can be played. See "Photo to sound" in CONTEXT.md.

import type { Gist, Mood, Reading, Role, Texture } from './reading'

export type PlayingCard = { id: string; reading: Reading }

const KEY = 'A'
const SCALE: Record<Mood, string> = {
  calm: 'major:pentatonic',
  happy: 'major',
  tense: 'phrygian',
  festive: 'mixolydian',
  melancholy: 'minor',
}

// Chord roots per bar, as scale degrees. Shared by bass, chords and pads.
const ROOT_LIST = [0, 5, 3, 4]
const ROOTS = `<${ROOT_LIST.join(' ')}>`

// Chord colour from the photo's light, as scale degrees above each root.
const VOICING: Record<Gist['light'], number[]> = {
  dawn: [0, 1, 4], // suspended, waiting to resolve
  day: [0, 2, 4], // plain triad
  golden: [0, 2, 4, 6], // warm seventh
  night: [0, 2, 4, 8], // added ninth, played lower
  artificial: [0, 4, 7], // hollow fifths
}

// Rhythm menus: [energy 1..5][straight, syncopated], 16 steps per bar.
const R = (s: string) => s.replace(/\s+/g, ' ').trim()
// Hold each note until the next one ("x ~ ~ 4 ~" becomes "x _ _ 4 _"), for still photos.
const hold = (s: string) => {
  let on = false
  return R(s)
    .split(' ')
    .map((t) => (t !== '~' ? ((on = true), t) : on ? '_' : t))
    .join(' ')
}
const RHYTHM: Record<'kick' | 'percussion' | 'bass' | 'chords', string[][]> = {
  kick: [
    ['x ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~'],
    ['x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ ~ x ~ ~ x ~ ~ ~ ~ ~'],
    ['x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~', 'x ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~'],
    ['x ~ ~ ~ x ~ ~ x x ~ ~ ~ x ~ ~ ~', 'x ~ ~ x ~ ~ x ~ x ~ ~ x ~ ~ x ~'],
    ['x ~ x ~ x ~ ~ x x ~ x ~ x ~ ~ x', 'x ~ ~ x x ~ x ~ ~ x x ~ x ~ x x'],
  ],
  percussion: [
    ['~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~', '~ ~ x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~'],
    ['~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~', '~ x ~ ~ ~ x ~ x ~ ~ ~ x ~ ~ x ~'],
    ['x ~ x ~ x ~ x ~ x ~ x ~ x ~ x ~', '~ x x ~ ~ x ~ x ~ x x ~ ~ x ~ x'],
    ['x x ~ x x ~ x x x x ~ x x ~ x x', '~ x x x ~ x x ~ x ~ x x ~ x x x'],
    ['x x x x x x x x x x x x x x x x', 'x x x ~ x x x ~ x x ~ x x x ~ x'],
  ],
  bass: [
    ['x ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ x ~'],
    ['x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ x ~ ~ ~'],
    ['x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~', 'x ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ x ~ ~'],
    ['x ~ x ~ x ~ x ~ x ~ x ~ x ~ x ~', 'x ~ ~ x ~ x ~ ~ x ~ ~ x ~ x ~ x'],
    ['x x ~ x x ~ x x x x ~ x x ~ x x', 'x ~ x x ~ x x ~ x ~ x x ~ x ~ x'],
  ],
  chords: [
    ['x ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~', '~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~'],
    ['x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~', '~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~'],
    ['x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~', '~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~'],
    ['x ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ x ~ ~', '~ x ~ x ~ x ~ x ~ x ~ x ~ x ~ x'],
    ['x ~ x x ~ x ~ x x ~ x x ~ x ~ x', '~ x x ~ x ~ x x ~ x x ~ x ~ x x'],
  ],
}

// Melody shape from the photo's gesture: scale degrees traced across one bar.
const CONTOUR: Record<Gist['gesture'], number[]> = {
  rising: [0, 1, 2, 3, 4, 5, 6, 7],
  falling: [7, 6, 5, 4, 3, 2, 1, 0],
  level: [2, 2, 3, 2, 2, 1, 2, 2],
  round: [0, 2, 4, 6, 7, 6, 4, 2],
  scattered: [0, 5, 2, 7, 1, 6, 3, 4],
}

// Open photos leap, close-ups move in small steps.
const SPREAD: Record<Gist['space'], number> = { open: 1.5, room: 1, close: 0.6 }
// Open photos echo, close-ups stay dry.
const ROOM: Record<Gist['space'], number> = { open: 0.55, room: 0.3, close: 0.1 }

// Melody rhythms: [energy 1..5][ordered, balanced, chaotic], 16 steps per bar.
const MELODY_RHYTHM = [
  ['x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~ ~ ~', '~ ~ x ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~'],
  ['x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~', 'x ~ ~ ~ x ~ ~ x ~ ~ ~ ~ x ~ ~ ~', 'x ~ ~ x ~ ~ ~ ~ ~ x ~ x ~ ~ ~ ~'],
  ['x ~ x ~ x ~ x ~ x ~ x ~ x ~ x ~', 'x ~ x ~ ~ x ~ x x ~ x ~ ~ x ~ ~', 'x ~ ~ x ~ x ~ ~ x x ~ ~ ~ x ~ x'],
  ['x x ~ x x x ~ x x x ~ x x x ~ x', 'x ~ x x ~ x ~ x x ~ x x ~ x x ~', 'x x ~ x ~ x x ~ ~ x x ~ x ~ x x'],
  ['x x x x x x x x x x x x x x x x', 'x x ~ x x x ~ x x x ~ x x ~ x x', 'x ~ x x x ~ x x ~ x x x ~ x x x'],
]
const ORDER: Gist['order'][] = ['ordered', 'balanced', 'chaotic']

// The melody traces the gesture's whole shape across the bar, however many notes it has.
function melodySteps(r: Reading, e: number) {
  const slots = R(MELODY_RHYTHM[e][ORDER.indexOf(r.gist.order)]).split(' ')
  const count = slots.filter((s) => s === 'x').length
  const contour = CONTOUR[r.gist.gesture].map((n) => Math.round(n * SPREAD[r.gist.space]))
  let k = 0
  const steps = slots.map((s) => (s === 'x' ? contour[count > 1 ? Math.round((k++ * 7) / (count - 1)) : 0] : s))
  return steps.join(' ')
}

function chordsFor(r: Reading) {
  const voicing = new Set(VOICING[r.gist.light])
  if ((r.pixels.clash ?? 0) > 0.6) voicing.add(1) // clashing colours add a rub
  const notes = [...voicing].sort((a, b) => a - b)
  return `<${ROOT_LIST.map((root) => `[${notes.map((n) => n + root).join(',')}]`).join(' ')}>`
}

// One instrument per role and photo texture. Drum banks also hold crashes and odd hits, so
// `hits` lists the sample numbers that suit a steady beat.
type Sound = { name: string; label: string; hits?: number[] }

export const INSTRUMENT: Record<Role, Record<Texture, Sound>> = {
  kick: {
    wooden: { name: 'jazz', label: 'Kit kick', hits: [0] },
    organic: { name: '808bd', label: 'Round kick', hits: [0, 1] },
    metallic: { name: 'bd', label: 'Punchy kick', hits: [0, 1] },
    electronic: { name: 'clubkick', label: 'Club kick', hits: [0, 1] },
    airy: { name: 'kicklinn', label: 'Retro kick', hits: [0] },
  },
  percussion: {
    wooden: { name: 'east', label: 'Wood block', hits: [0] },
    organic: { name: 'tabla', label: 'Tabla', hits: [0, 1, 2, 3, 4] },
    metallic: { name: 'linnhats', label: 'Hi-hats', hits: [0, 1] }, // 'hh' was 15 dB quieter than the rest
    electronic: { name: '808', label: 'Drum machine', hits: [1, 4] }, // closed hat, maracas
    airy: { name: 'gretsch', label: 'Brushes', hits: [2, 3] },
  },
  bass: {
    wooden: { name: 'gm_acoustic_bass', label: 'Upright bass' },
    organic: { name: 'gm_fretless_bass', label: 'Fretless bass' },
    metallic: { name: 'gm_electric_bass_pick', label: 'Picked bass' },
    electronic: { name: 'sawtooth', label: 'Synth bass' },
    airy: { name: 'triangle', label: 'Soft synth bass' },
  },
  chords: {
    wooden: { name: 'gm_acoustic_guitar_nylon', label: 'Nylon guitar' },
    organic: { name: 'gm_epiano1', label: 'Soft keys' },
    metallic: { name: 'gm_steel_drums', label: 'Steel drums' },
    electronic: { name: 'square', label: 'Synth stabs' },
    airy: { name: 'gm_reed_organ', label: 'Reed organ' },
  },
  melody: {
    wooden: { name: 'gm_marimba', label: 'Marimba' },
    organic: { name: 'gm_sitar', label: 'Sitar' },
    metallic: { name: 'gm_vibraphone', label: 'Vibraphone' },
    electronic: { name: 'triangle', label: 'Synth beeps' },
    airy: { name: 'gm_flute', label: 'Flute' },
  },
  texture: {
    wooden: { name: 'gm_pad_bowed', label: 'Bowed pad' },
    organic: { name: 'gm_pad_warm', label: 'Warm pad' },
    metallic: { name: 'gm_pad_metallic', label: 'Metal pad' },
    electronic: { name: 'gm_pad_poly', label: 'Synth pad' },
    airy: { name: 'gm_pad_halo', label: 'Halo pad' },
  },
}

const OCTAVE: Record<Role, number> = { kick: 0, percussion: 0, bass: 2, chords: 3, melody: 4, texture: 3 }

export function instrumentFor(r: Reading): Sound {
  return INSTRUMENT[r.role][r.texture]
}

export function partFor(r: Reading, scale: string): string {
  const { name: inst, hits = [0] } = instrumentFor(r)
  const g = r.gist
  const hit = hits[r.pixels.hue % hits.length]
  const e = r.energy - 1
  // Ordered photos play straight, chaotic ones syncopated.
  const synco = g.order === 'ordered' ? 0 : g.order === 'chaotic' ? 1 : r.pixels.busyness > 0.45 ? 1 : 0
  const b = r.pixels.brightness
  const lpf = Math.round(500 + b * 5000)
  // Bright, light photos play higher; dark, heavy, night photos lower.
  const lift = (b > 0.7 ? 1 : b < 0.25 ? -1 : 0) + (g.weight === 'light' ? 1 : g.weight === 'heavy' ? -1 : 0) + (g.light === 'night' ? -1 : 0)
  const shift = Math.max(-1, Math.min(1, lift))
  const at = (role: Role) => `${KEY}${OCTAVE[role] + shift}:${scale}`
  const still = g.motion === 'still'
  const notes = (s: string) => (still ? hold(s) : R(s))
  const room = ROOM[g.space]
  // Rough surfaces sound gritty; soft-edged photos swell in.
  const grit = g.surface === 'rough' ? '.crush(8)' : ''
  const swell = (r.pixels.sharpness ?? 0.5) < 0.3 ? '.attack(0.06)' : ''
  // Many subjects play in harmony; a few, every other bar.
  const voices = g.focus === 'many' ? '.add("[0,2]")' : g.focus === 'few' ? '.add("<0 [0,2]>")' : ''

  switch (r.role) {
    case 'kick':
      return `s("${inst}").n(${hit}).struct("${R(RHYTHM.kick[e][synco])}")${grit}.gain(1)`
    case 'percussion':
      // Loud on the beat, softer between, so fast patterns don't sound like a machine gun.
      return `s("${inst}").n(${hit}).struct("${R(RHYTHM.percussion[e][synco])}").velocity("[1 .6 .8 .6]*4")${grit}.room(${room / 2}).gain(0.7)`
    case 'bass':
      return `n("${ROOTS}").struct("${notes(RHYTHM.bass[e][synco])}").scale("${at('bass')}").s("${inst}").lpf(${Math.min(lpf, 1800)})${grit}.gain(0.9)`
    case 'chords':
      return `n("${chordsFor(r)}").struct("${notes(RHYTHM.chords[e][synco])}").scale("${at('chords')}").s("${inst}").lpf(${lpf}).decay(0.3).sustain(0.4)${swell}${grit}.room(${room}).gain(0.5)`
    case 'melody': {
      // .add sits on the pattern, after n() closes. A harmony inside the quotes is not valid Strudel.
      const clip = still ? '' : '.clip(0.6)'
      return `n("${notes(melodySteps(r, e))}")${voices}${clip}.scale("${at('melody')}").s("${inst}").lpf(${lpf})${swell}${grit}.room(${room}).gain(${g.focus === 'one' ? 0.75 : 0.6})`
    }
    case 'texture':
      return `n("${chordsFor(r)}").struct("${e >= 3 || !still ? 'x ~ x ~' : 'x'}").scale("${at('texture')}").s("${inst}").attack(0.6).release(2).lpf(${lpf})${grit}.room(${Math.max(room, 0.3)}).gain(0.4)`
  }
}

const COLOUR_VOTE = 0.6

export function mixFor(cards: PlayingCard[]) {
  if (cards.length === 0) return { code: '', bpm: 0, scale: '' }

  const avg = cards.reduce((s, c) => s + c.reading.energy, 0) / cards.length
  const bpm = Math.round(80 + ((avg - 1) / 4) * 48)

  const votes: Partial<Record<Mood, number>> = {}
  // The model's mood and the colours' mood both vote, like a Rothko: colour alone moves the feeling.
  for (const c of cards) {
    votes[c.reading.mood] = (votes[c.reading.mood] ?? 0) + (c.reading.moodProb || 0.5)
    votes[c.reading.colourMood] = (votes[c.reading.colourMood] ?? 0) + COLOUR_VOTE
  }
  const mood = (Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] ?? 'calm') as Mood
  const scale = SCALE[mood]

  // Cards with the same role take turns, 2 bars each.
  const byRole = new Map<Role, PlayingCard[]>()
  for (const c of cards) byRole.set(c.reading.role, [...(byRole.get(c.reading.role) ?? []), c])

  const parts = cards.map((c) => {
    const group = byRole.get(c.reading.role)!
    let code = partFor(c.reading, scale)
    if (group.length > 1) {
      const i = group.indexOf(c)
      const slots = group.flatMap((_, j) => (j === i ? ['1', '1'] : ['0', '0']))
      code += `.mask("<${slots.join(' ')}>")`
    }
    // Single quotes: in Strudel code, double-quoted strings become patterns.
    return `  ${code}.onTrigger(hit('${c.id}'), false)`
  })
  const code = `stack(\n${parts.join(',\n')}\n).cpm(${bpm / 4})`
  return { code, bpm, scale: `${KEY} ${scale.replace(':', ' ')}`, mood }
}
