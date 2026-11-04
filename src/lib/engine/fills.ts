/** Мутации счёта: спот покупка/продажа, открытие/закрытие фьючерса, ликвидация.
 *  Все функции чистые: вход snapshot, выход новый snapshot (+Trade). */
import Decimal from 'decimal.js'
import type { AccountSnapshot, FuturesPosition, Side, Trade } from './types'
import { DEFAULT_MIN_NOTIONAL, EngineError } from './types'
import { D, dp8, engineUid, money8 } from './money'

export interface FillContext {
  symbol: string
  market: 'spot' | 'futures'
  side: Side
  kind: Trade['kind']
  qty: string
  price: string
  ts: number
  /** комиссия в % от объёма, например 0.1 */
  feePct: number
  leverage?: number
  /** переопределение минимального объёма ордера (с биржевых фильтров) */
  minNotionalOverride?: string
}

export interface FillOutcome {
  snap: AccountSnapshot
  trade: Trade
}

function pushTrade(snap: AccountSnapshot, trade: Trade): AccountSnapshot {
  let trades = [...snap.trades, trade]
  if (trades.length > 2000) trades = trades.slice(trades.length - 2000)
  return { ...snap, trades }
}

/** Центральный мутатор исполнения. Бросает EngineError при недостатке средств/актива. */
export function applyFill(prev: AccountSnapshot, ctx: FillContext): FillOutcome {
  const qty = D(ctx.qty)
  const price = D(ctx.price)
  if (qty.lte(0)) throw new EngineError('INVALID_QTY')
  if (price.lte(0)) throw new EngineError('INVALID_PRICE')
  if (ctx.feePct < 0 || ctx.feePct > 5) throw new EngineError('INVALID_PRICE')

  const notional = qty.mul(price)
  const fee = notional.mul(D(ctx.feePct).div(100))
  const minNot = D(ctx.minNotionalOverride ?? DEFAULT_MIN_NOTIONAL)
  if (notional.lt(minNot)) throw new EngineError('MIN_NOTIONAL')

  const trade: Trade = {
    id: engineUid('t'),
    ts: ctx.ts,
    symbol: ctx.symbol,
    iSymbol: ctx.symbol,
    market: ctx.market,
    side: ctx.side,
    kind: ctx.kind,
    qty: money8(qty),
    price: money8(price),
    quoteTotal: money8(notional),
    fee: money8(fee),
    leverage: ctx.market === 'futures' ? ctx.leverage : undefined,
  }

  let snap: AccountSnapshot = { ...prev }

  if (ctx.market === 'spot') {
    if (ctx.side === 'buy') {
      const need = notional.add(fee)
      const cash = D(snap.cash)
      if (cash.lt(need)) throw new EngineError('INSUFFICIENT_BALANCE')
      const holdings = { ...snap.holdings }
      const h = holdings[ctx.symbol] ?? { qty: '0', avgPrice: '0' }
      const oldQty = D(h.qty)
      const newQty = oldQty.plus(qty)
      const newAvg = oldQty.mul(D(h.avgPrice)).plus(notional).div(newQty)
      holdings[ctx.symbol] = { qty: dp8(newQty).toString(), avgPrice: dp8(newAvg).toString() }
      snap = { ...snap, cash: money8(cash.minus(need)), holdings }
      return { snap: pushTrade(snap, trade), trade }
    }
    // sell
    const holdings = { ...snap.holdings }
    const h = holdings[ctx.symbol]
    const heldQty = h ? D(h.qty) : D(0)
    if (!h || heldQty.lt(qty)) throw new EngineError('INSUFFICIENT_ASSET')
    const netProceeds = notional.minus(fee)
    const costAvg = D(h.avgPrice)
    const pnl = netProceeds.minus(costAvg.mul(qty))
    const newQty = heldQty.minus(qty)
    if (newQty.lte(D('0.00000001'))) delete holdings[ctx.symbol]
    else holdings[ctx.symbol] = { qty: dp8(newQty).toString(), avgPrice: dp8(costAvg).toString() }
    snap = { ...snap, cash: money8(D(snap.cash).plus(netProceeds)), holdings }
    trade.pnl = money8(pnl)
    return { snap: pushTrade(snap, trade), trade }
  }

  // futures: buy → long, sell → short
  const posSide: 'long' | 'short' = ctx.side === 'buy' ? 'long' : 'short'
  const lev = ctx.leverage && ctx.leverage >= 1 ? ctx.leverage : 1
  const margin = notional.div(lev)
  const need = margin.add(fee)
  const cash = D(snap.cash)
  const existing = snap.positions.find((p) => p.symbol === ctx.symbol && p.side === posSide)

  if (!existing) {
    if (cash.lt(need)) throw new EngineError('INSUFFICIENT_BALANCE')
    const pos: FuturesPosition = {
      id: engineUid('p'),
      symbol: ctx.symbol,
      iSymbol: ctx.symbol,
      side: posSide,
      qty: dp8(qty).toString(),
      entryPrice: dp8(price).toString(),
      leverage: lev,
      margin: dp8(margin).toString(),
      liqPrice: liqPrice(price.toString(), lev, posSide).toString(),
      openedAt: ctx.ts,
    }
    snap = { ...snap, cash: money8(cash.minus(need)), positions: [...snap.positions, pos] }
    return { snap: pushTrade(snap, trade), trade }
  }

  // доливка в существующую позицию
  if (cash.lt(need)) throw new EngineError('INSUFFICIENT_BALANCE')
  const oldNotional = D(existing.qty).mul(D(existing.entryPrice))
  const newQty = D(existing.qty).plus(qty)
  const newEntry = oldNotional.plus(notional).div(newQty)
  const newMargin = D(existing.margin).plus(margin)
  const positions = snap.positions.map((x) =>
    x.id === existing.id
      ? {
          ...x,
          qty: dp8(newQty).toString(),
          entryPrice: dp8(newEntry).toString(),
          margin: dp8(newMargin).toString(),
          liqPrice: liqPrice(newEntry.toString(), lev, existing.side).toString(),
        }
      : x
  )
  snap = { ...snap, cash: money8(cash.minus(need)), positions }
  trade.leverage = lev
  return { snap: pushTrade(snap, trade), trade }
}

