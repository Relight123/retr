/** Реалистичное исполнение Market-ордера: VWAP по стакану (проскальзывание). */
import Decimal from 'decimal.js'
import type { Side } from './types'
import { D, dp8 } from './money'

export interface DepthLike {
  bids: [string, string][]
  asks: [string, string][]
}

export interface ExecResult {
  /** средняя цена исполнения */
  avgPrice: string
  notional: string
  /** true — объёма стака не хватило, хвост взят «виртуально» */
  depleted: boolean
  slippagePct: string
}

/** Спред-примерка без стакана */
export const FALLBACK_SPREAD = 0.0005
/** Штрафной множитель за «пустой» конец книги */
export const BOOK_PENALTY = 1.05

export function vwapFromDepth(
  depth: DepthLike | null,
  side: Side,
  qty: string,
  lastPrice: string
): ExecResult {
  const q = D(qty)
  const last = D(lastPrice)
  if (depth === null || q.lte(0)) {
    const px = side === 'buy' ? last.mul(1 + FALLBACK_SPREAD) : last.mul(1 - FALLBACK_SPREAD)
    return {
      avgPrice: dp8(px).toFixed(8),
      notional: dp8(q.mul(px)).toFixed(8),
      depleted: false,
      slippagePct: dp8(D(FALLBACK_SPREAD).mul(100)).toFixed(8),
    }
  }
  const levels = side === 'buy' ? depth.asks : depth.bids
  let remaining = q
  let cost = D(0)
  let depleted = false
  if (levels.length === 0) {
    const px = side === 'buy' ? last.mul(1 + FALLBACK_SPREAD) : last.mul(1 - FALLBACK_SPREAD)
    return {
      avgPrice: dp8(px).toFixed(8),
      notional: dp8(q.mul(px)).toFixed(8),
      depleted: false,
      slippagePct: dp8(D(FALLBACK_SPREAD).mul(100)).toFixed(8),
    }
  }
  for (const [p, v] of levels) {
    if (remaining.lte(0)) break
    const take = Decimal.min(remaining, D(v))
    cost = cost.add(D(p).mul(take))
    remaining = remaining.minus(take)
  }
  if (remaining.gt(0)) {
    depleted = true
    const worst = D(levels[levels.length - 1][0])
    const px = side === 'buy' ? worst.mul(BOOK_PENALTY) : worst.div(BOOK_PENALTY)
    cost = cost.add(px.mul(remaining))
  }
  const avg = q.gt(0) ? cost.div(q) : D(levels[0][0])
  const slip = last.gt(0) ? avg.minus(last).abs().div(last) : D(0)
  return {
    avgPrice: dp8(avg).toFixed(8),
    notional: dp8(q.mul(avg)).toFixed(8),
    depleted,
    slippagePct: dp8(slip.mul(100)).toFixed(8),
  }
}
