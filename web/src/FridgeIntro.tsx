// The 3D fridge behind the join sheet. It wears the room's real photos and magnets; when you
// join, the camera flies into the door and the door becomes the canvas. Loaded lazily, so the
// join sheet never waits for Three.js; without WebGL there is simply no intro.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CARD_H, CARD_W, readingOf } from './CardShape'
import { cards, photos, pendingPhotos } from './room'

const still = matchMedia('(prefers-reduced-motion: reduce)')

// Fridge size in metres. The main door is the canvas.
const W = 0.8
const H = 1.8
const D = 0.68
const DOOR = { w: W - 0.04, h: 1.18, y: 0.08 + 1.18 / 2 } // main door, centred at y
const FREEZER = { h: 0.5, y: 0.08 + 1.18 + 0.02 + 0.25 }
const FLIGHT_MS = 1500

// Colours come from the same tokens as the 2D canvas.
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function build(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(token('wash'))
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.35

  // Light from the top left, like the door's sheen; the green ground tints every shadow.
  scene.add(new THREE.HemisphereLight('#ffffff', '#7fb79c', 0.55))
  const sun = new THREE.DirectionalLight('#ffffff', 1.5)
  sun.position.set(-1.6, 3.2, 2.4)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.radius = 6
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.02
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1, near: 0.5, far: 8 })
  scene.add(sun)

  const matte = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), matte(token('enamel-hi')))
  wall.position.set(0, 4, -D / 2 - 0.02)
  wall.receiveShadow = true
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), matte(token('enamel-lo')))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(wall, floor)

  // Glossy enamel, like the canvas: mint with a clear coat that catches the room.
  const enamel = new THREE.MeshPhysicalMaterial({ color: token('enamel'), roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 })
  const fridge = new THREE.Group()
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H - 0.06, D, 6, 0.07), enamel)
  body.position.y = 0.06 + (H - 0.06) / 2
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(W - 0.08, 0.08, D - 0.06, 2, 0.02), matte(token('ink-soft')))
  plinth.position.y = 0.04
  const door = new THREE.Mesh(new RoundedBoxGeometry(DOOR.w, DOOR.h, 0.06, 6, 0.025), enamel)
  door.position.set(0, DOOR.y, D / 2)
  const freezer = new THREE.Mesh(new RoundedBoxGeometry(DOOR.w, FREEZER.h, 0.06, 6, 0.025), enamel)
  freezer.position.set(0, FREEZER.y, D / 2)
  const chrome = new THREE.MeshStandardMaterial({ color: '#e9efec', metalness: 1, roughness: 0.22 })
  const handle = (y: number, h: number) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.035, h, 0.05, 3, 0.016), chrome)
    m.position.set(W / 2 - 0.08, y, D / 2 + 0.06)
    return m
  }
  fridge.add(body, plinth, door, freezer, handle(DOOR.y + DOOR.h / 2 - 0.3, 0.42), handle(FREEZER.y - FREEZER.h / 2 + 0.16, 0.22))
  fridge.traverse((o) => (o.castShadow = o.receiveShadow = true))
  scene.add(fridge)

  // The room's photos, laid out on the door the way they sit on the canvas.
  const prints = new THREE.Group()
  prints.position.set(0, DOOR.y, D / 2 + 0.031)
  scene.add(prints)
  const loader = new THREE.TextureLoader()
  const paper = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })
  // A flat plastic button magnet with a rounded rim, not a pin: turned from its side profile.
  const rim = [[0, 0], [1, 0], [1, 0.16], [0.97, 0.26], [0.88, 0.32], [0, 0.33]].map(([x, y]) => new THREE.Vector2(x, y))
  const disc = new THREE.LatheGeometry(rim, 40)
  const placeMagnet = (parent: THREE.Object3D, color: string, x: number, y: number, r: number) => {
    const m = new THREE.Mesh(disc, new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 }))
    m.scale.setScalar(r)
    m.rotation.x = Math.PI / 2
    m.position.set(x, y, 0.004)
    m.castShadow = true
    parent.add(m)
  }

  const showCards = () => {
    prints.clear()
    prints.position.x = 0
    const list = Array.from(cards.values()).slice(0, 12)
    if (!list.length) return // an empty door stays clean enamel
    const xs = list.map((c) => c.x), ys = list.map((c) => c.y)
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + CARD_W
    const y0 = Math.min(...ys), y1 = Math.max(...ys) + CARD_H
    // Fit the canvas layout inside the door, clear of the handle, keeping its proportions.
    const scale = Math.min((DOOR.w - 0.22) / (x1 - x0), (DOOR.h - 0.16) / (y1 - y0), 0.18 / CARD_W)
    prints.position.x = -0.05
    const pw = CARD_W * scale, ph = CARD_H * scale
    list.forEach((c, i) => {
      const print = new THREE.Group()
      print.position.set((c.x + CARD_W / 2 - (x0 + x1) / 2) * scale, -(c.y + CARD_H / 2 - (y0 + y1) / 2) * scale, i * 0.0015)
      print.rotation.z = -((c.rot ?? 0) * Math.PI) / 180
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), paper)
      sheet.receiveShadow = true
      print.add(sheet)
      const src = photos.get(c.id) ?? pendingPhotos.get(c.id)
      if (src) {
        const ratio = 132 / (CARD_W - 16) // the photo well's shape on the card
        // Crop like object-fit: cover once the photo's own shape is known.
        const tex = loader.load(src, (t) => {
          const img = t.image as HTMLImageElement
          const r = img.height / img.width / ratio
          if (r > 1) t.repeat.set(1, 1 / r)
          else t.repeat.set(r, 1)
          t.offset.set((1 - t.repeat.x) / 2, (1 - t.repeat.y) / 2)
        })
        tex.colorSpace = THREE.SRGBColorSpace
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw * 0.9, pw * 0.9 * ratio), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))
        pic.position.set(0, ph / 2 - pw * 0.05 - (pw * 0.9 * ratio) / 2, 0.001)
        print.add(pic)
      }
      const reading = c.status === 'ready' && !c.muted ? readingOf(c) : null
      placeMagnet(print, token(reading ? reading.role : 'magnet-idle'), 0, ph / 2 - pw * 0.02, pw * 0.12)
      prints.add(print)
    })
  }
  showCards()
  cards.observe(showCards)

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40)
  const look = new THREE.Vector3()
  const from = { pos: new THREE.Vector3(1.5, 1.35, 3.6), at: new THREE.Vector3(0, 0.95, 0) }
  const to = { pos: new THREE.Vector3(), at: new THREE.Vector3(0, DOOR.y, D / 2) }
  let shift = 0 // how far the fridge sits right of centre, as a share of the width

  const resize = () => {
    const w = innerWidth, h = innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Wide screens keep the fridge clear of the join sheet, on the right.
    shift = w >= 900 ? 0.2 : 0
    // Close enough that the door fills the screen edge to edge.
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const dist = Math.min((DOOR.w / 2 - 0.03) / camera.aspect, DOOR.h / 2 - 0.03) / half
    to.pos.set(0, DOOR.y, D / 2 + 0.03 + dist)
    camera.updateProjectionMatrix()
  }
  resize()

  const frame = (t: number, sway: number) => {
    const k = ease(t)
    camera.position.lerpVectors(from.pos, to.pos, k)
    camera.position.x += Math.sin(sway * 0.35) * 0.12 * (1 - k)
    look.lerpVectors(from.at, to.at, k)
    camera.lookAt(look)
    const w = innerWidth, h = innerHeight
    if (shift) camera.setViewOffset(w, h, -shift * w * (1 - k), 0, w, h)
    else camera.clearViewOffset()
    renderer.render(scene, camera)
  }

  return {
    frame,
    resize,
    dispose() {
      cards.unobserve(showCards)
      renderer.dispose()
      env.dispose()
      pmrem.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;[o.material].flat().forEach((m) => {
            m.map?.dispose()
            m.dispose()
          })
        }
      })
    },
  }
}

