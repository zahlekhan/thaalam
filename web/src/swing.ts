// Prints hang from their magnets. Each card has two small springs: a swing around its magnet
// when the card is dragged (by you or by anyone in the room), and a lift off the door on each
// of its notes. One animation loop drives every print and stops once they are all at rest.

const still = matchMedia('(prefers-reduced-motion: reduce)')

type Spring = { x: number; v: number } // degrees, degrees per second
type Print = {
  el: HTMLElement
  swing: Spring // rotation around the magnet; positive swings the bottom left
  lift: Spring // rotateX; positive brings the bottom of the print off the door
  at?: { x: number; y: number; t: number } // last position, in canvas units
  vx: number // smoothed drag speed, canvas units per second
  vy: number
}

const prints = new Map<string, Print>()

// Underdamped, so a dropped print swings back past rest once and settles like paper.
const SWING = { stiffness: 140, damping: 9 }
const LIFT = { stiffness: 260, damping: 16 }

const clamp = (n: number, max: number) => Math.max(-max, Math.min(max, n))

function settle(s: Spring, target: number, k: typeof SWING, dt: number) {
  s.v += (k.stiffness * (target - s.x) - k.damping * s.v) * dt
  s.x += s.v * dt
  return Math.abs(s.x - target) > 0.02 || Math.abs(s.v) > 0.05
}

function draw(p: Print) {
  p.el.style.willChange = 'transform'
  p.el.style.transform = `perspective(600px) rotateX(${p.lift.x.toFixed(2)}deg) rotate(${p.swing.x.toFixed(2)}deg)`
}

function rest(p: Print) {
  p.swing = { x: 0, v: 0 }
  p.lift = { x: 0, v: 0 }
  p.el.style.transform = ''
  p.el.style.willChange = ''
}

let frame = 0
let last = 0

function wake() {
  if (frame || still.matches) return
  last = performance.now()
  frame = requestAnimationFrame(step)
}

function step(now: number) {
  const dt = Math.min(0.032, (now - last) / 1000)
  last = now
  let moving = false
  for (const p of prints.values()) {
    // No new position for a moment means the pointer stopped.
    if (p.at && now - p.at.t > 80) p.vx = p.vy = 0
    // A print trails behind the way it's pulled, and lifts off the door the faster it goes.
    const swung = settle(p.swing, clamp(p.vx * 0.02, 22), SWING, dt)
    const lifted = settle(p.lift, clamp(Math.hypot(p.vx, p.vy) * 0.006, 10), LIFT, dt)
    if (swung || lifted || p.vx || p.vy) {
      moving = true
      draw(p)
    } else if (p.el.style.transform) rest(p)
  }
  frame = moving && !still.matches ? requestAnimationFrame(step) : 0
}

still.addEventListener('change', () => {
  if (still.matches) prints.forEach(rest)
})

export function hang(id: string, el: HTMLElement) {
  prints.set(id, { el, swing: { x: 0, v: 0 }, lift: { x: 0, v: 0 }, vx: 0, vy: 0 })
}

export function unhang(id: string) {
  prints.delete(id)
}

// Called whenever a card's position changes, whoever moved it.
export function moved(id: string, x: number, y: number) {
  const p = prints.get(id)
  if (!p) return
  const t = performance.now()
  if (p.at) {
    const dt = (t - p.at.t) / 1000
    if (dt > 0 && dt < 0.25) {
      const k = Math.min(1, dt / 0.06) // smooth pointer jitter over about 60ms
      p.vx += ((x - p.at.x) / dt - p.vx) * k
      p.vy += ((y - p.at.y) / dt - p.vy) * k
      wake()
    }
  }
  p.at = { x, y, t }
}

// The magnet squashes, then stretches back: a note, or a magnet snapping onto the door.
export function pump(id: string) {
  if (still.matches) return
  prints
    .get(id)
    ?.el.querySelector('.magnet')
    ?.animate(
      [
        { transform: 'none' },
        { transform: 'scale(1.24, 0.86)', offset: 0.2 },
        { transform: 'translateY(-3px) scale(0.92, 1.1)', offset: 0.55 },
        { transform: 'none' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    )
}

// One note: the magnet pumps and knocks the paper a little way off the door.
export function pluck(id: string) {
  const p = prints.get(id)
  // Nobody can see a hidden tab; don't pile up animations it would replay on return.
  if (!p || still.matches || document.hidden) return
  pump(id)
  p.lift.v = clamp(p.lift.v + 100, 160)
  p.swing.v += (Math.random() - 0.5) * 16
  wake()
}

// A new card is pressed onto the door from just above it, then its magnet snaps on.
export function land(id: string) {
  const p = prints.get(id)
  if (!p || still.matches) return
  p.el
    .animate(
      [
        { translate: '0 -16px', scale: '1.12', opacity: 0 },
        { opacity: 1, offset: 0.3 },
        { translate: '0 0', scale: '1' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    )
    .finished.then(
      () => {
        pump(id)
        p.swing.v += (Math.random() < 0.5 ? -1 : 1) * 70
        wake()
      },
      () => {} // cancelled, e.g. the card was deleted mid-landing
    )
}
