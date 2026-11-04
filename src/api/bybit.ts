/** Запасной провайдер Bybit v5 (public). REST + WS (kline/tickers), стакан — REST-поллинг. */
import type {
  ConnState,
  DataProvider,
  Depth,
  Interval,
  Kline,
  KlinesReq,
  Ticker,
} from './types'
import { ReconnectingWs, fetchJson, withTimeout } from './ws'
import { MAX_KLINE_CANDLES, INTERVAL_MS } from './binance'

/** Основной домен + официальный альтернативный endpoint api.bytick.com
 *  (обходит часть блоков/челленджей на основном хосте). */
const RESTS = ['https://api.bybit.com/v5/market', 'https://api.bytick.com/v5/market'] as const
let restIdx = 0

/** REST c фейлoвером по базам: ошибка сети/403/5xx → следующая база. */
async function apiJson<T>(path: string, timeoutMs?: number): Promise<T> {
  let firstErr: unknown = null
  for (let i = 0; i < RESTS.length; i++) {
    const idx = (restIdx + i) % RESTS.length
    try {
      const res = await fetchJson<T>(RESTS[idx] + path, timeoutMs)
      restIdx = idx
      return res
    } catch (e) {
      firstErr ??= e
    }
  }
  throw firstErr
}
const WS_URL = 'wss://stream.bybit.com/v5/public/spot'

const STABLES = new Set(['USDC', 'DAI', 'TUSD', 'FDUSD', 'EUR', 'EURI'])

const INTERVAL_BYBIT: Record<Interval, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
}

interface RawTickersV5 {
  result: {
    list: Array<{
      symbol: string
      lastPrice: string
      price24hPcnt: string
      turnover24h: string
      highPrice24h: string
      lowPrice24h: string
    }>
  }
}

interface RawKlineV5 {
  result: { list: string[][] }
}

interface RawDepthV5 {
  result: { b: [string, string][]; s: [string, string][] }
}

export async function bybitTickers(): Promise<Ticker[]> {
  const raw = await apiJson<RawTickersV5>(`/tickers?category=spot`, 9000)
  return (raw.result?.list ?? [])
    .filter(
      (t) =>
        t.symbol.endsWith('USDT') &&
        !STABLES.has(t.symbol.slice(0, -4)) &&
        parseFloat(t.turnover24h) > 0
    )
    .map(
      (t): Ticker => ({
        symbol: t.symbol,
        last: t.lastPrice,
        changePct24h: (parseFloat(t.price24hPcnt) || 0) * 100,
        quoteVolume24h: t.turnover24h,
        high24h: t.highPrice24h,
        low24h: t.lowPrice24h,
      })
    )
    .sort((a, b) => parseFloat(b.quoteVolume24h) - parseFloat(a.quoteVolume24h))
    .slice(0, 120)
}

export async function bybitKlines(req: KlinesReq): Promise<Kline[]> {
  const limit = Math.min(1000, req.limit ?? 500)
  const iv = INTERVAL_BYBIT[req.interval]
  if (req.startTime === undefined) {
    const raw = await apiJson<RawKlineV5>(
      `/kline?category=spot&symbol=${req.symbol}&interval=${iv}&limit=${limit}`
    )
    return (raw.result?.list ?? []).map(mapRaw).reverse()
  }
  const stepMs = INTERVAL_MS[req.interval]
  let cursor = req.startTime
  const out: Kline[] = []
  while (out.length < MAX_KLINE_CANDLES) {
    const raw = await apiJson<RawKlineV5>(
      `/kline?category=spot&symbol=${req.symbol}&interval=${iv}&start=${cursor}&limit=1000`
    )
    const batch = raw.result?.list ?? []
    if (batch.length === 0) break
    for (const r of batch) out.push(mapRaw(r))
    if (batch.length < 1000) break
    const lastOpen = Number(batch[0][0]) // list приходит по убыванию времени
    cursor = lastOpen + stepMs * 1000
    if (cursor > Date.now() + stepMs) break
  }
  const seen = new Set<number>()
  return out.filter((k) => (seen.has(k.time) ? false : (seen.add(k.time), true))).sort((a, b) => a.time - b.time)
}

// Bybit kline row: [start(ms str), open, high, low, close, volume, turnover]
function mapRaw(r: string[]): Kline {
  return {
    time: Number(r[0]),
    open: String(r[1]),
    high: String(r[2]),
    low: String(r[3]),
    close: String(r[4]),
    volume: String(r[5]),
  }
}

export async function bybitDepth(symbol: string): Promise<Depth> {
  const raw = await apiJson<RawDepthV5>(`/orderbook?category=spot&symbol=${symbol}&limit=25`)
  return {
    bids: (raw.result?.b ?? []) as [string, string][],
    asks: (raw.result?.s ?? []) as [string, string][],
  }
}

/** ─────────── WebSocket ─────────── */

class BybitStreams {
  private ws: ReconnectingWs | null = null
  private wantTickers: string[] = []
  private wantKlines = new Map<string, (k: Kline) => void>()
  private onTickerCb: ((t: Ticker) => void) | null = null
  private stateUsers = new Set<(s: ConnState) => void>()
  private state: ConnState = 'connecting'
  private reconnectTimer: number | null = null
  private depthTimer: number | null = null
  private depthSym: string | null = null
  private depthCb: ((d: Depth) => void) | null = null

  attachState(fn: (s: ConnState) => void): () => void {
    this.stateUsers.add(fn)
    fn(this.state)
    return () => this.stateUsers.delete(fn)
  }

  private setState(s: ConnState): void {
    this.state = s
    this.stateUsers.forEach((fn) => fn(s))
  }

  refTickers(delta: number): void {
    this.tickersRefs += delta
    if (this.tickersRefs <= 0) this.destroy()
  }
  private tickersRefs = 0

