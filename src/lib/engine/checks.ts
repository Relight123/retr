/** Проверка триггеров ордеров/ликвидаций по свечам: единая логика live и backfill.
 *  Правило: ордер может сработать на свече, время открытия которой >= createdAt
 *  (гранулярность 1m — допущение, см. README). */
import Decimal from 'decimal.js'
import type { AccountSnapshot, Candle, Order, Trade } from './types'
import { D, dp8, money8 } from './money'
import { applyFill, closeFutures } from './fills'

export interface HitResult {
  hit: boolean
  /** цена исполнения (со слиппеджем для стопов/TP) */
  fillPrice: string
}

/** Слиппедж при исполнении стоп/TP (0.05%). */
export const TRIGGER_SLIP = 0.0005

type OrderLike = Pick<Order, 'kind' | 'side' | 'price'>

export function evalOrderCandle(order: OrderLike, c: Candle): HitResult {
  const price = D(order.price)
  const open = D(c.open)
  const low = D(c.low)
  const high = D(c.high)
  // Цена, из которой исполнение не может быть хуже: при гэпе в пользу трейдера — open.
  switch (order.kind) {
    case 'limit': {
      if (order.side === 'buy') {
        if (low.lte(price)) return { hit: true, fillPrice: money8(Decimal.min(price, open)) }
      } else if (high.gte(price)) {
        return { hit: true, fillPrice: money8(Decimal.max(price, open)) }
      }
      break
    }
    case 'stop-loss': {
      if (order.side === 'sell') {
        if (low.lte(price)) {
          const px = Decimal.min(price, open).mul(1 - TRIGGER_SLIP)
          return { hit: true, fillPrice: money8(px) }
        }
      } else if (high.gte(price)) {
        const px = Decimal.max(price, open).mul(1 + TRIGGER_SLIP)
        return { hit: true, fillPrice: money8(px) }
      }
      break
    }
    case 'take-profit': {
      if (order.side === 'sell') {
        if (high.gte(price)) {
          const px = Decimal.max(price, open).mul(1 - TRIGGER_SLIP)
          return { hit: true, fillPrice: money8(px) }
        }
      } else if (low.lte(price)) {
        const px = Decimal.min(price, open).mul(1 + TRIGGER_SLIP)
        return { hit: true, fillPrice: money8(px) }
      }
      break
    }
  }
  return { hit: false, fillPrice: '0' }
}

/** Ликвидация изолированной позиции по диапазону свечи. */
export function evalLiquidation(
  pos: { side: 'long' | 'short'; liqPrice: string },
  c: Candle
): boolean {
  const liq = D(pos.liqPrice)
  return pos.side === 'long' ? D(c.low).lte(liq) : D(c.high).gte(liq)
}

/** Символы, для которых нужны свечи: открытые ордера + позиции. */
export function symbolsNeedingCandles(snap: AccountSnapshot): string[] {
  const set = new Set<string>()
  for (const o of snap.orders) if (o.status === 'open') set.add(o.symbol)
  for (const p of snap.positions) set.add(p.symbol)
  return [...set]
}

export interface CatchUpEvents {
  onOrderFilled?: (order: Order, trade: Trade) => void
  onOrderCanceled?: (order: Order, reason: string) => void
  onPositionClosed?: (trade: Trade) => void
}

interface WOrder {
  o: Order
  done: boolean
}

/** Догоняет исполнение по свечам 1m (создание ордера → «сейчас»).
 *  Чистая функция: вход не мутируется, возвращается новый snapshot. */
export function catchUp(
  prev: AccountSnapshot,
  candlesBySymbol: Record<string, Candle[]>,
  now: number,
  feePct: number,
  events?: CatchUpEvents
): AccountSnapshot {
  let snap: AccountSnapshot = {
    ...prev,
    orders: prev.orders.map((o) => ({ ...o })),
  }
  const workOrders = snap.orders
    .filter((o) => o.status === 'open')
    .map((o) => ({ o, done: false }) as WOrder)

  // 1) ликвидации позиций
  for (const pos of [...prev.positions]) {
    const cs = candlesBySymbol[pos.symbol]
    if (!cs || cs.length === 0) continue
    for (const c of cs) {
      if (c.time < pos.openedAt) continue
      if (!evalLiquidation(pos, c)) continue
      const res = closeFutures(snap, {
        positionId: pos.id,
        price: pos.liqPrice,
        ts: c.time,
        feePct,
        kind: 'liquidation',
      })
      if (res) {
        snap = res.snap
        events?.onPositionClosed?.(res.trade)
      }
      break
    }
  }

  // 2) ордера
  for (const w of workOrders) {
    if (w.o.status !== 'open') continue // OCO: сиблимнг уже отменён
    const cs = candlesBySymbol[w.o.symbol]
    if (!cs || cs.length === 0) continue
    let idx = cs.findIndex((c) => c.time >= w.o.createdAt)
    if (idx < 0) continue
    for (; idx < cs.length && cs[idx].time <= now; idx++) {
      const c = cs[idx]
      const hit = evalOrderCandle(w.o, c)
      if (!hit.hit) continue
      const ts = c.time
      const fill = hit.fillPrice
      try {
        if (w.o.market === 'futures' && w.o.positionId) {
          const res = closeFutures(snap, {
            positionId: w.o.positionId,
            price: fill,
            qty: w.o.qty,
            ts,
            feePct,
            kind: w.o.kind,
          })
          if (!res) {
            w.done = true
            w.o.status = 'canceled'
            w.o.note = 'position-not-found'
            events?.onOrderCanceled?.(w.o, 'position-not-found')
            cancelOcoSibling(snap, w.o, events)
            break
          }
          snap = res.snap
          markFilled(w.o, fill, ts, feePct)
          events?.onOrderFilled?.(w.o, res.trade)
        } else {
          const res = applyFill(snap, {
            symbol: w.o.symbol,
            market: w.o.market,
            side: w.o.side,
            kind: w.o.kind,
            qty: w.o.qty,
            price: fill,
            ts,
            feePct,
            leverage: leverageFor(w.o),
          })
          snap = res.snap
          markFilled(w.o, fill, ts, feePct)
          events?.onOrderFilled?.(w.o, res.trade)
        }
        cancelOcoSibling(snap, w.o, events)
        break
      } catch (err) {
        w.done = true
        w.o.status = 'canceled'
        w.o.note = (err as { code?: string })?.code ?? 'error'
        events?.onOrderCanceled?.(w.o, w.o.note)
        cancelOcoSibling(snap, w.o, events)
        break
      }
    }
  }

  return snap
}

function markFilled(o: Order, price: string, ts: number, feePct: number): void {
  o.status = 'filled'
  o.filledAt = ts
  o.fillPrice = money8(D(price))
  o.fee = money8(D(o.qty).mul(D(price)).mul(D(feePct).div(100)))
}

function cancelOcoSibling(snap: AccountSnapshot, o: Order, events?: CatchUpEvents): void {
  if (!o.ocoId) return
  for (const s of snap.orders) {
    if (s.ocoId === o.ocoId && s.id !== o.id && s.status === 'open') {
      s.status = 'canceled'
      s.note = 'oco-canceled'
      events?.onOrderCanceled?.(s, 'oco-canceled')
    }
  }
}

function leverageFor(o: Order): number | undefined {
  return o.leverage
}
