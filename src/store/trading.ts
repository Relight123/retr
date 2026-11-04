/** Торговый стор: счёт + ордера + позиции. Хранение — IndexedDB.
 *  Вся расчётная логика — чистые функции движка; стор только собирает ввод
 *  (цены, глубина), гоняет backfill/live-проверки и пишет события. */
import { create } from 'zustand'
import type { AccountSnapshot, Candle, Market, Order, Side } from '../lib/engine/types'
import { dayKey } from '../lib/engine/daykey'
import { engineUid, D } from '../lib/engine/money'
import { vwapFromDepth } from '../lib/engine/execution'
import {
  applyFill,
  catchUp,
  closeFutures,
  closeFuturesFull,
  computeEquity,
  evalLiquidation,
  symbolsNeedingCandles,
} from '../lib/engine'
import { loadKV, saveKV } from '../lib/storage'
import { ensureProvider, currentProvider } from '../api/provider'
import { useMarket } from './market'
import { DEFAULT_FILTERS } from './filters-default'
import { useSettings } from './settings'
import { useToasts, useCelebrate } from './toasts'
import { playSound } from '../lib/sound'
import { buzz } from '../lib/haptics'

export interface SubmitArgs {
  symbol: string
  market: Market
  side: Side
  type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'oco'
  qty: string
  limitPrice?: string
  triggerPrice?: string
  tpPrice?: string
  slPrice?: string
  leverage?: number
  positionId?: string
}

interface TradingState {
  ready: boolean
  snap: AccountSnapshot | null
  backfilling: boolean
  init: () => Promise<void>
  resetAccount: (startBalance: string) => void
  submitOrder: (args: SubmitArgs) => Promise<{ ok: boolean; error?: string }>
  cancelOrder: (id: string, cascadeOco?: boolean) => void
  closePosition: (positionId: string) => void
}

const ACCOUNT_KEY = 'account-v1'

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

/** Цена инструмента: CEX-тикер или DEX-кэш. */
export function priceOf(symbol: string): string | null {
  const m = useMarket.getState()
  const t = m.bySymbol[symbol]
  if (t && t.last) return t.last
  const dex = m.aliases[symbol]
  if (dex) {
    const cached = m.dexPrices[`${dex.chainId}:${dex.pairAddress}`]
    return cached ?? dex.priceUsd
  }
  return null
}

/** ── Буферы 1m-свечей для проверки открытых ордеров ── */
const buffers = new Map<string, Candle[]>()
const orderSubs = new Map<string, () => void>()
const checkTimers = new Map<string, number>()

export function pushCandle(symbol: string, c: Candle): void {
  let buf = buffers.get(symbol)
  if (!buf) {
    buf = []
    buffers.set(symbol, buf)
  }
  const last = buf[buf.length - 1]
  if (last && last.time === c.time) buf[buf.length - 1] = c
  else buf.push(c)
  if (buf.length > 6000) buf.splice(0, buf.length - 6000)
}

export function setCandles(symbol: string, cs: Candle[]): void {
  buffers.set(symbol, cs)
}

function playSafe(name: Parameters<typeof playSound>[0]): void {
  try {
    playSound(name)
  } catch {
    /* no-op */
  }
}

function fmtP(v: string): string {
  const n = parseFloat(v)
  const d = Math.abs(n) >= 100 ? 2 : Math.abs(n) >= 1 ? 4 : 6
  return n.toFixed(d)
}

/** Подписки на 1m-свечи инструментов с открытыми ордерами/позициями. */
function rebindOrderStreams(): void {
  const snap = useTrading.getState().snap
  const symbols = snap ? symbolsNeedingCandles(snap) : []
  const provider = currentProvider()
  if (!provider) return
  for (const [sym, unsub] of [...orderSubs]) {
    if (!symbols.includes(sym)) {
      unsub()
      orderSubs.delete(sym)
      const id = checkTimers.get(sym)
      if (id !== undefined) window.clearInterval(id)
      checkTimers.delete(sym)
    }
  }
  for (const sym of symbols) {
    if (orderSubs.has(sym)) continue
    orderSubs.set(
      sym,
      provider.subscribeKline(
        sym,
        '1m',
        (k) => {
          pushCandle(sym, k)
        },
        () => {}
      )
    )
    checkTimers.set(
      sym,
      window.setInterval(() => {
        void runCheckedCatchUp(sym)
      }, 1500)
    )
  }
}