/** Цена ликвидации (изолированная маржа, поддерживающая маржа 0.5%).
 *  long: entry * (1 − 1/lev + MMR); short: entry * (1 + 1/lev − MMR). */
export function liqPrice(entry: string | number, leverage: number, side: 'long' | 'short'): string {
  const e = D(entry)
  const lev = Math.max(1, leverage)
  const k = side === 'long' ? 1 - 1 / lev + 0.005 : 1 + 1 / lev - 0.005
  return dp8(e.mul(String(k))).toString()
}

export interface CloseCtx {
  positionId: string
  price: string
  qty?: string
  ts: number
  feePct: number
  kind: Trade['kind']
}

/** Частичное или полное закрытие фьючерса. kind='liquidation' — маржа потеряна. */
export function closeFutures(
  prev: AccountSnapshot,
  ctx: CloseCtx
): { snap: AccountSnapshot; trade: Trade } | null {
  const pos = prev.positions.find((p) => p.id === ctx.positionId)
  if (!pos) return null
  const posQty = D(pos.qty)
  const useQty = ctx.qty ? Decimal.min(D(ctx.qty), posQty) : posQty
  if (useQty.lte(0)) throw new EngineError('INVALID_QTY')
  const price = D(ctx.price)
  if (price.lte(0)) throw new EngineError('INVALID_PRICE')
  const entry = D(pos.entryPrice)
  const dir = pos.side === 'long' ? 1 : -1
  const notional = useQty.mul(price)
  const isLiq = ctx.kind === 'liquidation'
  // ликвидация: маржа потеряна полностью, без комиссий и иных начислений
  const fee = isLiq ? D(0) : notional.mul(D(ctx.feePct).div(100))
  const marginShare = D(pos.margin).mul(useQty.div(posQty))
  const pnlRaw = useQty.mul(price.minus(entry)).mul(dir)
  // изолированная маржа: итог не хуже −маржа
  let pnlNet = isLiq ? marginShare.neg() : pnlRaw.minus(fee)
  if (pnlNet.lt(marginShare.neg())) pnlNet = marginShare.neg()
  const proceeds = marginShare.plus(pnlNet)
  const cashAdd = proceeds.gt(0) ? proceeds : D(0)

  const newQty = posQty.minus(useQty)
  const positions =
    newQty.lte(D('0.00000001'))
      ? prev.positions.filter((p) => p.id !== pos.id)
      : prev.positions.map((p) =>
          p.id === pos.id
            ? {
                ...p,
                qty: dp8(newQty).toString(),
                margin: dp8(D(p.margin).minus(marginShare)).toString(),
              }
            : p
        )
  const trade: Trade = {
    id: engineUid('t'),
    ts: ctx.ts,
    symbol: pos.symbol,
    iSymbol: pos.iSymbol,
    market: 'futures',
    side: pos.side === 'long' ? 'sell' : 'buy',
    kind: ctx.kind,
    qty: money8(useQty),
    price: money8(price),
    quoteTotal: money8(notional),
    fee: money8(fee),
    leverage: pos.leverage,
    pnl: money8(pnlNet),
    note: ctx.kind === 'liquidation' ? 'liquidated' : undefined,
  }
  const orders = prev.orders.filter((o) => o.positionId !== pos.id)
  let trades = [...prev.trades, trade]
  if (trades.length > 2000) trades = trades.slice(trades.length - 2000)
  const snap: AccountSnapshot = {
    ...prev,
    cash: money8(D(prev.cash).plus(cashAdd)),
    positions,
    orders,
    trades,
  }
  return { snap, trade }
}

/** Полное закрытие позиции из UI. */
export function closeFuturesFull(
  prev: AccountSnapshot,
  positionId: string,
  price: string,
  ts: number,
  feePct: number
): { snap: AccountSnapshot; trade: Trade } | null {
  const pos = prev.positions.find((p) => p.id === positionId)
  if (!pos) return null
  return closeFutures(prev, {
    positionId,
    qty: pos.qty,
    price,
    ts,
    feePct,
    kind: 'market',
  })
}

/** Капитал по прайсам: cash + спот + маржа фьючерсов + нереализованный PnL. */
export function computeEquity(
  snap: AccountSnapshot,
  priceOf: (symbol: string) => string | null
): {
  equity: string
  spot: string
  futuresValue: string
  free: string
  upnl: string
} {
  const cash = D(snap.cash)
  let spot = D(0)
  for (const [sym, h] of Object.entries(snap.holdings)) {
    const p = priceOf(sym)
    if (p) spot = spot.add(D(h.qty).mul(D(p)))
  }
  let fut = D(0)
  let upnl = D(0)
  for (const p of snap.positions) {
    const price = priceOf(p.symbol)
    fut = fut.add(D(p.margin))
    if (price) {
      const dir = p.side === 'long' ? 1 : -1
      upnl = upnl.add(D(price).minus(D(p.entryPrice)).mul(dir).mul(D(p.qty)))
    }
  }
  const equity = cash.plus(spot).plus(fut).plus(upnl)
  return {
    equity: money8(equity),
    spot: money8(spot),
    futuresValue: money8(fut),
    free: money8(cash),
    upnl: money8(upnl),
  }
}
