/** Свайп из-за левого края → назад (инерция + защита порога). */
import { useEffect, useState } from 'react'

export function useSwipeBack(onBack: () => void, enabled = true) {
  const [dx, setDx] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setDx(0)
      return
    }
    let startX = 0
    let startY = 0
    let tracking: 'idle' | 'on' = 'idle'

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      if (startX < 28) tracking = 'on'
    }
    const onMove = (e: TouchEvent) => {
      if (tracking !== 'on') return
      const t = e.touches[0]
      const dxNow = t.clientX - startX
      if (Math.abs(t.clientY - startY) > 44) {
        tracking = 'idle'
        setDx(0)
        return
      }
      setDx(dxNow > 0 ? Math.min(dxNow, 140) : 0)
      if (dxNow > 8) e.preventDefault()
    }
    const onEnd = () => {
      if (tracking !== 'on') return
      tracking = 'idle'
      setDx((prev) => {
        if (prev > 84) {
          onBack()
          return 0
        }
        return 0
      })
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [enabled, onBack])

  return { dx }
}
