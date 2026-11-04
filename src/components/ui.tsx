/** Базовые UI-примитивы: Seg, Chip, Button (spring tap), Stat, Sheet (vaul). */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { buzz } from '../lib/haptics'

/** Сегмент-контрол (переключатели табо/типов). */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  layoutId,
  size = 'md',
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  layoutId?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`flex items-center gap-1 rounded-full border border-line/50 p-1 ${size === 'sm' ? 'text-[11px]' : 'text-[13px]'}`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <motion.button
            key={o.value}
            onClick={() => {
              if (!active) {
                buzz(4)
                onChange(o.value)
              }
            }}
            className={`relative rounded-full px-3 ${size === 'sm' ? 'py-1.5' : 'py-2'} font-medium ${
              active ? 'text-white' : 'text-muted'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0"
                style={{
                  borderRadius: 99,
                  background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #6366f1))',
                  boxShadow: '0 0 12px rgba(91,123,254,0.3)',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap tnum">{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

export function Chip({
  color,
  children,
  className,
}: {
  color: 'up' | 'down' | 'warn' | 'accent' | 'neutral'
  children: React.ReactNode
  className?: string
}) {
  const cls = {
    up: 'chip-up',
    down: 'chip-down',
    warn: 'chip-warn',
    accent: 'chip-accent',
    neutral: 'chip-neutral',
  }[color]
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-[3px] text-[12px] font-semibold tnum ${cls} ${className ?? ''}`}
      style={{
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </span>
  )
}

export function TapButton({
  children,
  onClick,
  className,
  disabled,
  haptic = true,
  variant,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  haptic?: boolean
  variant?: 'buy' | 'sell'
}) {
  const glowStyle = variant === 'buy'
    ? { boxShadow: '0 0 20px rgba(34,197,94,0.25), 0 0 6px rgba(34,197,94,0.15)' }
    : variant === 'sell'
      ? { boxShadow: '0 0 20px rgba(239,68,68,0.25), 0 0 6px rgba(239,68,68,0.15)' }
      : undefined

  return (
    <motion.button
      className={`btn-solid ${className ?? ''}`}
      disabled={disabled}
      onClick={() => {
        if (haptic) buzz(8)
        onClick?.()
      }}
      style={glowStyle}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.button>
  )
}

export function Stat({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${className ?? ''}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 text-[15px] font-semibold tnum">{children}</div>
    </div>
  )
}

/** Нижний sheet (vaul): пружина + свайп-закрытие + scrim. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  maxHeight = '86dvh',
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title?: React.ReactNode
  children: React.ReactNode
  maxHeight?: string
}) {
  const spring = { type: 'spring' as const, stiffness: 380, damping: 30 }
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-50"
          style={{
            background: 'rgba(4,6,10,0.6)',
            WebkitBackdropFilter: 'blur(10px) saturate(1.4)',
            backdropFilter: 'blur(10px) saturate(1.4)',
          }}
        />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-xl"
          style={{ maxHeight }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            className="rounded-t-[28px] border-t border-line/50"
            style={{
              background: 'var(--surface-2)',
              boxShadow: 'var(--shadow-float), 0 -8px 32px rgba(0,0,0,0.3)',
              maxHeight,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              className="relative flex items-center justify-center pt-3"
              style={{ touchAction: 'none' }}
            >
              <span
                className="h-[5px] w-12 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              />
              {title && (
                <div className="absolute left-1/2 top-8 -translate-x-1/2 max-w-[80%] truncate text-[15px] font-semibold">
                  {title}
                </div>
              )}
              <button
                className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full text-muted"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                onClick={() => onOpenChange(false)}
                aria-label="close"
              >
                <X size={17} />
              </button>
            </div>
            <div
              className="scroll px-4"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}
            >
              {title ? <div className="h-9" /> : <div className="h-2" />}
              {children}
            </div>
          </motion.div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** Простое модальное окно-состояние (затемнение + карта по центру). */
export function Modal({
  open,
  onOpenChange: onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          style={{ background: 'rgba(4,6,10,0.6)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-sm rounded-[24px] border border-line p-5"
            style={{ background: 'var(--surface-2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
