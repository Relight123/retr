/** Тосты: пружина сверху + контекстные Badges + confetti burst. */
import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Info, Zap, TrendingUp } from 'lucide-react'
import { useToasts, type Toast } from '../store/toasts'
import { useCelebrate } from '../store/toasts'

const ICON: Record<Toast['kind'], React.ReactNode> = {
  info: <Info size={15} />,
  success: <Check size={15} />,
  error: <X size={15} />,
  order: <Info size={15} />,
  fill: <Zap size={15} />,
  profit: <TrendingUp size={15} />,
}

const BG: Record<Toast['kind'], string> = {
  info: 'bg-surface3',
  success: 'chip-up',
  error: 'chip-down',
  order: 'chip-accent',
  fill: 'chip-warn',
  profit: 'chip-up',
}

export function Toasts() {
  const { items, dismiss } = useToasts()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 pt-safe"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
    >
      <AnimatePresence initial={false}>
        {items.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ y: -30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -18, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -24) dismiss(toast.id)
            }}
            className="pointer-events-auto flex max-w-[86vw] cursor-grab items-center gap-2 rounded-2xl border border-line px-4 py-2.5 text-[13px] font-medium shadow-float"
            style={{ background: 'var(--glass-strong)', WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${BG[toast.kind]}`}>
              {ICON[toast.kind]}
            </span>
            <span className="truncate tnum">{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      <Confetti />
    </div>
  )
}

/** Лёгкий конфетти-бёрст поверх (только transform/opacity). */
function Confetti() {
  const burst = useCelebrate((s) => s.burst)
  const [alive, setAlive] = React.useState(false)

  useEffect(() => {
    if (burst === 0) return
    setAlive(true)
    const id = window.setTimeout(() => setAlive(false), 1400)
    return () => window.clearTimeout(id)
  }, [burst])

  if (!alive) return null
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 60 }}>
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2 + (burst % 7)
        const dist = 90 + (i % 5) * 26
        return (
          <motion.span
            key={`${burst}-${i}`}
            className="absolute h-2 w-2 rounded-[3px]"
            style={{
              background: i % 3 === 0 ? 'var(--up)' : i % 3 === 1 ? 'var(--accent)' : 'var(--accent-2)',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 30,
              opacity: 0,
              scale: 0.4,
              rotate: 180,
            }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}
    </div>
  )
}
