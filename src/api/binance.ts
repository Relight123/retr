/** Провайдер Binance (основной): REST v3 + комбинированный WS. */
import type {
  ConnState,
  DataProvider,
  Depth,
  Interval,
  Kline,
  KlinesReq,
  SymbolFilters,
  Ticker,
} from './types'
import { ReconnectingWs, fetchJson } from './ws'

/** Основной REST + официальное публичное зеркало data-api.binance.vision:
 *  в ряде регионов основной домен отвечает 451 без CORS-заголовков. */
const REST_BASES = ['https://api.binance.com', 'https://data-api.binance.vision'] as const
let restIdx = 0

/** Комбинированный WS и его зеркало (тот же набор потоков). */
const WS_URLS = [
  'wss://stream.binance.com:9443/stream?streams=',
  'wss://data-stream.binance.vision/stream?streams=',
] as const

/** REST c фейлoвером по базам: ошибка сети/451/403/429/5xx → следующая база,
 *  сработавшая база «приклеивается» для последующих вызовов. */
async function apiJson<T>(path: string, timeoutMs?: number): Promise<T> {
  let firstErr: unknown = null
  for (let i = 0; i < REST_BASES.length; i++) {
    const idx = (restIdx + i) % REST_BASES.length
    try {
      const res = await fetchJson<T>(REST_BASES[idx] + path, timeoutMs)
      restIdx = idx
      return res
    } catch (e) {
      firstErr ??= e
    }
  }
  throw firstErr
}

export const INTERVAL_MS: Record<Interval, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
}

export const MAX_KLINE_CANDLES = 6000

/** Стаблкоины, невключённые в топ-список. */
const STABLES = new Set([
  'BUSD', 'FDUSD', 'USDC', 'TUSD', 'DAI', 'USDP', 'AEUR', 'USDD', 'GUSD', 'EUR', 'EURI', 'USDS',
])

interface RawTicker24 {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume: string
  highPrice: string
  lowPrice: string
}

interface RawKline extends Array<string | number> {
  0: number // open time
  1: string // open
  2: string // high
  3: string // low
  4: string // close
  5: string // volume
}

interface RawExchangeInfo {
  symbols: Array<{
    symbol: string
    status: string
    filters: Array<{ filterType: string; [k: string]: string }>
  }>
}

/** ─────────── REST ─────────── */

export async function binanceTickers(): Promise<Ticker[]> {
  const raw = await apiJson<RawTicker24[]>(`/api/v3/ticker/24hr`, 9000)
  return raw
    .filter(
      (t) =>
        t.symbol.endsWith('USDT') &&
        !STABLES.has(t.symbol.slice(0, -4)) &&
        parseFloat(t.quoteVolume) > 0
    )
    .map((t) => {
      const changePct24h = parseFloat(t.priceChangePercent)
      return {
        symbol: t.symbol,
        last: t.lastPrice,
        changePct24h: isFinite(changePct24h) ? changePct24h : 0,
        quoteVolume24h: t.quoteVolume,
        high24h: t.highPrice,
        low24h: t.lowPrice,
      } satisfies Ticker
    })
    .sort((a, b) => parseFloat(b.quoteVolume24h) - parseFloat(a.quoteVolume24h))
    .slice(0, 120)
}

export async function binanceKlines(req: KlinesReq): Promise<Kline[]> {
  const limit = req.limit ?? 500
  if (req.startTime === undefined) {
    const raw = await apiJson<RawKline[]>(
      `/api/v3/klines?symbol=${req.symbol}&interval=${req.interval}&limit=${limit}`
    )
    return raw.map(mapKline)
  }
  // страничная догрузка для backfill
  const stepMs = INTERVAL_MS[req.interval]
  let cursor = req.startTime
  const out: Kline[] = []
  while (out.length < MAX_KLINE_CANDLES) {
    const batch = await apiJson<RawKline[]>(
      `/api/v3/klines?symbol=${req.symbol}&interval=${req.interval}&startTime=${cursor}&limit=1000`
    )
    if (batch.length === 0) break
    for (const k of batch) out.push(mapKline(k))
    const lastTime = (rawOpenTime(batch[batch.length - 1]) as number) ?? 0
    if (batch.length < 1000) break
    cursor = lastTime + stepMs
    if (cursor > Date.now() + stepMs) break
  }
  // убрать дубликаты
  const seen = new Set<number>()
  return out.filter((k) => (seen.has(k.time) ? false : (seen.add(k.time), true)))
}

function rawOpenTime(k: RawKline): number {
  return k[0] as number
}