/** Проверка триггеров по буферу + применение изменений. */
function runCheckedCatchUp(symbol: string): void {
  const snap = useTrading.getState().snap
  if (!snap) return
  const buf = buffers.get(symbol)
  if (!buf || buf.length === 0) return
  const feePct = useSettings.getState().feePct
  const toast = useToasts.getState()
  const sounds = useSettings.getState().sounds
  const out = catchUp(snap, { [symbol]: buf }, Date.now(), feePct, {
    onOrderFilled: (o) => {
      toast.push(
        'fill',
        `Ордер исполнен: ${o.symbol} @ ${fmtP(o.fillPrice ?? '0')}`
      )
      if (sounds) playSafe('fill')
      buzz(15)
      if (o.ocoId) toast.push('info', 'OCO-пара: второй ордер отменён')
    },
    onOrderCanceled: (o, reason) => {
      if (reason === 'oco-canceled') return
      toast.push('info', `Ордер ${o.kind} отменён: ${o.kind === 'limit' ? 'нет средств' : reason}`)
      if (sounds) playSafe('error')
    },
    onPositionClosed: () => {
      toast.push('error', 'Позиция ликвидирована')
      if (sounds) playSafe('error')
      buzz(30)
    },
  })
  if (out !== snap) {
    useTrading.setState({ snap: out })
    void saveKV(ACCOUNT_KEY, out)
    rebindOrderStreams()
  }
}

/** Ликвидации по «живым» ценам (тикер может прийти без свечи). */
function liqSweep(): void {
  const st = useTrading.getState()
  const snap = st.snap
  if (!snap || snap.positions.length === 0) return
  const feePct = useSettings.getState().feePct
  const toast = useToasts.getState()
  const sounds = useSettings.getState().sounds
  for (const pos of [...snap.positions]) {
    const priceStr = priceOf(pos.symbol)
    if (!priceStr) continue
    const synth: Candle = { time: Date.now(), open: priceStr, high: priceStr, low: priceStr, close: priceStr }
    if (!evalLiquidation(pos, synth)) continue
    const res = closeFutures(snap, {
      positionId: pos.id,
      price: pos.liqPrice,
      ts: Date.now(),
      feePct,
      kind: 'liquidation',
    })
    if (res) {
      useTrading.setState({ snap: res.snap })
      void saveKV(ACCOUNT_KEY, res.snap)
      toast.push('error', 'Позиция ликвидирована')
      if (sounds) playSafe('error')
      buzz(30)
      rebindOrderStreams()
    }
  }
}

/** Прокатка якоря дня (PnL за день). */
function rollDayAnchor(): void {
  const st = useTrading.getState()
  const snap = st.snap
  if (!snap) return
  const today = dayKey(Date.now())
  if (snap.dayAnchor.date === today) return
  const eq = computeEquity(snap, priceOf)
  useTrading.setState({ snap: { ...snap, dayAnchor: { date: today, equity: eq.equity } } })
  void saveKV(ACCOUNT_KEY, snap)
}

let liqTimer: number | null = null
let dayTimer: number | null = null

