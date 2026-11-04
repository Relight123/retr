export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function uid(prefix = 'o'): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  )
}

/** Простая хеш-функция для детерминированных градиентов. */
export function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Внутренняя шина событий (обновления из stream-коллбеков → React). */
export function createEmitter<T>(): {
  on: (fn: (x: T) => void) => () => void
  emit: (x: T) => void
} {
  const set = new Set<(x: T) => void>()
  return {
    on(fn) {
      set.add(fn)
      return () => set.delete(fn)
    },
    emit(x) {
      set.forEach((fn) => {
        try {
          fn(x)
        } catch (e) {
          console.warn(e)
        }
      })
    },
  }
}
