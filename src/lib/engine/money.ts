/** Decimal-конфиг и денежные хелперы движка. */
import Decimal from 'decimal.js'

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_DOWN,
  toExpNeg: -30,
  toExpPos: 40,
})

export const D = (v: Decimal.Value): Decimal => new Decimal(v)
export const ZERO = new Decimal(0)
export const dp8 = (x: Decimal): Decimal => x.toDecimalPlaces(8, Decimal.ROUND_DOWN)

/** Нормализованная денежная строка: всегда 8 знаков после запятой («2» → «2.00000000»). */
export const money8 = (x: Decimal): string => dp8(x).toFixed(8)

/** floor до шага лота (step — строка «0.001») */
export function floorToStep(q: Decimal, step: Decimal): Decimal {
  if (step.isZero()) return dp8(q)
  return dp8(q.div(step).floor().mul(step))
}

/** количество знаков после запятой из строки шага */
export function decimalsOf(step: string): number {
  const i = step.indexOf('.')
  return i < 0 ? 0 : step.length - i - 1
}

/** Целочисленное метаст-Free id */
export function engineUid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
}
