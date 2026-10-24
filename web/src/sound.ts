// Strudel setup plus the hook that plucks each card on its own notes.

import { initStrudel, samples, evaluate, hush } from '@strudel/web'
import { registerSoundfonts } from '@strudel/soundfonts'
import { pluck } from './swing'

let ready: Promise<unknown> | null = null

export function startSound() {
  ready ??= initStrudel({
    prebake: () => Promise.all([samples('github:tidalcycles/dirt-samples'), registerSoundfonts()]),
  })
  return ready
}

// Strudel calls this a little before each note. Wait until the note actually sounds, then pluck the card.
;(window as any).hit = (id: string) => (_hap: unknown, now: number, _cps: number, target: number) => {
  setTimeout(() => pluck(id), Math.max(0, (target - now) * 1000))
}

let last = ''
export async function play(code: string) {
  if (code === last) return
  last = code
  await startSound()
  if (!code) hush()
  else await evaluate(code)
}

export function stopSound() {
  last = ''
  hush()
}
