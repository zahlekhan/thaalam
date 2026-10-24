// Readings in, Strudel code out. The model never writes music: it picks readings,
// and these menus decide what can be played.

import type { Mood, Reading, Role, Texture } from './reading'

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
const ROOTS = '<0 5 3 4>'
const TRIADS = '<[0,2,4] [5,7,9] [3,5,7] [4,6,8]>'

// Rhythm menus: [energy 1..5][straight, syncopated], 16 steps per bar.
const R = (s: string) => s.replace(/\s+/g, ' ').trim()
// Hold each note until the next one ("x ~ ~ x" becomes "x _ _ x"), so sparse bass and chords
// ring instead of blipping for one step.
const hold = (s: string) => R(s).replace(/x( ~)+/g, (m) => m.replace(/~/g, '_'))
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

// Melody menus: [mood][quiet, lively], scale degrees on 16 steps.
const MELODY: Record<Mood, [string, string]> = {
  calm: ['0 ~ ~ ~ 2 ~ ~ ~ 4 ~ ~ ~ 2 ~ ~ ~', '0 ~ 2 ~ 4 ~ 2 ~ 4 ~ 5 ~ 4 ~ 2 ~'],
  happy: ['4 ~ ~ ~ 5 ~ 4 ~ 2 ~ ~ ~ 0 ~ ~ ~', '0 2 4 ~ 5 4 2 ~ 4 ~ 7 ~ 5 4 2 ~'],
  tense: ['0 ~ ~ 1 ~ ~ 0 ~ ~ ~ -1 ~ 0 ~ ~ ~', '0 1 0 ~ 3 ~ 1 0 ~ 1 3 ~ 4 3 1 ~'],
  festive: ['0 ~ 4 ~ ~ ~ 5 ~ 4 ~ ~ ~ 2 ~ ~ ~', '0 4 7 4 5 ~ 4 2 0 4 7 ~ 9 7 4 ~'],
  melancholy: ['7 ~ ~ ~ 5 ~ ~ ~ 4 ~ ~ ~ 2 ~ 1 ~', '7 ~ 5 4 ~ 2 4 ~ 2 1 ~ 0 ~ ~ ~ ~'],
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

// The photo's main colour picks its tune: it starts the melody on a different beat
// (4 choices) and a different note (3 choices), so a red and a green photo with the
// same reading play different tunes.
function tuneFor(r: Reading, steps: string) {
  const notes = R(steps).split(' ')
  const start = (r.pixels.hue % 4) * 4
  const shift = [0, 2, 4][Math.floor(r.pixels.hue / 4) % 3]
  return { steps: [...notes.slice(start), ...notes.slice(0, start)].join(' '), shift }
}

export function partFor(r: Reading, scale: string): string {
  const { name: inst, hits = [0] } = instrumentFor(r)
  const hit = hits[r.pixels.hue % hits.length]
  const e = r.energy - 1
  const synco = r.pixels.busyness > 0.45 ? 1 : 0
  const tune = tuneFor(r, MELODY[r.mood][e >= 2 ? 1 : 0])
  const b = r.pixels.brightness
  const lpf = Math.round(500 + b * 5000)
  const shift = b > 0.7 ? 1 : b < 0.25 ? -1 : 0
  const at = (role: Role) => `${KEY}${OCTAVE[role] + shift}:${scale}`

  switch (r.role) {
    case 'kick':
      return `s("${inst}").n(${hit}).struct("${R(RHYTHM.kick[e][synco])}").gain(1)`
    case 'percussion':
      // Loud on the beat, softer between, so fast patterns don't sound like a machine gun.
      return `s("${inst}").n(${hit}).struct("${R(RHYTHM.percussion[e][synco])}").velocity("[1 .6 .8 .6]*4").gain(0.7)`
    case 'bass':
      return `n("${ROOTS}").struct("${hold(RHYTHM.bass[e][synco])}").scale("${at('bass')}").s("${inst}").lpf(${Math.min(lpf, 1800)}).gain(0.9)`
    // Drums and bass stay dry; the rest shares one reverb.
    case 'chords':
      return `n("${TRIADS}").struct("${hold(RHYTHM.chords[e][synco])}").scale("${at('chords')}").s("${inst}").lpf(${lpf}).decay(0.3).sustain(0.4).room(0.3).gain(0.55)`
    case 'melody':
      return `n("${tune.steps}".add(${tune.shift})).scale("${at('melody')}").s("${inst}").lpf(${lpf}).room(0.3).gain(0.75)`
    case 'texture':
      return `n("${TRIADS}").struct("${e >= 3 ? 'x ~ x ~' : 'x'}").scale("${at('texture')}").s("${inst}").attack(0.6).release(2).lpf(${lpf}).room(0.3).gain(0.45)`
  }
}

export function mixFor(cards: PlayingCard[]) {
  if (cards.length === 0) return { code: '', bpm: 0, scale: '' }

  const avg = cards.reduce((s, c) => s + c.reading.energy, 0) / cards.length
  const bpm = Math.round(80 + ((avg - 1) / 4) * 48)

  const votes: Partial<Record<Mood, number>> = {}
  for (const c of cards) votes[c.reading.mood] = (votes[c.reading.mood] ?? 0) + (c.reading.moodProb || 0.5)
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
