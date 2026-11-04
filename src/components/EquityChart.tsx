/** Кривая капитала: чистый SVG + анимация pathLength (framer-motion), без библиотек графиков. */
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import type { EquityPoint } from '../lib/engine/stats'

const W = 320
const H = 110
const PAD = 6

function buildPath(pts: EquityPoint[]): { line: string; area: string; min: number; max: number } {
  if (pts.length === 0) return { line: '', area: '', min: 0, max: 0 }
  const vs = pts.map((p) => p.v)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const span = max - min || 1
  const n = pts.length
  const x = (i: number) => PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2)
  let line = ''
  for (let i = 0; i < n; i++) line += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pts[i].v).toFixed(1)}`
  const area = `${line}L${x(n - 1).toFixed(1)},${H}L${x(0).toFixed(1)},${H}Z`
  return { line, area, min, max }
}

export function EquityChart({ points, height = 110 }: { points: EquityPoint[]; height?: number }) {
  const geo = useMemo(() => buildPath(points), [points])
  if (!points.length) return null
  const positive = geo.max >= geo.min && points[points.length - 1].v >= (points[0]?.v ?? 0)
  const color = positive ? '#16C784' : '#EA3943'
  const uid = `eq-${Math.min(...points.map((p) => p.t))}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={geo.area}
        fill={`url(#${uid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      />
      <motion.path
        d={geo.line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ type: 'spring', stiffness: 55, damping: 18, duration: 1.1 }}
      />
    </svg>
  )
}
