/** Донат распределения активов: анимированный stroke-dashoffset, только transform/opacity. */
import { motion } from 'framer-motion'
import { useMemo } from 'react'

export interface DonutSlice {
  label: string
  /** доля 0..1 */
  frac: number
  color: string
}

const RING_COLORS = ['#6C5CFF', '#2AD8C2', '#F5A623', '#FF5CA8', '#00B2FF', '#9B7BFF', '#16C784']

export function Donut({
  items,
  size = 148,
  center,
  delay = 0,
}: {
  /** [{label, value}] — значение в USDT */
  items: Array<{ label: string; value: number }>
  size?: number
  center?: React.ReactNode
  delay?: number
}) {
  const slices = useMemo<DonutSlice[]>(() => {
    const total = items.reduce((s, i) => s + Math.max(0, i.value), 0)
    if (total <= 0) return []
    const sorted = [...items].sort((a, b) => b.value - a.value).filter((i) => i.value > 0)
    return sorted.map((i, k) => ({
      label: i.label,
      frac: Math.max(0, i.value) / total,
      color: RING_COLORS[k % RING_COLORS.length],
    }))
  }, [items])

  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        {slices.map((s, i) => {
          const len = s.frac * c
          const offset = acc
          acc += len
          return (
            <motion.circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${c - len}`}
              initial={{ strokeDashoffset: c, opacity: 0 }}
              animate={{ strokeDashoffset: -offset, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 60, damping: 18, delay: delay + i * 0.08 }}
            />
          )
        })}
      </svg>
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  )
}

/** Легенда под донатом. */
export function DonutLegend({ items, delay = 0 }: { items: Array<{ label: string; value: number }>; delay?: number }) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0)
  if (total <= 0) return null
  const sorted = [...items].sort((a, b) => b.value - a.value).filter((i) => i.value > 0)
  return (
    <motion.div
      initial="hide"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}
      className="mt-4 w-full space-y-1.5"
    >
      {sorted.map((i, k) => (
        <motion.div
          key={i.label}
          variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 6 } }}
          className="flex items-center justify-between text-[12.5px]"
        >
          <span className="flex items-center gap-2 text-muted">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: RING_COLORS[k % RING_COLORS.length] }}
            />
            {i.label}
          </span>
          <span className="font-semibold text-white tnum">{Math.round((i.value / total) * 100)}%</span>
        </motion.div>
      ))}
    </motion.div>
  )
}
