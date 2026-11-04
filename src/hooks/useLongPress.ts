/** Долгий тап → контекстные действия. */
import { useRef, useCallback } from 'react'
import { buzz } from '../lib/haptics'

export function useLongPress(onLongPress: () => void, ms = 480) {
  const timer = useRef<number | null>(null)

  const start = useCallback(() => {
    timer.current = window.setTimeout(() => {
      timer.current = null
      buzz(10)
      onLongPress()
    }, ms)
  }, [ms, onLongPress])

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  return {
    onTouchStart: start,
    onTouchMove: clear,
    onTouchEnd: clear,
    onTouchCancel: clear,
  }
}