  ensureTickers(onTicker: (t: Ticker) => void, symbols: string[]): void {
    this.onTickerCb = onTicker
    this.wantTickers = symbols
    this.rebuild()
  }

  ensureKline(symbol: string, interval: Interval, cb: (k: Kline) => void): void {
    const key = `${symbol}|${interval}`
    this.wantKlines.set(key, cb)
    this.rebuild()
  }

  clearKline(symbol: string, interval: Interval): void {
    this.wantKlines.delete(`${symbol}|${interval}`)
    this.rebuild()
  }

  ensureDepth(symbol: string, cb: (d: Depth) => void): void {
    this.depthSym = symbol
    this.depthCb = cb
    this.startDepthPoll()
  }

  clearDepth(): void {
    this.depthSym = null
    this.depthCb = null
    if (this.depthTimer !== null) {
      clearInterval(this.depthTimer)
      this.depthTimer = null
    }
  }

  private startDepthPoll(): void {
    if (this.depthTimer !== null || !this.depthSym) return
    const poll = async () => {
      if (!this.depthSym || !this.depthCb) return
      try {
        const d = await bybitDepth(this.depthSym)
        if (this.depthCb && this.depthSym) this.depthCb(d)
      } catch {
        /* тикнет в следующий раз */
      }
    }
    this.depthTimer = window.setInterval(() => void poll(), 2500)
    void poll()
  }

  private rebuildTimer: number | null = null
  private rebuild(): void {
    if (this.rebuildTimer !== null) return
    this.rebuildTimer = window.setTimeout(() => {
      this.rebuildTimer = null
      this.destroyWs()
      this.connect()
    }, 300)
  }

  private connect(): void {
    if (this.wantTickers.length === 0 && this.wantKlines.size === 0) return
    this.setState('connecting')
    const topics: string[] = []
    for (const sym of this.wantTickers) topics.push(`tickers.${sym}`)
    for (const key of this.wantKlines.keys()) {
      const [sym, iv] = key.split('|')
      topics.push(`kline.${INTERVAL_BYBIT[iv as Interval]}.${sym}`)
    }
    if (topics.length === 0) return
    this.ws = new ReconnectingWs({
      url: () => WS_URL,
      ping: { everyMs: 20_000, payload: () => JSON.stringify({ op: 'ping' }) },
      // Bybit присылает app-level heartbeat (~20с); тишина 90с — half-dead сокет
      noDataWatchdogMs: 90_000,
      onOpen: (ws) => {
        this.setState('live')
        ws.send(JSON.stringify({ op: 'subscribe', args: topics }))
      },
      onMessage: (raw) => this.handle(raw),
      onStatus: (s) => {
        if (s === 'reconnecting') this.setState('reconnecting')
      },
    })
    this.ws.connect()
  }

  private handle(raw: string): void {
    const msg = JSON.parse(raw) as {
      topic?: string
      data?: unknown
      type?: string
      success?: boolean
    }
    if (!msg.topic) return
    if (msg.topic.startsWith('tickers.')) {
      const d = msg.data as {
        symbol: string
        lastPrice: string
        price24hPcnt: string
        highPrice24h?: string
        lowPrice24h?: string
      }
      if (!d) return
      this.onTickerCb?.({
        symbol: d.symbol,
        last: d.lastPrice,
        changePct24h: (parseFloat(d.price24hPcnt) || 0) * 100,
        quoteVolume24h: '0',
        high24h: d.highPrice24h,
        low24h: d.lowPrice24h,
      })
      return
    }
    if (msg.topic.startsWith('kline.')) {
      const rows = (msg.data ?? []) as Array<{
        start: number
        open: string
        high: string
        low: string
        close: string
        volume: string
        confirm: boolean
      }>
      const sym = msg.topic.split('.')[2]
      for (const [key, cb] of this.wantKlines.entries()) {
        if (!key.startsWith(sym + '|')) continue
        for (const r of rows) {
          if (typeof r?.start !== 'number') continue
          cb({
            time: r.start,
            open: r.open,
            high: r.high,
            low: r.low,
            close: r.close,
            volume: r.volume,
          })
        }
      }
    }
  }

  private destroyWs(): void {
    this.ws?.destroy()
    this.ws = null
  }

  destroy(): void {
    this.destroyWs()
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.clearDepth()
    this.wantKlines.clear()
    this.wantTickers = []
    this.onTickerCb = null
    this.setState('offline')
  }
}

const streams = new BybitStreams()

export const bybitProvider: DataProvider = {
  id: 'bybit',
  label: 'Bybit (public)',
  fetchTickers: bybitTickers,
  fetchKlines: bybitKlines,
  fetchDepth: bybitDepth,
  subscribeTickers(symbols, onTicker, onState) {
    const offState = streams.attachState(onState)
    streams.ensureTickers(onTicker, symbols)
    streams.refTickers(1)
    return () => {
      offState()
      streams.refTickers(-1)
    }
  },
  subscribeKline(symbol, interval, onKline, onState) {
    const offState = streams.attachState(onState)
    streams.ensureKline(symbol, interval, onKline)
    return () => {
      offState()
      streams.clearKline(symbol, interval)
    }
  },
  subscribeDepth(symbol, onDepth, onState) {
    const offState = streams.attachState(onState)
    streams.ensureDepth(symbol, onDepth)
    return () => {
      offState()
      streams.clearDepth()
    }
  },
}

export async function probeBybit(): Promise<boolean> {
  try {
    const p = withTimeout(apiJson<RawTickersV5>(`/tickers?category=spot&limit=1`, 8000), 9000)
    const r = await p
    return !!(r.result?.list?.length ?? 0)
  } catch {
    return false
  }
}
