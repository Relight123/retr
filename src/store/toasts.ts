/** Тосты: выезжают сверху пружиной, убираются свайпом вверх. */
import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error' | 'order' | 'fill' | 'profit'

export interface Toast {
  id: string
  kind: ToastKind
  text: string
}

interface ToastState {
  items: Toast[]
  push: (kind: ToastKind, text: string) => void
  dismiss: (id: string) => void
}

let seq = 0

export const useToasts = create<ToastState>((set) => ({
  items: [],
  push(kind, text) {
    const id = `toast-${++seq}-${Date.now().toString(36)}`
    set((s) => ({ items: [...s.items.slice(-3), { id, kind, text }] }))
    window.setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }))
    }, 3600)
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }))
  },
}))

/** «Конфетти» при закрытии в плюс. */
interface CelebrateState {
  burst: number
  celebrate: () => void
}
export const useCelebrate = create<CelebrateState>((set) => ({
  burst: 0,
  celebrate: () => set((s) => ({ burst: s.burst + 1 })),
}))
