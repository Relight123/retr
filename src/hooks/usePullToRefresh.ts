/** Pull-to-refresh: резиновая анимация, только transform. */
import { useRef, useState, useEffect, useCallback } from 'react'

export function usePullToRefresh(onRefresh: () => void, enabled = true) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [pullOrg, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const reset = useCallback(() => {
    setPullY(0)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) return
    let startY = 0
    let tracking = false
    let current = 0

    const onStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && e.touches.length === 1) {
        startY = e.touches[0].clientY
        tracking = true
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking || refreshing) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) {
        current = 0
        setPullY(0)
        return
      }
      if (el.scrollTop > 2) {
        tracking = false
        return
      }
      // резинка: 1/3 сопротивления, максимум 110px
      current = Math.min(110, dy / 3)
      setPullY(current)
      if (current > 8) e.preventDefault()
    }
    const onEnd = () => {
      if (!tracking) return
      tracking = false
      if (current > 64) {
        setRefreshing(true)
        onRefresh()
        window.setTimeout(() => {
          setRefreshing(false)
          setPullY(0)
        }, 700)
      } else {
        setPullY(0)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [enabled, onRefresh, refreshing])

  return { scrollRef, pullY: pullOrg, refreshing, reset }
}
