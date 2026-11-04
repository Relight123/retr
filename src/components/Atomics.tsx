/** Лёгкие заглушки-скелетоны, Header, StatusDot, PctChip, Sparkline. */
import React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { fmtPct } from '../lib/format'
import { useMarket } from '../store/market'

export function Skeleton({ className }: { className?: string }) {
  return <span className={`skel inline-block rounded-md ${className ?? ''}`} />
}

export function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="text-right space-y-1.5 flex flex-col items-end">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-2.5 w-12" />
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center px-8 py-16 text-center select-none"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-muted border border-white/[0.04]">
        {icon}
      </div>
      <div className="mt-3.5 text-[15px] font-semibold text-text">{title}</div>
      {hint && <div className="mt-1 text-[13px] leading-snug text-faint max-w-xs">{hint}</div>}
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
    <header
      className="sticky top-0 z-30 border-b border-white/[0.04] bg-surface/80 px-4 pb-2.5 select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 8px)',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex min-h-11 items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-text active:bg-white/[0.06]"
            aria-label="back"
          >
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-semibold tracking-tight text-text leading-tight">{title}</div>
          {subtitle && (
            <div className="truncate text-[11px] leading-tight text-faint mt-0.5">{subtitle}</div>
          )}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}

/** Индикатор соединения: Live/Переподключение/Offline. */
export function StatusDot() {
  const { t } = useI18n()
  const conn = useMarket((s) => s.conn)
  const isLive = conn === 'live'
  const isWarn = conn === 'reconnecting' || conn === 'connecting'
  const label =
    conn === 'live'
      ? t('conn.live')
      : conn === 'reconnecting'
        ? t('conn.reconnecting')
        : conn === 'connecting'
          ? t('conn.connecting')
          : t('conn.offline')

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/[0.04] border border-white/[0.04] select-none"
      title={label}
    >
      <span className="relative flex h-1.5 w-1.5">
        {isLive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            isLive ? 'bg-up' : isWarn ? 'bg-warn' : 'bg-down'
          }`}
        />
      </span>
      <span className="text-[11px] font-medium tracking-tight text-faint tnum">
        {label}
      </span>
    </div>
  )
}

/** Изменение за 24ч с минималистичным фоном и чистой типографикой. */
export function PctChip({ pct, className }: { pct: number; className?: string }) {
  const isUp = pct >= 0
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-[5px] text-[11px] font-medium tnum ${
        isUp ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
      } ${className ?? ''}`}
    >
      {fmtPct(pct)}
    </span>
  )
}

/** Чистый лёгкий спарклайн с гладкой линией и мягким градиентом. */
export function Sparkline({ path, up }: { path?: string; up: boolean }) {
  const gradId = React.useId()
  if (!path) return <Skeleton className="h-[26px] w-[64px]" />
  const color = up ? 'var(--up)' : 'var(--down)'
  const areaPath = `${path} L64,26 L0,26 Z`

  return (
    <svg
      width="64"
      height="26"
      viewBox="0 0 64 26"
      className="shrink-0 overflow-hidden"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${gradId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