function mapKline(k: RawKline): Kline {
  return {
    time: k[0] as number,
    open: String(k[1]),
    high: String(k[2]),
    low: String(k[3]),
    close: String(k[4]),
    volume: String(k[5]),
  }
}

export async function binanceDepth(symbol: string): Promise<Depth> {
  const d = await apiJson<{ bids: [string, string][]; asks: [string, string][] }>(
    `/api/v3/depth?symbol=${symbol}&limit=20`
  )
  return { bids: d.bids, asks: d.asks }
}

const FILTER_TTL = 12 * 60 * 60_000
let filtersCache: { at: number; map: Map<string, SymbolFilters> } | null = null

export async function binanceFilters(symbols: string[]): Promise<Map<string, SymbolFilters>> {
  if (filtersCache && Date.now() - filtersCache.at < FILTER_TTL) return filtersCache.map
  const map = new Map<string, SymbolFilters>()
  for (let i = 0; i < symbols.length; i += 80) {
    const part = symbols.slice(i, i + 80)
    const arg = encodeURIComponent(JSON.stringify(part))
    const info = await apiJson<RawExchangeInfo>(`/api/v3/exchangeInfo?symbols=${arg}`)
    for (const s of info.symbols) {
      const lot = s.filters.find((f) => f.filterType === 'LOT_SIZE')
      const price = s.filters.find((f) => f.filterType === 'PRICE_FILTER')
      const notional = s.filters.find((f) => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL')
      map.set(s.symbol, {
        stepSize: lot?.stepSize ?? '0.00001',
        tickSize: price?.tickSize ?? '0.000001',
        minNotional: notional?.minNotional ?? '5',
      })
    }
  }
  filtersCache = { at: Date.now(), map }
  return map
}

/** ─────────── WebSocket ─────────── */

interface WsSub {
  count: number
  handler: (raw: object) => void
}

class BinanceStreams {
  private ws: ReconnectingWs | null = null
  private subs = new Map<string, WsSub>()
  private pending: string[] = []
  private unpending: string[] = []
  private flushTimer: number | null = null
  private users = 0
  private stateUsers = new Set<(s: ConnState) => void>()
  private state: ConnState = 'connecting'
  /** неудачные попытки сокета → чёт/нёчёт выбирает базу WS_URLS (фейлoвер) */
  private wsFails = 0

  setUserCount(delta: number): void {
    this.users += delta
    if (this.users <= 0) this.destroy()
  }

  onState(fn: (s: ConnState) => void): () => void {
    this.stateUsers.add(fn)
    fn(this.state)
    return () => this.stateUsers.delete(fn)
  }

  private setState(s: ConnState): void {
    this.state = s
    this.stateUsers.forEach((fn) => fn(s))
  }

  private ensureWs(): void {
    if (this.ws) return
    this.setState('connecting')
    this.ws = new ReconnectingWs({
      url: () =>
        WS_URLS[this.wsFails % WS_URLS.length] + [...this.subs.keys()].map(lowerCaseStream).join('/'),
      // miniticker давит ~1 раз/с; тишина 45с означает half-dead сокет → рвём и переподключаемся
      noDataWatchdogMs: 45_000,
      onOpen: (ws) => {
        this.setState('live')
        const all = [...this.subs.keys()]
        if (all.length > 0) {
          ws.send(JSON.stringify({ method: 'SET_PROPERTY', params: ['combined', true] }))
          ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: all.map(lowerCaseStream), id: 1 }))
        }
      },
      onMessage: (raw) => {
        const msg = JSON.parse(raw) as { stream?: string; data?: object }
        if (!msg.stream || !msg.data) return
        const sub = findSub(this.subs, msg.stream)
        if (sub) sub.handler(msg.data)
      },
      onStatus: (s) => {
        if (s === 'reconnecting') {
          // каждая неудача переключает базу: основной WS ↔ зеркало data-stream.binance.vision
          this.wsFails++
          this.setState('reconnecting')
        }
      },
    })
    this.ws.connect()
  }

  subscribe(streamId: string, handler: (raw: object) => void): () => void {
    const existing = this.subs.get(streamId)
    if (existing) {
      existing.count++
      return () => {
        existing.count--
          if (existing.count <= 0) this.unsubscribe(streamId)
      }
    }
    this.subs.set(streamId, { count: 1, handler })
    this.pending.push(streamId)
    this.ensureWs()
    this.schedule()
    return () => {
      const s = this.subs.get(streamId)
      if (!s) return
      s.count--
      if (s.count <= 0) this.unsubscribe(streamId)
    }
  }

  private unsubscribe(streamId: string): void {
    if (this.subs.delete(streamId) && this.ws) this.unpending.push(streamId)
    this.schedule()
  }

  private schedule(): void {
    if (this.flushTimer !== null) return
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null
      if (!this.ws) return // pending не чистим: уйдёт при следующей подписке/reconnect
      const sub = [...new Set(this.pending)]
      const unsub = [...new Set(this.unpending)]
      this.pending = []
      this.unpending = []
      if (sub.length > 0)
        this.ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: sub.map(lowerCaseStream), id: Date.now() }))
      if (unsub.length > 0)
        this.ws.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: unsub.map(lowerCaseStream), id: Date.now() }))
    }, 250)
  }

  destroy(): void {
    this.ws?.destroy()
    this.ws = null
    this.subs.clear()
    this.setState('offline')
  }
}

