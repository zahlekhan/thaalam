import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { combine, type ModelReading, type Pixels, type Role } from './reading'
import { instrumentFor } from './music'
import { pendingPhotos, photos, type CardData } from './room'
import { MuteIcon } from './icons'

export const CARD_W = 160
export const CARD_H = 200

export type CardNode = Node<CardData, 'card'>

// Each role has its own magnet colour, so you can tell parts apart across the room.
export const ROLE_COLOR: Record<Role, string> = {
  kick: 'var(--kick)',
  percussion: 'var(--percussion)',
  bass: 'var(--bass)',
  chords: 'var(--chords)',
  melody: 'var(--melody)',
  texture: 'var(--texture)',
}

export function readingOf(card: Pick<CardData, 'pixels' | 'model'>) {
  if (!card.pixels) return null
  const pixels = JSON.parse(card.pixels) as Pixels
  const model = card.model ? (JSON.parse(card.model) as ModelReading) : null
  return combine(model, pixels)
}

// What the card says under its photo, and what a screen reader hears.
export function describe(card: CardData) {
  const reading = card.status === 'ready' ? readingOf(card) : null
  if (!reading) {
    return { title: 'Listening…', line: card.by ? `added by ${card.by}` : 'reading the photo', label: 'Photo being read' }
  }
  const title = instrumentFor(reading).label
  const mood = reading.guessed ? `${reading.mood}, a guess` : reading.mood
  const line = [card.muted ? 'muted' : mood, card.by].filter(Boolean).join(' · ')
  const label = `${title}, ${mood}, ${card.muted ? 'muted' : 'playing'}${card.by ? `, added by ${card.by}` : ''}`
  return { title, line, label }
}

export const Card = memo(function Card({ data }: NodeProps<CardNode>) {
  const reading = data.status === 'ready' ? readingOf(data) : null
  // Blank until the model clears the photo; the uploader gets a local preview.
  const src = photos.get(data.id) ?? pendingPhotos.get(data.id)
  const { title, line } = describe(data)
  const color = reading ? ROLE_COLOR[reading.role] : 'var(--magnet-idle)'

  return (
    <div
      className={`card${data.muted ? ' muted' : ''}${reading ? '' : ' listening'}`}
      data-card={data.id}
      style={{ width: CARD_W, height: CARD_H, rotate: `${data.rot ?? 0}deg`, ['--role' as string]: color }}
    >
      <span className="magnet" data-magnet={data.id}>
        {data.muted ? <MuteIcon size={16} /> : null}
      </span>
      <div className="photo">{src ? <img src={src} draggable={false} alt="" /> : null}</div>
      <div className="card-label">
        <b>{title}</b>
        <span>{line}</span>
      </div>
    </div>
  )
})
