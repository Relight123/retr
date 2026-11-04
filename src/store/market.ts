/** Рыночный стор: тикеры (батчинг ~3Гц), WS-подписки, спарклайны, фильтры биржи, DEX. */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Depth, Interval, Kline, SymbolFilters, Ticker, TradeTick } from '../api/types'
import { ensureProvider, currentProvider, onProviderStatus } from '../api/provider'
import { MAX_KLINE_CANDLES } from '../api/binance'
import type { DexPair } from '../api/dexscreener'
import { DEFAULT_FILTERS } from './filters-default'

export type Conn = 'connecting' | 'live' | 'reconnecting' | 'offline'

interface MarketState {
  bySymbol: Record<string, Ticker>
  version: number
  spark: Record<string, string>
  favorites: string[]
  filters: Record<string, SymbolFilters>
  conn: Conn
  providerId: string
  loading: boolean
  offline: boolean
  dexTokens: DexPair[]
  dexPrices: Record<string, string>
  aliases: Record<string, DexPair>

  loadTickers: () => Promise<void>
  toggleFavorite: (s: string) => void
  getFilters: (s: string) => SymbolFilters
  setExtraSymbols: (list: string[]) => void
  bindChart: (symbol: string, interval: string) => void
  unbindChart: () => void
  fetchKlines: (
    symbol: string,
    interval: Interval,
    opts?: { limit?: number; startTime?: number; refresh?: boolean }
  ) => Promise<Kline[]>
  candlesCache: (symbol: string, interval: string) => Kline[] | null
  ensureSpark: (symbol: string) => void
  addDexToken: (p: DexPair) => void
  removeDexToken: (id: string) => void
  setDexPrice: (id: string, price: string) => void
  refreshDexPrice: (p: DexPair) => Promise<string | null>
}

let tickerUnsub: (() => void) | null = null
let extraSymbols: string[] = []
let boundTop: string[] = []
let chartSym: string | null = null
let chartIv: string = '1m'
let klineUnsub: (() => void) | null = null
let depthUnsub: (() => void) | null = null
let tradeUnsub: (() => void) | null = null

const pending = new Map<string, Ticker>()
let flushTimer: number | null = null

const candlesBuf = new Map<string, Kline[]>()

const chartKlineSubs = new Map<string, Set<(k: Kline) => void>>()
const chartDepthSubs = new Map<string, Set<(d: Depth) => void>>()
const chartTradeSubs = new Map<string, Set<(t: TradeTick) => void>>()

export function onChartKline(symbol: string, interval: string, cb: (k: Kline) => void): () => void {
  const key = `${symbol}|${interval}`
  let set = chartKlineSubs.get(key)
  if (!set) {
    set = new Set()
    chartKlineSubs.set(key, set)
  }
  set.add(cb)
  return () => set!.delete(cb)
}

export function onChartDepth(symbol: string, cb: (d: Depth) => void): () => void {
  let set = chartDepthSubs.get(symbol)
  if (!set) {
    set = new Set()
    chartDepthSubs.set(symbol, set)
  }
  set.add(cb)
  return () => set!.delete(cb)
}

/** Лента сделок символа (стрим aggTrade). */
export function onChartTrades(symbol: string, cb: (t: TradeTick) => void): () => void {
  let set = chartTradeSubs.get(symbol)
  if (!set) {
    set = new Set()
    chartTradeSubs.set(symbol, set)
  }
  set.add(cb)
  return () => set!.delete(cb)
}