function lowerCaseStream(s: string): string {
  return s.toLowerCase()
}

/** Соотносим поток с подпиской: 'btcusdt@miniTicker' → найти sub 'BTCUSDT@miniTicker'. */
function findSub(subs: Map<string, WsSub>, stream: string): WsSub | undefined {
  const upperSym = stream.slice(0, stream.indexOf('@')).toUpperCase()
  const tail = stream.slice(stream.indexOf('@'))
  return subs.get(upperSym + tail)
}

const streams = new BinanceStreams()
export const binanceStreams = streams

function parseMiniTicker(d: object): Ticker {
  const m = d as { s: string; c: string; o: string; h: string; l: string; q: string }
  const o = parseFloat(m.o)
  const c = parseFloat(m.c)
  const pct = isFinite(o) && o > 0 ? ((c - o) / o) * 100 : 0
  return {
    symbol: m.s,
    last: m.c,
    changePct24h: pct,
    quoteVolume24h: m.q,
    high24h: m.h,
    low24h: m.l,
  }
}

export const binanceProvider: DataProvider = {
  id: 'binance',
  label: 'Binance (public)',
  fetchTickers: binanceTickers,
  fetchKlines: binanceKlines,
  fetchDepth: binanceDepth,
  fetchFilters: binanceFilters,
  subscribeTickers(symbols, onTicker, onState) {
    const offState = streams.onState(onState)
    const offs = symbols.map((s) =>
      streams.subscribe(`${s}@miniTicker`, (d) => onTicker(parseMiniTicker(d)))
    )
    streams.setUserCount(symbols.length)
    return () => {
      offState()
      offs.forEach((f) => f())
      streams.setUserCount(-symbols.length)
    }
  },
  subscribeKline(symbol, interval, onKline, onState) {
    const offState = streams.onState(onState)
    const off = streams.subscribe(
      `${symbol}@kline_${interval}`,
      (d) => {
        const k = (d as { k?: { t: number; o: string; h: string; l: string; c: string; v: string } }).k
        if (!k) return
        onKline({
          time: Number(k.t),
          open: String(k.o),
          high: String(k.h),
          low: String(k.l),
          close: String(k.c),
          volume: String(k.v),
        })
      }
    )
    streams.setUserCount(1)
    return () => {
      offState()
      off()
      streams.setUserCount(-1)
    }
  },
  subscribeDepth(symbol, onDepth, onState) {
    const offState = streams.onState(onState)
    let lastSent = 0
    const off = streams.subscribe(`${symbol}@depth10@1000ms`, (d) => {
      const m = d as { bids: [string, string][]; asks: [string, string][] }
      if (!m.bids || !m.asks) return
      const now = Date.now()
      if (now - lastSent < 400) return // троттлинг стакана ~2.5 Гц
      lastSent = now
      onDepth({ bids: m.bids.slice(0, 10), asks: m.asks.slice(0, 10) })
    })
    streams.setUserCount(1)
    return () => {
      offState()
      off()
      streams.setUserCount(-1)
    }
  },
  /** Лента сделок (aggTrade): m=true — агрессор продавец. */
  subscribeTrades(symbol, onTrade, onState) {
    const offState = streams.onState(onState)
    const off = streams.subscribe(`${symbol}@aggTrade`, (d) => {
      const w = d as { p: string; q: string; T: number; m: boolean }
      const price = String(w.p)
      if (!price || price === 'undefined') return
      onTrade({ price, qty: String(w.q), ts: Number(w.T) || Date.now(), sell: !!w.m })
    })
    streams.setUserCount(1)
    return () => {
      offState()
      off()
      streams.setUserCount(-1)
    }
  },
}
