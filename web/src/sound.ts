// Strudel setup plus the "pulse the card on its own notes" hook.

import { initStrudel, samples, evaluate, hush } from '@strudel/web'
import { registerSoundfonts } from '@strudel/soundfonts'

let ready: Promise<unknown> | null = null

export function startSound() {
  ready ??= initStrudel({
    prebake: () => Promise.all([samples('github:tidalcycles/dirt-samples'), registerSoundfonts()]),
  })
  return ready
}

// Strudel calls this a little before each note. Wait until the note actually sounds, then pulse.
;(window as any).hit = (id: string) => (_hap: unknown, now: number, _cps: number, target: number) => {
  setTimeout(() => {
    const el = document.querySelector(`[data-card="${id}"]`) as HTMLElement | null
    el?.animate(
      [
        { transform: 'scale(1.045)', boxShadow: '0 0 0 4px var(--glow), 0 0 42px 6px var(--glow)' },
        { transform: 'scale(1)', boxShadow: '0 0 0 2px var(--glow), 0 0 18px 0 var(--glow)' },
      ],
      { duration: 220, easing: 'ease-out' },
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