const sparkBusySet = new Set<string>()
let sparkSlots = 8

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => {
      const flushTickers = () => {
        flushTimer = null
        if (pending.size === 0) return
        const bySymbol = { ...get().bySymbol }
        pending.forEach((t, sym) => {
          bySymbol[sym] = t
        })
        pending.clear()
        set({ bySymbol, version: get().version + 1 })
      }

      const scheduleFlush = () => {
        if (flushTimer !== null) return
        flushTimer = window.setTimeout(flushTickers, 300)
      }

      const rebindTickers = () => {
        if (tickerUnsub) {
          tickerUnsub()
          tickerUnsub = null
        }
        const provider = currentProvider()
        if (!provider) return
        const symbols = unionSymbols()
        tickerUnsub = provider.subscribeTickers(
          symbols,
          (t) => {
            pending.set(t.symbol, t)
            scheduleFlush()
          },
          (s) => {
            const conn: Conn =
              s === 'live' ? 'live' : s === 'reconnecting' ? 'reconnecting' : s === 'connecting' ? 'connecting' : 'reconnecting'
            set({ conn })
          }
        )
      }

      const unionSymbols = (): string[] => {
        const st = get()
        const s = new Set<string>([
          ...boundTop,
          ...st.favorites,
          ...extraSymbols,
          ...(chartSym ? [chartSym] : []),
          ...st.dexTokens.map((d) => d.base),
        ])
        return [...s]
      }

      return {
        bySymbol: {},
        version: 0,
        spark: {},
        favorites: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        filters: {},
        conn: 'connecting',
        providerId: '',
        loading: true,
        offline: false,
        dexTokens: [],
        dexPrices: {},
        aliases: {},

        loadTickers: async () => {
          try {
            const provider = await ensureProvider()
            const list = await provider.fetchTickers()
            const bySymbol: Record<string, Ticker> = { ...get().bySymbol }
            for (const t of list) bySymbol[t.symbol] = t
            boundTop = list.slice(0, 100).map((t) => t.symbol)
            set({
              bySymbol,
              loading: false,
              offline: false,
              conn: 'live',
              providerId: provider.id,
              version: get().version + 1,
            })
            rebindTickers()
            void prefetchFilters(set, get, boundTop)
          } catch {
            set({ loading: false, offline: true, conn: 'offline' })
            window.setTimeout(() => {
              const st = useMarket.getState()
              void st.loadTickers()
            }, 8000)
          }
        },

        toggleFavorite: (s) => {
          const favorites = get().favorites.includes(s)
            ? get().favorites.filter((f) => f !== s)
            : [s, ...get().favorites]
          set({ favorites, version: get().version + 1 })
        },

        getFilters: (s) => get().filters[s] ?? DEFAULT_FILTERS,

        setExtraSymbols: (list) => {
          const changed = list.join(',') !== extraSymbols.join(',')
          extraSymbols = list
          if (changed) rebindTickers()
        },

        bindChart: (symbol, interval) => {
          if (klineUnsub) klineUnsub()
          if (depthUnsub) depthUnsub()
          if (tradeUnsub) tradeUnsub()
          klineUnsub = null
          depthUnsub = null
          tradeUnsub = null
          chartSym = symbol
          chartIv = interval
          const bindTo = (provider: NonNullable<ReturnType<typeof currentProvider>>) => {
            if (chartSym !== symbol || chartIv !== interval || klineUnsub) return
            klineUnsub = provider.subscribeKline(
              symbol,
              interval as Interval,
              (k) => {
                routeKline(symbol, interval, k)
              },
              (s) => {
                set({ conn: s === 'live' ? 'live' : 'reconnecting' })
              }
            )
            depthUnsub = provider.subscribeDepth(
              symbol,
              (d) => {
                const subs = chartDepthSubs.get(symbol)
                if (subs) subs.forEach((cb) => cb(d))
              },
              (s) => {
                set({ conn: s === 'live' ? 'live' : 'reconnecting' })
              }
            )
            // лента сделок — опциональная функция провайдера (Bybit её не даёт)
            if (provider.subscribeTrades) {
              tradeUnsub = provider.subscribeTrades(
                symbol,
                (tr) => {
                  const subs = chartTradeSubs.get(symbol)
                  if (subs) subs.forEach((cb) => cb(tr))
                },
                () => undefined
              )
            }
          }
          const provider = currentProvider()
          if (provider) {
            bindTo(provider)
          } else {
            // провайдер ещё выбирается (стартовая загрузка) — привяжемся чуть позже
            void ensureProvider()
              .then((p) => bindTo(p))
              .catch(() => set({ conn: 'offline' }))
          }
        },

        unbindChart: () => {
          if (klineUnsub) klineUnsub()
          if (depthUnsub) depthUnsub()
          if (tradeUnsub) tradeUnsub()
          klineUnsub = null
          depthUnsub = null
          tradeUnsub = null
          chartSym = null
        },

        fetchKlines: async (symbol, interval, opts) => {
          let provider = currentProvider()
          if (!provider) {
            try {
              provider = await ensureProvider()
            } catch {
              throw new Error('OFFLINE')
            }
          }
          const limit = opts?.limit ?? 400
          const cached = get().candlesCache(symbol, interval)
          if (!opts?.refresh && opts?.startTime === undefined && cached && cached.length > 0) {
            if (Date.now() - cached[cached.length - 1].time < intervalMs(interval) * 2) {
              return cached
            }
          }
          // буфер точек для бэктрейс-мержи
          let rest: Kline[] = []
          try {
            rest = await provider.fetchKlines({ symbol, interval, limit, startTime: opts?.startTime })
          } catch (e) {
            if (cached && cached.length > 0) return cached
            throw e
          }
          const merged = mergeKlines(cached ?? [], rest)
          candlesBuf.set(`${symbol}|${interval}`, merged)
          set({ version: get().version + 1 })
          return merged
        },

        candlesCache: (symbol, interval) => candlesBuf.get(`${symbol}|${interval}`) ?? null,

        ensureSpark: (symbol) => {
          const st = get()
          if (st.spark[symbol] || sparkBusySet.has(symbol)) return
          sparkBusySet.add(symbol)
          sparkSlots--
          const run = async () => {
            try {
              const provider = currentProvider()
              if (!provider) return
              const kl = await provider.fetchKlines({ symbol, interval: '1h', limit: 24 })
              if (kl.length < 2) return
              const closes = kl.map((k) => parseFloat(k.close))
              const min = Math.min(...closes)
              const max = Math.max(...closes)
              const range = max - min || 1
              const w = 64
              const h = 26
              const pts = closes.map((c, i) => {
                const x = (i / (closes.length - 1)) * w
                const y = h - ((c - min) / range) * (h - 2) - 1
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              const s2 = useMarket.getState()
              useMarket.setState({
                spark: { ...s2.spark, [symbol]: `M${pts.join(' L')}` },
                version: s2.version + 1,
              })
            } catch {
              /* spark optional */
            } finally {
              sparkBusySet.delete(symbol)
              sparkSlots++
            }
          }
          void run()
        },

        addDexToken: (p) => {
          const id = `${p.chainId}:${p.pairAddress}`
          if (get().aliases[id]) return
          set((s) => ({
            aliases: { ...s.aliases, [id]: p },
            dexTokens: [p, ...s.dexTokens.filter((x) => `${x.chainId}:${x.pairAddress}` !== id)].slice(0, 30),
            version: s.version + 1,
          }))
        },

        removeDexToken: (id) =>
          set((s) => ({
            aliases: omitKey(s.aliases, id),
            dexTokens: s.dexTokens.filter((x) => `${x.chainId}:${x.pairAddress}` !== id),
            version: s.version + 1,
          })),

        setDexPrice: (id, price) =>
          set((s) => ({
            dexPrices: { ...s.dexPrices, [id]: price },
            version: s.version + 1,
          })),

        refreshDexPrice: async (p) => {
          try {
            const { dexTokenPrice } = await import('../api/dexscreener')
            const fresh = await dexTokenPrice(p.pairAddress)
            if (fresh) {
              get().setDexPrice(`${p.chainId}:${p.pairAddress}`, fresh.priceUsd)
              return fresh.priceUsd
            }
          } catch {
            /* ignore */
          }
          return null
        },
      }
    },
    {
      name: 'pt-market-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ favorites: s.favorites, dexTokens: s.dexTokens, aliases: s.aliases }),
    }
  )
)

