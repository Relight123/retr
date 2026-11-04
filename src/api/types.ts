/** Общие типы слоя данных (адаптер провайдера). */

export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
export const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d']

export interface Ticker {
  symbol: string
  last: string
  changePct24h: number
  quoteVolume24h: string
  high24h?: string
  low24h?: string
}

export interface Kline {
  /** время открытия в ms */
  time: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export interface Depth {
  /** [price, qty] по убыванию цены (лучшие сверху) */
  bids: [string, string][]
  /** [price, qty] по возрастанию цены (лучшие сверху) */
  asks: [string, string][]
}

/** Одна сделка с биржи (агрессор определён по стороне). */
export interface TradeTick {
  price: string
  qty: string
  ts: number
  /** true — агрессор продавец (сделка «в красную») */
  sell: boolean
}

export interface SymbolFilters {
  tickSize: string
  stepSize: string
  minNotional: string
}

export type ConnState = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'failed'

export interface ProviderStatus {
  id: string
  state: ConnState
}

export interface KlinesReq {
  symbol: string
  interval: Interval
  limit?: number
  /** ms; если задан — догружаем странично до «сейчас», максимум MAX_KLINE_CANDLES */
  startTime?: number
}

/** Интерфейс, позволяющий заменить источник данных. */
export interface DataProvider {
  id: string
  label: string
  fetchTickers(): Promise<Ticker[]>
  fetchKlines(req: KlinesReq): Promise<Kline[]>
  fetchDepth(symbol: string): Promise<Depth>
  fetchFilters?(symbol: string[]): Promise<Map<string, SymbolFilters>>
  subscribeTickers(
    symbols: string[],
    onTicker: (t: Ticker) => void,
    onState: (s: ConnState) => void
  ): () => void
  subscribeKline(
    symbol: string,
    interval: Interval,
    onKline: (k: Kline) => void,
    onState: (s: ConnState) => void
  ): () => void
  subscribeDepth(
    symbol: string,
    onDepth: (d: Depth) => void,
    onState: (s: ConnState) => void
  ): () => void
  /** Лента сделок; опционально — фолбэк-провайдер может не поддерживать. */
  subscribeTrades?(
    symbol: string,
    onTrade: (t: TradeTick) => void,
    onState: (s: ConnState) => void
  ): () => void
}
