/** Базовые UI-примитивы: Seg, Chip, TapButton, Stat, Sheet (vaul), Modal. */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { buzz } from '../lib/haptics'

/** Сегмент-контрол (переключатели табов/типов) с плавным скользящим бегунком. */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  layoutId,
  size = 'md',
  className,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  layoutId?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const autoId = React.useId()
  const activeLayoutId = layoutId || `seg-${autoId}`

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-xl p-0.5 border border-line/40 select-none ${
        size === 'sm' ? 'text-[11px]' : 'text-[13px]'
      } ${className ?? ''}`}
      style={{ background: 'var(--surface-3)' }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              if (!active) {
                buzz(4)
                onChange(o.value)
              }
            }}
            className={`relative rounded-[9px] px-2.5 ${
              size === 'sm' ? 'py-1' : 'py-1.5'
            } font-medium transition-colors select-none outline-none ${
              active ? 'text-text font-semibold' : 'text-faint hover:text-muted'
            }`}
          >
            {active && (
              <motion.span
                layoutId={activeLayoutId}
                className="absolute inset-0 rounded-[9px] shadow-sm"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line-strong)',
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap tnum">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Плоский чистый чип с высокой контрастностью и скруглёнными углами. */
export function Chip({
  color,
  children,
  className,
}: {
  color: 'up' | 'down' | 'warn' | 'accent' | 'neutral'
  children: React.ReactNode
  className?: string
}) {
  const colorMap = {
    up: 'bg-up/10 text-up border-up/20',
    down: 'bg-down/10 text-down border-down/20',
    warn: 'bg-warn/10 text-warn border-warn/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
    neutral: 'bg-surface3 text-muted border-line',
  }
  return (
    <span
      className={`inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold tnum ${colorMap[color]} ${className ?? ''}`}
    >
      {children}
    </span>
  )
}

/** Солидная элегантная кнопка с мягким откликом scale: 0.98 без тяжёлых теней. */
export function TapButton({
  children,
  onClick,
  className,
  disabled,
  haptic = true,
  variant,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  haptic?: boolean
  variant?: 'buy' | 'sell'
  type?: 'button' | 'submit' | 'reset'
}) {
  const variantClass = variant === 'buy'
    ? 'bg-up text-[#062f1d]'
    : variant === 'sell'
      ? 'bg-down text-white'
      : ''

  return (
    <motion.button
      type={type}
      className={`btn-solid relative inline-flex items-center justify-center font-semibold select-none transition-colors disabled:opacity-40 disabled:pointer-events-none ${variantClass} ${className ?? ''}`}
      disabled={disabled}
      onClick={() => {
        if (haptic) buzz(8)
        onClick?.()
      }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
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
    <div className={className ?? ''}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 text-[15px] font-semibold tnum">{children}</div>
    </div>
  )
}

/** Нижний drawer (vaul) с минималистичным хэндлом и плавной пружиной. */
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
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-50 transition-opacity"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            WebkitBackdropFilter: 'blur(12px)',
            backdropFilter: 'blur(12px)',
          }}
        />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-xl flex-col rounded-t-[24px] border-t border-white/[0.08] outline-none"
          style={{
            maxHeight,
            background: 'var(--surface-2)',
            boxShadow: '0 -10px 40px -10px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header & Clean Minimalist Handle */}
          <div
            className="relative flex flex-col items-center pt-3 pb-2 select-none"
            style={{ touchAction: 'none' }}
          >
            <div className="h-1 w-10 rounded-full bg-white/20 transition-colors" />

            {title && (
              <div className="mt-3 w-full px-12 text-center text-[15px] font-semibold text-text tracking-tight truncate">
                {title}
              </div>
            )}

            <button
              type="button"
              className="absolute right-4 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:text-text bg-white/[0.05] active:bg-white/[0.1]"
              onClick={() => onOpenChange(false)}
              aria-label="close"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div
            className="scroll flex-1 px-4"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** Простое модальное окно-состояние (затемнение + карта по центру). */
export function Modal({
  open,
  onOpenChange,
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
          className="fixed inset-0 z-50 flex items-center justify-center p-6 select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => onOpenChange(false)}
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            WebkitBackdropFilter: 'blur(12px)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="w-full max-w-sm rounded-[22px] border border-white/[0.08] p-5 shadow-2xl"
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