export default function FridgeIntro({ fly, onReady, onDone }: { fly: boolean; onReady: () => void; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ReturnType<typeof build> | null>(null)
  const idle = useRef(0)
  const [leaving, setLeaving] = useState(false)
  const flyAtMount = useRef(fly)

  // Build once; idle with a slow sway until the person joins.
  useEffect(() => {
    // Joined before Three.js arrived: no intro this time.
    if (flyAtMount.current) return onDone()
    try {
      scene.current = build(canvas.current!)
    } catch (e) {
      console.warn('[thaalam] no 3D fridge:', e)
      return onDone()
    }
    const s = scene.current
    const sway = (now: number) => {
      s.frame(0, now / 1000)
      if (!still.matches) idle.current = requestAnimationFrame(sway)
    }
    idle.current = requestAnimationFrame(sway)
    onReady()
    const onResize = () => s.resize()
    addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(idle.current)
      removeEventListener('resize', onResize)
      s.dispose()
      scene.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Joined: fly into the door, then fade to the real canvas underneath.
  useEffect(() => {
    const s = scene.current
    if (!fly || !s || flyAtMount.current) return
    cancelAnimationFrame(idle.current)
    if (still.matches) {
      setLeaving(true)
      return
    }
    let raf = 0
    const start = performance.now()
    const sway = start / 1000
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FLIGHT_MS)
      s.frame(t, sway)
      if (t < 1) raf = requestAnimationFrame(step)
      else setLeaving(true)
    }
    // A tap or key skips to the canvas.
    const skip = () => {
      cancelAnimationFrame(raf)
      setLeaving(true)
    }
    raf = requestAnimationFrame(step)
    addEventListener('pointerdown', skip, { once: true })
    addEventListener('keydown', skip, { once: true })
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointerdown', skip)
      removeEventListener('keydown', skip)
    }
  }, [fly])

  return (
    <canvas
      ref={canvas}
      className={`fridge-intro${leaving ? ' leaving' : ''}`}
      aria-hidden="true"
      onTransitionEnd={() => leaving && onDone()}
    />
  )
}
