import { BaseBoxShapeUtil, HTMLContainer, T, type RecordProps, type TLShape } from 'tldraw'
import { combine, type ModelReading, type Pixels, type Role } from './reading'
import { instrumentFor } from './music'

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    card: { w: number; h: number; src: string; status: string; model: string; pixels: string }
  }
}

export type CardShape = TLShape<'card'>

export const ROLE_ICON: Record<Role, string> = {
  kick: '🥁',
  percussion: '🪘',
  bass: '🎸',
  chords: '🎹',
  melody: '🎶',
  texture: '🌫️',
}

export function readingOf(card: CardShape) {
  if (!card.props.pixels) return null
  const pixels = JSON.parse(card.props.pixels) as Pixels
  const model = card.props.model ? (JSON.parse(card.props.model) as ModelReading) : null
  return combine(model, pixels)
}

export class CardUtil extends BaseBoxShapeUtil<CardShape> {
  static override type = 'card' as const
  static override props: RecordProps<CardShape> = {
    w: T.number,
    h: T.number,
    src: T.string,
    status: T.string,
    model: T.string,
    pixels: T.string,
  }

  getDefaultProps(): CardShape['props'] {
    return { w: 180, h: 236, src: '', status: 'reading', model: '', pixels: '' }
  }

  override canResize() {
    return false
  }

  component(card: CardShape) {
    const onStage = this.editor.getShape(card.parentId)?.type === 'frame'
    const reading = card.props.status === 'ready' ? readingOf(card) : null
    const glow = reading?.pixels.palette[0] ?? '#888'
    const inst = reading ? instrumentFor(reading) : null

    let line = 'Listening...'
    if (card.props.status === 'error') line = "Can't reach the model"
    else if (reading?.guessed) line = `${reading.mood}, a guess`
    else if (reading) line = `${reading.mood} ${Math.round(reading.moodProb * 100)}%`

    return (
      <HTMLContainer>
        <div
          className={`card ${onStage ? 'on-stage' : 'parked'}`}
          data-card={card.id}
          style={{ ['--glow' as string]: glow }}
        >
          <img src={card.props.src} draggable={false} alt="" />
          <div className="card-info">
            <div className="card-inst">
              {reading ? `${ROLE_ICON[reading.role]} ${inst?.label}` : ' '}
            </div>
            <div className="card-line">{line}</div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  getIndicatorPath(card: CardShape) {
    const p = new Path2D()
    p.roundRect(0, 0, card.props.w, card.props.h, 16)
    return p
  }
}
