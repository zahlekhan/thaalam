import { useSyncExternalStore } from 'react'

// One toast at a time above the bottom bar: notices, errors, and "Removed · Undo".
export type Toast = { id: number; text: string; action?: { label: string; run: () => void }; tone?: 'error' }

let current: Toast | null = null
let timer = 0
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

type Opts = { action?: Toast['action']; tone?: Toast['tone']; ms?: number }
// Plain notices wait their turn while an Undo is showing, so they can't take it away.
const queue: [string, Opts][] = []

export function toast(text: string, opts: Opts = {}) {
  if (current?.action && !opts.action) {
    queue.push([text, opts])
    return
  }
  current = { id: nextId++, text, action: opts.action, tone: opts.tone }
  emit()
  clearTimeout(timer)
  timer = window.setTimeout(dismissToast, opts.ms ?? 5000)
}

export function dismissToast() {
  clearTimeout(timer)
  current = null
  const next = queue.shift()
  if (next) toast(...next)
  else emit()
}

export const useToast = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current
  )
