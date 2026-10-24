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

export function joinRoom(room: string) {
  if (provider) return provider
  const base = new URL(API_URL || location.origin)
  provider = new YProvider(base.host, room, doc, {
    party: 'room',
    protocol: base.protocol === 'https:' ? 'wss' : 'ws',
  })
  return provider
}

export function createRoom() {
  const room = Math.random().toString(36).slice(2, 8)
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
export function onPeers(cb: () => void) {
  if (!provider) return () => {}
  provider.awareness.on('change', cb)
  return () => provider?.awareness.off('change', cb)
}
