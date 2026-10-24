import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { combine, type ModelReading, type Pixels, type Role } from './reading'
import { instrumentFor } from './music'
import { pendingPhotos, photos, type CardData } from './room'

export const CARD_W = 180
export const CARD_H = 236

export type CardNode = Node<CardData & { onStage: boolean }, 'card'>
export type StageNode = Node<Record<string, never>, 'stage'>

export const ROLE_ICON: Record<Role, string> = {
  kick: '🥁',
  percussion: '🪘',
  bass: '🎸',
  chords: '🎹',
  melody: '🎶',
  texture: '🌫️',
}

export function readingOf(card: Pick<CardData, 'pixels' | 'model'>) {
  if (!card.pixels) return null
  const pixels = JSON.parse(card.pixels) as Pixels
  const model = card.model ? (JSON.parse(card.model) as ModelReading) : null
  return combine(model, pixels)
}

export const Card = memo(function Card({ data }: NodeProps<CardNode>) {
  const reading = data.status === 'ready' ? readingOf(data) : null
  // Blank until the model clears the photo; uploader gets a local preview.
  const src = photos.get(data.id) ?? pendingPhotos.get(data.id)
  const glow = reading?.pixels.palette[0] ?? '#888'
  const inst = reading ? instrumentFor(reading) : null

  let line = 'Listening...'
  if (reading && !data.model) line = "Can't reach the model"
  else if (reading?.guessed) line = `${reading.mood}, a guess`
  else if (reading) line = `${reading.mood} ${Math.round(reading.moodProb * 100)}%`

  return (
    <div
      className={`card ${data.onStage ? 'on-stage' : 'parked'}`}
      data-card={data.id}
      style={{ width: CARD_W, height: CARD_H, ['--glow' as string]: glow }}
    >
      {src ? <img src={src} draggable={false} alt="" /> : null}
      <div className="card-info">
        <div className="card-inst">{reading ? `${ROLE_ICON[reading.role]} ${inst?.label}` : ' '}</div>
        <div className="card-line">{line}</div>
      </div>
    </div>
  )
})

export function Stage({ width, height }: NodeProps<StageNode>) {
  return (
    <div className="stage" style={{ width, height }}>
      <span>Stage</span>
    </div>
  )
}
