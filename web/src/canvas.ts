// What people do to cards: add, mute, delete (with undo). Everything goes through the shared doc.

import { askModel, measurePixels, PhotoRejected, uploadPhoto, type ModelReading } from './reading'
import { CARD_H, CARD_W, describe, readingOf } from './CardShape'
import { cards, doc, getName, pendingPhotos, photos, type CardData } from './room'
import { toast } from './toast'

// A small random tilt, like a photo stuck up by hand.
const tilt = () => Math.round((Math.random() * 12 - 6) * 10) / 10

export async function addCard(
  src: string,
  model: ModelReading | null,
  at: { x: number; y: number },
  modelName: string
) {
  const id = crypto.randomUUID()
  // The photo stays local until the model clears it — peers see a
  // "Listening..." card but never the image before that.
  pendingPhotos.set(id, src)
  doc.transact(() => {
    cards.set(id, {
      id,
      x: at.x - CARD_W / 2,
      y: at.y - CARD_H / 2,
      status: 'reading',
      model: '',
      pixels: '',
      rot: tilt(),
      by: getName() || undefined,
    })
  })
  // The card may be moved or removed while we read it, so always patch the latest copy.
  const update = (patch: Partial<CardData>) => {
    const c = cards.get(id)
    if (c) cards.set(id, { ...c, ...patch })
  }
  update({ pixels: JSON.stringify(await measurePixels(src)) })
  try {
    const m = model ?? (await askModel(src, modelName))
    // Cleared — store it in R2 so rooms and the public gallery can link to it.
    photos.set(id, await uploadPhoto(src))
    pendingPhotos.delete(id)
    update({ model: JSON.stringify(m), status: 'ready' })
  } catch (e) {
    if (e instanceof PhotoRejected) {
      pendingPhotos.delete(id)
      doc.transact(() => {
        cards.delete(id)
        photos.delete(id)
      })
      toast(e.message, { tone: 'error' })
      return
    }
    console.warn(e)
    // Model unreachable: keep the photo (shared now) and let pixels make a part.
    photos.set(id, src)
    pendingPhotos.delete(id)
    update({ status: 'ready' })
  }
}

export function toggleMute(id: string) {
  const c = cards.get(id)
  if (c) cards.set(id, { ...c, muted: !c.muted })
}

// Delete right away; one Undo puts every removed card and its photo back exactly as they were.
export function removeCards(ids: string[]) {
  const removed = ids.flatMap((id) => {
    const card = cards.get(id)
    return card ? [{ card, photo: photos.get(id) }] : []
  })
  if (!removed.length) return
  doc.transact(() => {
    for (const { card } of removed) {
      cards.delete(card.id)
      photos.delete(card.id)
    }
  })
  const first = removed[0].card
  const title = removed.length > 1 ? `${removed.length} photos` : readingOf(first) ? describe(first).title : 'a photo'
  toast(`Removed ${title}`, {
    ms: 6000,
    action: {
      label: 'Undo',
      run: () =>
        doc.transact(() => {
          for (const { card, photo } of removed) {
            cards.set(card.id, card)
            if (photo) photos.set(card.id, photo)
          }
        }),
    },
  })
}

// Every ready, unmuted card plays. Sorted so every device builds the same mix.
export function playingCards() {
  return Array.from(cards.values())
    .filter((c) => c.status === 'ready' && !c.muted)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((c) => {
      const reading = readingOf(c)
      return reading ? [{ id: c.id, reading }] : []
    })
}
