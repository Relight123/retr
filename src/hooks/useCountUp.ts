/** Count-up чисел (баланс/PnL) с rAF и снижением анимаций. */
import { useEffect, useRef, useState } from 'react'

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(target: number, durationMs = 900): number {
  const [val, setVal] = useState(prefersReduced() ? target : 0)
  const fromRef = useRef(val)
  const startedRef = useRef(false)

  useEffect(() => {
    if (prefersReduced()) {
      setVal(target)
      fromRef.current = target
      return
    }
    // первый рендер: 0 → target, далее from предыдущего
    const from = startedRef.current ? fromRef.current : 0
    startedRef.current = true
    const until = performance.now() + durationMs
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, 1 - (until - now) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (target - from) * eased
      setVal(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  fromRef.current = val
  return val
}
