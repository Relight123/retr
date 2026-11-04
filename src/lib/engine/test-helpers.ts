/** Хелперы для тестов движка. */
import { D } from './money'
import { vwapFromDepth } from './execution'
import { applyFill, closeFutures, closeFuturesFull, computeEquity, liqPrice } from './fills'
import { catchUp, evalOrderCandle, evalLiquidation } from './checks'
import { computeStats } from './stats'
import type { AccountSnapshot, Candle, Order, Trade } from './types'
import { dayKey } from './daykey'

export { D, vwapFromDepth, applyFill, closeFutures, closeFuturesFull, computeEquity, liqPrice, catchUp, evalOrderCandle, evalLiquidation, computeStats }

export function initialAccount(balance: string): AccountSnapshot {
  return {
    version: 1,
    createdAt: Date.now(),
    startBalance: balance,
    cash: balance,
    holdings: {},
    positions: [],
    orders: [],
    trades: [],
    dayAnchor: { date: dayKey(Date.now()), equity: balance },
  }
}

export interface OrderFixture {
  kind: Order['kind']
  side: Order['side']
  price: string
  qty?: string
  createdAt?: number
  market?: Order['market']
}

export function makeOrder(f: OrderFixture): Order {
  return {
    id: `o${Math.random().toString(36).slice(2, 8)}`,
    symbol: 'BTCUSDT',
    iSymbol: 'BTCUSDT',
    market: f.market ?? 'spot',
    side: f.side,
    kind: f.kind,
    qty: f.qty ?? '1',
    price: f.price,
    status: 'open',
    createdAt: f.createdAt ?? 0,
  }
}

export function candle(t: number, o: string, h: string, l: string, c: string): Candle {
  return { time: t, open: o, high: h, low: l, close: c }
}

export type { AccountSnapshot, Candle, Order, Trade }
