// Strudel setup plus the "bounce the card's magnet on its own notes" hook.

import { initStrudel, samples, evaluate, hush } from '@strudel/web'
import { registerSoundfonts } from '@strudel/soundfonts'

let ready: Promise<unknown> | null = null

export function startSound() {
  ready ??= initStrudel({
    prebake: () => Promise.all([samples('github:tidalcycles/dirt-samples'), registerSoundfonts()]),
  })
  return ready
}

const still = matchMedia('(prefers-reduced-motion: reduce)')

// Strudel calls this a little before each note. Wait until the note actually sounds, then bounce.
;(window as any).hit = (id: string) => (_hap: unknown, now: number, _cps: number, target: number) => {
  if (still.matches) return
  setTimeout(() => {
    const el = document.querySelector(`[data-magnet="${id}"]`) as HTMLElement | null
    el?.animate(
      [
        { transform: 'translateY(-5px) scale(1.14)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    )
  }, Math.max(0, (target - now) * 1000))
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
