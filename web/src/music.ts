// Readings in, Strudel code out. The model never writes music: it picks readings,
// and these menus decide what can be played.

import type { Mood, Reading, Role } from './reading'

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

// Two instruments per role. Warm textures get the first, cool ones the second.
export const INSTRUMENT: Record<Role, [string, string]> = {
  kick: ['808bd', 'clubkick'],
  percussion: ['tabla', 'hh'],
  bass: ['gm_acoustic_bass', 'sawtooth'],
  chords: ['gm_epiano1', 'square'],
  melody: ['gm_marimba', 'gm_vibraphone'],
  texture: ['gm_pad_warm', 'gm_pad_halo'],
}

const NICE_NAME: Record<string, string> = {
  '808bd': 'Round kick',
  clubkick: 'Club kick',
  tabla: 'Tabla',
  hh: 'Hi-hats',
  gm_acoustic_bass: 'Upright bass',
  sawtooth: 'Synth bass',
  gm_epiano1: 'Soft keys',
  square: 'Synth stabs',
  gm_marimba: 'Marimba',
  gm_vibraphone: 'Vibraphone',
  gm_pad_warm: 'Warm pad',
  gm_pad_halo: 'Halo pad',
}

const OCTAVE: Record<Role, number> = { kick: 0, percussion: 0, bass: 2, chords: 3, melody: 4, texture: 3 }

export function instrumentFor(r: Reading) {
  const warm = r.texture === 'wooden' || r.texture === 'organic'
  const name = INSTRUMENT[r.role][warm ? 0 : 1]
  return { name, label: NICE_NAME[name] ?? name }
}

// Palette breaks ties: two photos with the same reading still differ by colour.
const variantOf = (r: Reading) => r.pixels.hue % 2

export function partFor(r: Reading, scale: string): string {
  const inst = instrumentFor(r).name
  const e = r.energy - 1
  const synco = r.pixels.busyness > 0.45 ? 1 : 0
  const v = variantOf(r)
  const b = r.pixels.brightness
  const lpf = Math.round(500 + b * 5000)
  const shift = b > 0.7 ? 1 : b < 0.25 ? -1 : 0
  const at = (role: Role) => `${KEY}${OCTAVE[role] + shift}:${scale}`

  switch (r.role) {
    case 'kick':
      return `s("${inst}").n(${v}).struct("${R(RHYTHM.kick[e][synco])}").gain(1)`
    case 'percussion':
      return `s("${inst}").n(${v + (r.pixels.hue % 4)}).struct("${R(RHYTHM.percussion[e][synco])}").gain(0.7)`
    case 'bass':
      return `n("${ROOTS}").struct("${R(RHYTHM.bass[e][synco])}").scale("${at('bass')}").s("${inst}").lpf(${Math.min(lpf, 1800)}).gain(0.9)`
    case 'chords':
      return `n("${TRIADS}").struct("${R(RHYTHM.chords[e][synco])}").scale("${at('chords')}").s("${inst}").lpf(${lpf}).decay(0.3).sustain(0.4).gain(0.55)`
    case 'melody':
      return `n("${R(MELODY[r.mood][e >= 2 ? 1 : 0])}".add(${v * 2})).scale("${at('melody')}").s("${inst}").lpf(${lpf}).gain(0.75)`
    case 'texture':
      return `n("${TRIADS}").struct("${e >= 3 ? 'x ~ x ~' : 'x'}").scale("${at('texture')}").s("${inst}").attack(0.6).release(2).lpf(${lpf}).gain(0.45)`
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
