import * as Y from 'yjs'
import YProvider from 'y-partyserver/provider'
import { API_URL } from './reading'

// The shared canvas. Solo play uses the same doc, just without a connection;
// creating a room connects it, so whatever is on the canvas carries over.
export type CardData = {
  id: string
  x: number
  y: number
  status: string // 'reading' | 'ready'
  model: string // JSON ModelReading, '' until read
  pixels: string // JSON Pixels, '' until measured
  muted?: boolean // stays on the canvas but silent
  rot?: number // tilt in degrees, so the canvas looks like photos stuck up by hand
  by?: string // name of whoever added it
}

export const doc = new Y.Doc()
export const cards = doc.getMap<CardData>('cards')
// Photos live apart from cards so moving a card doesn't resend the photo.
export const photos = doc.getMap<string>('photos')

// Photos still waiting on the model's safety check live here — local only,
// never synced. Only the uploader sees the preview; peers see nothing until
// the photo is cleared and lands in `photos`.
export const pendingPhotos = new Map<string, string>()

export const roomFromUrl = () => new URLSearchParams(location.search).get('room')

let provider: YProvider | null = null

// Your display name. Typed on join, or a random one; shared with the room.
const ADJECTIVES = ['Mango', 'Neon', 'Sleepy', 'Disco', 'Velvet', 'Turbo', 'Sunny', 'Fuzzy', 'Cosmic', 'Pepper', 'Lucky', 'Breezy']
const THINGS = ['Tabla', 'Kazoo', 'Banjo', 'Bongo', 'Cowbell', 'Ukulele', 'Maraca', 'Tuba', 'Flute', 'Gong', 'Sitar', 'Drum']
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)]
export const randomName = () => `${pick(ADJECTIVES)} ${pick(THINGS)}`

let myName = localStorage.getItem('thaalam-name') ?? ''
export const getName = () => myName
let joined = false
export function setName(name: string) {
  joined = true
  myName = name.trim().slice(0, 24) || randomName()
  localStorage.setItem('thaalam-name', myName)
  provider?.awareness.setLocalStateField('user', { name: myName })
  return myName
}

export function joinRoom(room: string) {
  if (provider) return provider
  const base = new URL(API_URL || location.origin)
  provider = new YProvider(base.host, room, doc, {
    party: 'room',
    protocol: base.protocol === 'https:' ? 'wss' : 'ws',
  })
  // Your name reaches the room when you join from the join screen (setName), not before.
  if (joined) provider.awareness.setLocalStateField('user', { name: myName })
  localStorage.setItem('thaalam-last-room', room)
  return provider
}

export const newRoomId = () => Math.random().toString(36).slice(2, 8)

export function createRoom() {
  const room = newRoomId()
  const url = new URL(location.href)
  url.searchParams.set('room', room)
  history.replaceState(null, '', url)
  joinRoom(room)
  return room
}

// How many people are in the room, including you.
export function peerCount() {
  return provider ? provider.awareness.getStates().size : 1
}
// Names of everyone else in the room, keyed by their connection.
export function peerNames(): Map<number, string> {
  const out = new Map<number, string>()
  if (!provider) return out
  for (const [client, state] of provider.awareness.getStates()) {
    if (client === provider.awareness.clientID) continue
    const name = (state as { user?: { name?: string } }).user?.name
    out.set(client, name || 'Someone')
  }
  return out
}
export function onPeers(cb: () => void) {
  if (!provider) return () => {}
  provider.awareness.on('change', cb)
  return () => provider?.awareness.off('change', cb)
}