export const useTrading = create<TradingState>((set, get) => {
  let saveTimer: number | null = null
  const persistSoon = () => {
    if (saveTimer !== null) return
    saveTimer = window.setTimeout(() => {
      saveTimer = null
      const snap = get().snap
      if (snap) void saveKV(ACCOUNT_KEY, snap)
    }, 400)
  }

  const setSnap = (snap: AccountSnapshot) => {
    set({ snap })
    persistSoon()
  }

  return {
    ready: false,
    snap: null,
    backfilling: false,

    init: async () => {
      const saved = await loadKV<AccountSnapshot>(ACCOUNT_KEY)
      const snap =
        saved && saved.version === 1 && typeof saved.cash === 'string'
          ? saved
          : initialAccount('10000')
      set({ snap, ready: true })
      rollDayAnchor()
      if (liqTimer === null) liqTimer = window.setInterval(liqSweep, 1500)
      if (dayTimer === null) dayTimer = window.setInterval(rollDayAnchor, 60_000)
      rebindOrderStreams()
      await fullBackfill(set, get)
    },

    resetAccount: (startBalance) => {
      for (const [sym, unsub] of [...orderSubs]) {
        unsub()
        orderSubs.delete(sym)
        const id = checkTimers.get(sym)
        if (id !== undefined) window.clearInterval(id)
        checkTimers.delete(sym)
      }
      buffers.clear()
      const snap = initialAccount(startBalance)
      void saveKV(ACCOUNT_KEY, snap)
      set({ snap, ready: true, backfilling: false })
      useToasts.getState().push('success', 'Счёт сброшен')
      if (useSettings.getState().sounds) playSafe('notify')
      rebindOrderStreams()
    },

    submitOrder: async (args) => {
      const snap = get().snap
      if (!snap) return { ok: false, error: 'INIT' }
      const settings = useSettings.getState()
      const feePct = settings.feePct
      const now = Date.now()
      const isDex = args.symbol.includes(':')
      const filt = isDex ? DEFAULT_FILTERS : useMarket.getState().getFilters(args.symbol)
      const toast = useToasts.getState()
      const sounds = settings.sounds

      try {
        if (args.type === 'market') {
          const last = priceOf(args.symbol)
          if (!last) {
            toast.push('error', 'Нет данных рынка')
            return { ok: false, error: 'OFFLINE' }
          }
          let depth: { bids: [string, string][]; asks: [string, string][] } | null = null
          if (args.market === 'spot' && !isDex) {
            const provider = currentProvider()
            if (provider) {
              try {
                depth = await provider.fetchDepth(args.symbol)
              } catch {
                depth = null
              }
            }
          }
          const exec = vwapFromDepth(depth, args.side, args.qty, last)
          if (exec.depleted) toast.push('info', 'Глубина ограничена — часть ордера по штрафной цене')
          const res = applyFill(snap, {
            symbol: args.symbol,
            market: args.market,
            side: args.side,
            kind: 'market',
            qty: args.qty,
            price: exec.avgPrice,
            ts: now,
            feePct,
            leverage: args.market === 'futures' ? args.leverage ?? 1 : undefined,
            minNotionalOverride: filt.minNotional,
          })
          setSnap(res.snap)
          if (args.market === 'spot') {
            toast.push(
              'success',
              `${isDex ? 'DEX-сделка' : args.side === 'buy' ? 'Куплено' : 'Продано'}: ${args.symbol} @ ${fmtP(exec.avgPrice)}`
            )
          } else {
            toast.push(
              'success',
              `${args.side === 'buy' ? 'Лонг открыт' : 'Шорт открыт'}: ${args.symbol} @ ${fmtP(exec.avgPrice)}`
            )
          }
          if (sounds) playSafe(args.side === 'buy' ? 'buy' : 'sell')
          buzz(12)
          return { ok: true }
        }

        if (args.type === 'oco') {
          if (!args.tpPrice || !args.slPrice) return { ok: false, error: 'INVALID_PRICE' }
          const ocoId = engineUid('oco')
          const mk = (kind: 'take-profit' | 'stop-loss', trigger: string): Order => ({
            id: engineUid('o'),
            symbol: args.symbol,
            iSymbol: args.symbol,
            market: args.market,
            side: args.side,
            kind,
            qty: args.qty,
            price: trigger,
            status: 'open',
            createdAt: now,
            ocoId,
            positionId: args.positionId,
            leverage: args.market === 'futures' ? args.leverage ?? 1 : undefined,
          })
          const tp = mk('take-profit', args.tpPrice)
          const sl = mk('stop-loss', args.slPrice)
          if (args.market === 'spot') {
            const held = D(snap.holdings[args.symbol]?.qty ?? '0')
            if (held.lt(D(args.qty))) return { ok: false, error: 'INSUFFICIENT_ASSET' }
          } else if (args.positionId) {
            const pos = snap.positions.find((p) => p.id === args.positionId)
            if (!pos || D(pos.qty).lt(D(args.qty))) return { ok: false, error: 'INVALID_QTY' }
          }
          const orders = [...snap.orders, tp, sl].slice(-200)
          setSnap({ ...snap, orders })
          toast.push('order', `OCO размещён: TP ${args.tpPrice} · SL ${args.slPrice}`)
          if (sounds) playSafe('notify')
          rebindOrderStreams()
          return { ok: true }
        }

        // limit / stop-loss / take-profit
        const price = args.type === 'limit' ? args.limitPrice ?? '' : args.triggerPrice ?? ''
        if (!price || !isFinite(parseFloat(price)) || parseFloat(price) <= 0)
          return { ok: false, error: 'INVALID_PRICE' }
        if (D(args.qty).lte(0)) return { ok: false, error: 'INVALID_QTY' }
        const order: Order = {
          id: engineUid('o'),
          symbol: args.symbol,
          iSymbol: args.symbol,
          market: args.market,
          side: args.side,
          kind: args.type,
          qty: args.qty,
          price,
          status: 'open',
          createdAt: now,
          leverage: args.market === 'futures' ? args.leverage ?? 1 : undefined,
        }
        if (args.market === 'spot' && args.side === 'sell') {
          const held = D(snap.holdings[args.symbol]?.qty ?? '0')
          if (held.lt(D(args.qty))) return { ok: false, error: 'INSUFFICIENT_ASSET' }
        }
        if (args.market === 'futures' && (args.type === 'stop-loss' || args.type === 'take-profit')) {
          if (!args.positionId) return { ok: false, error: 'INVALID_PRICE' }
          const pos = snap.positions.find((p) => p.id === args.positionId)
          if (!pos) return { ok: false, error: 'INVALID_PRICE' }
          if (D(pos.qty).lt(D(args.qty))) return { ok: false, error: 'INVALID_QTY' }
          order.positionId = args.positionId
        }
        const orders = [...snap.orders, order].slice(-200)
        setSnap({ ...snap, orders })
        toast.push('order', 'Ордер размещён')
        if (sounds) playSafe('notify')
        rebindOrderStreams()
        return { ok: true }
      } catch (e) {
        const code = (e as { code?: string })?.code ?? 'UNKNOWN'
        return { ok: false, error: code }
      }
    },

    cancelOrder: (id, cascadeOco = true) => {
      const snap = get().snap
      if (!snap) return
      const order = snap.orders.find((o) => o.id === id)
      if (!order || order.status !== 'open') return
      const ids = new Set([id])
      if (cascadeOco && order.ocoId) {
        for (const o of snap.orders) {
          if (o.ocoId === order.ocoId && o.status === 'open' && o.id !== id) ids.add(o.id)
        }
      }
      const orders = snap.orders.map((o) =>
        ids.has(o.id) ? { ...o, status: 'canceled' as const, note: 'user-cancel' } : o
      )
      setSnap({ ...snap, orders })
      useToasts.getState().push('info', ids.size > 1 ? 'OCO отменён' : 'Ордер отменён')
      if (useSettings.getState().sounds) playSafe('notify')
      rebindOrderStreams()
    },

    closePosition: (positionId) => {
      const snap = get().snap
      if (!snap) return
      const pos = snap.positions.find((p) => p.id === positionId)
      if (!pos) return
      const last = priceOf(pos.symbol)
      if (!last) {
        useToasts.getState().push('error', 'Нет данных рынка')
        return
      }
      const feePct = useSettings.getState().feePct
      const res = closeFuturesFull(snap, positionId, last, Date.now(), feePct)
      if (!res) return
      setSnap(res.snap)
      const pnl = parseFloat(res.trade.pnl ?? '0')
      useToasts
        .getState()
        .push('success', `Позиция закрыта: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`)
      if (useSettings.getState().sounds) playSafe(pnl >= 0 ? 'profit' : 'sell')
      buzz(20)
      if (pnl > 0) useCelebrate.getState().celebrate()
      rebindOrderStreams()
    },
  }
})

