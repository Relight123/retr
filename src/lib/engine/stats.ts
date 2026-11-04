/** Статистика торговли: winrate, PF, просадка, кривая капитала. Чистые функции. */
import type { AccountSnapshot, Trade } from './types'

export interface EquityPoint {
  t: number
  v: number
}

export interface TradeStats {
  count: number
  wins: number
  losses: number
  winratePct: number
  avgWin: number
  avgLoss: number
  profitFactor: number | null
  best: { pnl: number; trade: Trade } | null
  worst: { pnl: number; trade: Trade } | null
  totalPnl: number
  maxDrawdownPct: number
}

export function realizedTrades(trades: Trade[]): Trade[] {
  return trades
    .filter((t) => t.pnl !== undefined && t.pnl !== null && isFinite(parseFloat(t.pnl)))
}

/** Кривая капитала: кумулятивный реализованный PnL к балансу. */
export function equityCurve(
  trades: Trade[],
  startBalance: string,
  endEquity?: string
): EquityPoint[] {
  const sorted = [...realizedTrades(trades)].sort((a, b) => a.ts - b.ts)
  let acc = parseFloat(startBalance) || 0
  const pts: EquityPoint[] = [{ t: sorted[0]?.ts ?? Date.now(), v: acc }]
  for (const t of sorted) {
    acc += parseFloat(t.pnl as string)
    pts.push({ t: t.ts, v: round2(acc) })
  }
  if (pts.length === 1 && endEquity) pts[0].v = round2(parseFloat(endEquity))
  return pts
}

export function computeStats(trades: Trade[], startBalance: string): TradeStats {
  const closed = realizedTrades(trades)
  const wins: number[] = []
  const losses: number[] = []
  let best: { pnl: number; trade: Trade } | null = null
  let worst: { pnl: number; trade: Trade } | null = null
  let totalPnl = 0
  for (const t of closed) {
    const pnl = parseFloat(t.pnl as string)
    if (!isFinite(pnl)) continue
    totalPnl += pnl
    if (pnl >= 0) wins.push(pnl)
    else losses.push(pnl)
    if (!best || pnl > best.pnl) best = { pnl, trade: t }
    if (!worst || pnl < worst.pnl) worst = { pnl, trade: t }
  }
  const sumWin = wins.reduce((s, v) => s + v, 0)
  const sumLoss = losses.reduce((s, v) => s + v, 0)
  const pf = sumLoss !== 0 ? sumWin / Math.abs(sumLoss) : null
  // просадка по кривой капитала
  const curve = equityCurve(trades, startBalance)
  let peak = curve[0]?.v ?? 0
  let mdd = 0
  for (const p of curve) {
    if (p.v > peak) peak = p.v
    if (peak > 0) {
      const dd = ((peak - p.v) / peak) * 100
      if (dd > mdd) mdd = dd
    }
  }
  return {
    count: closed.length,
    wins: wins.length,
    losses: losses.length,
    winratePct: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    avgWin: wins.length > 0 ? sumWin / wins.length : 0,
    avgLoss: losses.length > 0 ? sumLoss / losses.length : 0,
    profitFactor: pf && isFinite(pf) ? pf : null,
    best,
    worst,
    totalPnl: round2(totalPnl),
    maxDrawdownPct: round2(mdd),
  }
}

/** PnL за сегодня (локальная дата по t). */
export function pnlSince(trades: Trade[], sinceTs: number): number {
  return round2(
    realizedTrades(trades)
      .filter((t) => t.ts >= sinceTs)
      .reduce((s, t) => s + parseFloat(t.pnl as string), 0)
  )
}

export function allTimePnl(snap: AccountSnapshot): number {
  return round2(
    realizedTrades(snap.trades).reduce((s, t) => s + parseFloat(t.pnl as string), 0)
  )
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