function omitKey<T extends object>(obj: T, key: string): T {
  const copy = { ...obj } as Record<string, unknown>
  delete copy[key]
  return copy as T
}

function intervalMs(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60_000,
    '5m': 300_000,
    '15m': 900_000,
    '1h': 3_600_000,
    '4h': 14_400_000,
    '1d': 86_400_000,
  }
  return map[interval] ?? 60_000
}

function routeKline(symbol: string, interval: string, k: Kline): void {
  const key = `${symbol}|${interval}`
  const buf = candlesBuf.get(key)
  if (buf && buf.length > 0) {
    const last = buf[buf.length - 1]
    if (last.time === k.time) buf[buf.length - 1] = k
    else buf.push(k)
    if (buf.length > MAX_KLINE_CANDLES) buf.splice(0, buf.length - MAX_KLINE_CANDLES)
  }
  const subs = chartKlineSubs.get(key)
  if (subs) subs.forEach((cb) => cb(k))
}

function mergeKlines(base: Kline[], add: Kline[]): Kline[] {
  if (add.length === 0) return base.length > 0 ? [...base] : []
  if (base.length === 0) return add
  const map = new Map<number, Kline>()
  for (const k of base) map.set(k.time, k)
  for (const k of add) map.set(k.time, k)
  const out = [...map.values()].sort((a, b) => a.time - b.time)
  if (out.length > MAX_KLINE_CANDLES) out.splice(0, out.length - MAX_KLINE_CANDLES)
  return out
}

async function prefetchFilters(
  set: (partial: Partial<MarketState>) => void,
  get: () => MarketState,
  tops: string[]
): Promise<void> {
  const provider = currentProvider()
  if (!provider?.fetchFilters) return
  const missing = tops.filter((t) => !get().filters[t])
  if (missing.length === 0) return
  try {
    const got = await provider.fetchFilters(missing.slice(0, 100))
    const filters = { ...get().filters }
    got.forEach((v, k) => {
      filters[k] = v
    })
    set({ filters })
  } catch {
    /* остаются дефолтные фильтры */
  }
}

onProviderStatus((s) => {
  const conn: Conn = mapConn(s.state)
  useMarket.setState({ conn, providerId: s.id === 'offline' ? '' : s.id })
})

function mapConn(s: string): Conn {
  if (s === 'live') return 'live'
  if (s === 'offline' || s === 'failed') return 'offline'
  if (s === 'reconnecting') return 'reconnecting'
  return 'connecting'
}

export function currentChartBinding(): { symbol: string; interval: string } | null {
  return chartSym ? { symbol: chartSym, interval: chartIv } : null
}