/** Полный backfill при старте: догружаем 1m-свечи с момента создания ордеров
 *  и исполняем касание уровня задним числом. */
async function fullBackfill(
  set: (partial: Partial<{ backfilling: boolean; snap: AccountSnapshot | null }>) => void,
  get: () => { snap: AccountSnapshot | null }
): Promise<void> {
  const snap = get().snap
  if (!snap) return
  const symbols = symbolsNeedingCandles(snap).filter((s) => !s.includes(':'))
  if (symbols.length > 0) {
    set({ backfilling: true })
  }
  try {
    if (symbols.length === 0) return
    const provider = await ensureProvider()
    let minTs = Date.now()
    for (const o of snap.orders) if (o.status === 'open' && o.createdAt < minTs) minTs = o.createdAt
    for (const p of snap.positions) if (p.openedAt < minTs) minTs = p.openedAt
    const startTime = Math.max(0, minTs - 90_000)
    const candlesBySymbol: Record<string, Candle[]> = {}
    await Promise.all(
      symbols.map(async (sym) => {
        try {
          const ks = await provider.fetchKlines({ symbol: sym, interval: '1m', startTime })
          if (ks.length > 0) {
            const cs: Candle[] = ks.map((k) => ({
              time: k.time,
              open: k.open,
              high: k.high,
              low: k.low,
              close: k.close,
            }))
            setCandles(sym, cs)
            candlesBySymbol[sym] = cs
          }
        } catch {
          /* offline: позже по живым подпискам */
        }
      })
    )
    const feePct = useSettings.getState().feePct
    const toast = useToasts.getState()
    const current = get().snap
    if (!current) return
    const out = catchUp(current, candlesBySymbol, Date.now(), feePct, {
      onOrderFilled: (o) => {
        toast.push('fill', `Ордер исполнен (авто): ${o.symbol} @ ${fmtP(o.fillPrice ?? '0')}`)
        playSafe('fill')
      },
      onPositionClosed: () => {
        toast.push('error', 'Позиция ликвидирована (авто)')
        playSafe('error')
      },
      onOrderCanceled: (_o, reason) => {
        if (reason !== 'oco-canceled') playSafe('error')
      },
    })
    if (out !== current) {
      set({ snap: out })
      void saveKV(ACCOUNT_KEY, out)
    }
  } catch {
    /* offline */
  } finally {
    set({ backfilling: false })
    rebindOrderStreams()
  }
}
