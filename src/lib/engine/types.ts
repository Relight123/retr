/** Типы торгового домена. Все деньги — строки decimal (десятичные строки без экспоненты). */

export type Market = 'spot' | 'futures'
export type Side = 'buy' | 'sell'
export type FutSide = 'long' | 'short'
export type OrderKind = 'limit' | 'stop-loss' | 'take-profit'
export type OrderStatus = 'open' | 'filled' | 'canceled'
export type TradeKind = 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'liquidation'

/** Свеча (структурно совместима с src/api/types.ts Kline). */
export interface Candle {
  time: number
  open: string
  high: string
  low: string
  close: string
}

export interface Order {
  id: string
  symbol: string
  iSymbol: string
  market: Market
  side: Side
  kind: OrderKind
  /** количество в базовой монете (строка decimal) */
  qty: string
  /** порог:.limit — лимитная цена; stop/tp — триггер */
  price: string
  status: OrderStatus
  createdAt: number
  filledAt?: number
  fillPrice?: string
  fee?: string
  pnl?: string
  /** идентификатор OCO-пары (ссылаются друг на друга) */
  ocoId?: string
  /** для фьючерсных закрывающих ордеров: id позиции */
  positionId?: string
  leverage?: number
  note?: string
}

export interface FuturesPosition {
  id: string
  symbol: string
  iSymbol: string
  side: FutSide
  qty: string
  entryPrice: string
  leverage: number
  margin: string
  liqPrice: string
  openedAt: number
}

export interface Trade {
  id: string
  ts: number
  symbol: string
  iSymbol: string
  market: Market
  side: Side
  kind: TradeKind
  qty: string
  price: string
  quoteTotal: string
  fee: string
  leverage?: number
  /** реализованный PnL (для продаж спота и закрытия фьючерсов) */
  pnl?: string
  note?: string
}

export interface DayAnchor {
  /** локальная дата YYYY-MM-DD */
  date: string
  equity: string
}

export interface Holding {
  qty: string
  avgPrice: string
}

export interface AccountSnapshot {
  version: number
  createdAt: number
  /** стартовый депозит (для all-time PnL) */
  startBalance: string
  /** свободные USDT */
  cash: string
  holdings: Record<string, Holding>
  positions: FuturesPosition[]
  orders: Order[]
  trades: Trade[]
  dayAnchor: DayAnchor
}

export type EngineErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_ASSET'
  | 'MIN_NOTIONAL'
  | 'MIN_QTY'
  | 'INVALID_QTY'
  | 'INVALID_PRICE'

export class EngineError extends Error {
  code: EngineErrorCode
  constructor(code: EngineErrorCode) {
    super(code)
    this.code = code
  }
}

export const DEFAULT_MIN_NOTIONAL = '5'
export const MMR = 0.005 // поддерживающая маржа для прогноза ликвидации

export const MAX_TRADES = 4000
