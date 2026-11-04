/** Лёгкие заглушки-скелетоны, Header, StatusDot, PctChip, Sparkline. */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Chip } from './ui'
import { useI18n } from '../lib/i18n'
import { fmtPct } from '../lib/format'
import { useMarket } from '../store/market'

export function Skeleton({ className }: { className?: string }) {
  return <span className={`skel inline-block ${className ?? ''}`} />
}

export function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-3 w-24" />
            <div className="h-2" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="text-right">
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-10 py-14 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface3 text-muted">
        {icon}
      </div>
      <div className="mt-4 text-[15px] font-semibold">{title}</div>
      {hint && <div className="mt-1 text-[13px] leading-snug text-faint">{hint}</div>}
    </motion.div>
  )
}

export function Header({
  title,
  right,
  onBack,
  subtitle,
}: {
  title?: React.ReactNode
  right?: React.ReactNode
  onBack?: () => void
  subtitle?: React.ReactNode
}) {
  return (
    <div
      className="glass sticky top-0 z-30 px-4 pb-2"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 10px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex min-h-11 items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-surface3"
            aria-label="back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-bold leading-6">{title}</div>
          {subtitle && (
            <div className="truncate text-[12px] leading-4 text-faint">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  )
}

/** Индикатор соединения: Live/Переподключение/Offline. */
export function StatusDot() {
  const { t } = useI18n()
  const conn = useMarket((s) => s.conn)
  const providerId = useMarket((s) => s.providerId)
  const label =
    conn === 'live'
      ? t('conn.live') + (providerId ? ` · ${providerId}` : '')
      : conn === 'reconnecting'
        ? t('conn.reconnecting')
        : conn === 'connecting'
          ? t('conn.connecting')
          : t('conn.offline')
  const color =
    conn === 'live' ? 'var(--up)' : conn === 'reconnecting' ? 'var(--warn)' : 'var(--down)'

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}
      title={label}
    >
      <motion.span
        className="block h-[6px] w-[6px] rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        animate={conn === 'live' ? { opacity: [1, 0.3, 1], scale: [1, 0.85, 1] } : { opacity: 1 }}
        transition={
          conn === 'live'
            ? { repeat: Infinity, duration: 2, ease: 'easeInOut' }
            : undefined
        }
      />
      <span className="text-[10.5px] font-medium tnum" style={{ color }}>{label}</span>
    </div>
  )
}

/** Изменение за 24ч с цветом и стрелкой. */
export function PctChip({ pct, className }: { pct: number; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={pct.toFixed(2)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex ${className ?? ''}`}
      >
        <Chip color={pct >= 0 ? 'up' : 'down'}>
          <span className="mr-0.5" style={{ fontSize: '8px' }}>{pct >= 0 ? '▲' : '▼'}</span>
          {fmtPct(pct)}
        </Chip>
      </motion.span>
    </AnimatePresence>
  )
}

/** Мини-спарклайн (path из стора). */
export function Sparkline({ path, up }: { path?: string; up: boolean }) {
  if (!path) return <Skeleton className="h-[28px] w-[68px]" />
  const color = up ? 'var(--up)' : 'var(--down)'
  const id = `spark-${up ? 'up' : 'dn'}`
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      width="68"
      height="28"
      viewBox="0 0 64 26"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}
