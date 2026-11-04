/** Odometer: цифры «прокручиваются» пружиной; flash зелёным/красным. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Slot {
  ch: string
  oldDigit: number | null
  digit: number | null
  isNew: boolean
}

function align(oldS: string, newS: string): Slot[] {
  const L = newS.length
  const OL = oldS.length
  const n = Math.max(L, OL)
  const out: Slot[] = []
  for (let i = 0; i < n; i++) {
    const ch = L - n + i >= 0 ? newS[L - n + i] : ''
    const old = OL - n + i >= 0 ? oldS[OL - n + i] : ''
    const oldDigit = old !== '' && /\d/.test(old) ? parseInt(old, 10) : null
    const digit = ch !== '' && /\d/.test(ch) ? parseInt(ch, 10) : null
    out.push({ ch, oldDigit, digit, isNew: !old })
  }
  return out
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function Odometer({
  value,
  className,
  flash,
}: {
  value: string
  className?: string
  flash?: boolean
}) {
  const prevRef = useRef('')
  const [flashUp, setFlashUp] = useState<0 | 1 | -1>(0)
  const reduced = useReducedMotion()

  const prev = prevRef.current

  const slots = useMemo(
    () => align(prev, value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  )

  useEffect(() => {
    const prevNum = parseFloat(prevRef.current.replace(/[^0-9.\-]/g, ''))
    const nextNum = parseFloat(value.replace(/[^0-9.\-]/g, ''))
    if (isFinite(prevNum) && isFinite(nextNum) && prevNum !== nextNum && flash) {
      setFlashUp(nextNum > prevNum ? 1 : -1)
    }
    prevRef.current = value
  }, [value, flash])

  useEffect(() => {
    if (flashUp !== 0) {
      const id = window.setTimeout(() => setFlashUp(0), 550)
      return () => window.clearTimeout(id)
    }
  }, [flashUp])

  return (
    <span className={`od tnum relative ${className ?? ''}`} style={{ overflow: 'visible' }}>
      {slots.map((s, i) => {
        const key = `${i}-${s.ch === '' ? 'empty' : s.ch}`
        if (!reduced && s.digit !== null && s.oldDigit !== null && !s.isNew) {
          return (
            <span key={i} className="od-col">
              <motion.span
                className="block"
                initial={false}
                animate={{ y: `${-s.digit}em` }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              >
                {DIGITS.map((d) => (
                  <span key={d} className="od-digit">
                    {d}
                  </span>
                ))}
              </motion.span>
            </span>
          )
        }
        return (
          <motion.span
            key={key}
            className={`od-char ${s.ch === '' ? 'opacity-0' : ''}`}
            initial={
              s.isNew && !reduced
                ? { opacity: 0, transform: 'translateY(0.18em)' }
                : false
            }
            animate={{ opacity: s.ch === '' ? 0 : 1, transform: 'translateY(0em)' }}
            transition={{ duration: 0.18 }}
          >
            {s.ch}
          </motion.span>
        )
      })}
      {flash && (
        <motion.span
          key={`${flashUp}`}
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{
            background: flashUp === 1 ? 'var(--up)' : 'var(--down)',
            opacity: 0,
          }}
          initial={false}
          animate={{ opacity: flashUp !== 0 ? 0.16 : 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      )}
    </span>
  )
}

/** Пустое место-заглушка для равной высотыOd. */
export function OdometerSkeleton({ width = '6ch', className }: { width?: string; className?: string }) {
  return <span className={`skel tnum inline-block ${className ?? ''}`} style={{ width, height: '1em' }} />
}
