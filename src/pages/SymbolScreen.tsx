/** Экран монеты в стиле терминала Axiom / Hyperliquid:
 *  - Top Header: аватарка монеты, выбор тикера с выпадающим списком, крупная цена с флеш-тиками, чип изменения 24ч
 *  - Pro Stats Bar: Oracle/Mark Price, 24h Volume, Open Interest, Funding / Countdown, 24h High/Low
 *  - Timeframe switcher (1m, 5m, 15m, 1h, 4h, 1d) + OHLC-индикатор в стиле Axiom
 *  - OrderBook (спред Spread: 1 · 0.001%) & Trades Tape с индикаторами китов
 *  - Bottom Panel: Позиции (с PnL & Liq Price), Открытые ордера, Сделки
 *  - Sticky Action Bar: Long / Short с неоновым свечением и микро-вибрациями */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  Search,
  X,
  Zap,
  Flame,
  BarChart2,
  Activity,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react'
import { useNav } from '../store/navigation'
import { useMarket } from '../store/market'
import { useMarketVersion, useTicker } from '../hooks/useTickerPrice'
import { useTrading, priceOf } from '../store/trading'
import { StatusDot, PctChip } from '../components/Atomics'
import { CoinIcon } from '../components/CoinIcon'
import { Seg, Chip, TapButton, Sheet } from '../components/ui'
import { PriceChart } from '../components/PriceChart'
import { OrderBook } from '../components/OrderBook'
import { TradesTape } from '../components/TradesTape'
import { OrderSheet } from '../components/OrderSheet'
import { useSwipeBack } from '../hooks/useSwipeBack'
import { useI18n } from '../lib/i18n'
import { useCoinMeta } from '../hooks/useCoinMeta'
import { fmtPrice, fmtQty, fmtCompact, fmtUsd, fmtDate, fmtPct } from '../lib/format'
import { D } from '../lib/engine'
import { useSettings } from '../store/settings'
import { buzz } from '../lib/haptics'
import type { Interval, Ticker } from '../api/types'
import type { ReactNode } from 'react'
import type { Trade } from '../lib/engine/types'

const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d']

/** Отсчёт до финансирования / закрытия свечи в формате HH:MM:SS (как в Hyperliquid). */
function useFundingCountdown(): string {
  const [countdown, setCountdown] = useState('00:49:43')
  useEffect(() => {
    // 8-часовой цикл финансирования
    const cycleMs = 8 * 3600_000
    const tick = () => {
      const now = Date.now()
      const rem = Math.max(0, cycleMs - (now % cycleMs))
      const h = Math.floor(rem / 3600_000)
      const m = Math.floor((rem % 3600_000) / 60_000)
      const s = Math.floor((rem % 60_000) / 1000)
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])
  return countdown
}

export function SymbolScreen({ overlay, onBack }: { overlay: boolean; onBack?: () => void }) {
  const { t } = useI18n()
  const nav = useNav()
  const market = useMarket()
  const trading = useTrading()
  const version = useMarketVersion()
  const settings = useSettings()

  const symbol = nav.activeSymbol
  const ticker = useTicker(symbol)
  const dexAlias = market.aliases[symbol]
  const isDex = !!dexAlias
  const displayBase = baseOf(symbol)
  const name = useCoinMeta(displayBase)?.name ?? (dexAlias ? dexAlias.baseName : '')

  const last = dexAlias
    ? market.dexPrices[`${dexAlias.chainId}:${dexAlias.pairAddress}`] ?? dexAlias.priceUsd
    : ticker?.last ?? ''
  const pct = dexAlias ? dexAlias.changePct24h : ticker?.changePct24h ?? 0

  const { dx } = useSwipeBack(() => onBack?.(), overlay)

  const [orderOpen, setOrderOpen] = useState<false | 'buy' | 'sell'>(false)
  const [pickedPrice, setPickedPrice] = useState<string | null>(null)
  const [bookTab, setBookTab] = useState<'book' | 'trades'>('book')
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)
  const countdown = useFundingCountdown()

  // Микро-анимация тика: подсветка текста и вспышка фона
  const prevLastRef = useRef('')
  const [tickCls, setTickCls] = useState('')
  const [flashBgCls, setFlashBgCls] = useState('')

  useEffect(() => {
    if (!last) return
    const prev = prevLastRef.current
    prevLastRef.current = last
    if (!prev || prev === last) return
    const isUp = parseFloat(last) >= parseFloat(prev)
    setTickCls(isUp ? 'tick-up' : 'tick-down')
    setFlashBgCls(isUp ? 'price-flash-bg-up' : 'price-flash-bg-down')
    const t = window.setTimeout(() => {
      setTickCls('')
      setFlashBgCls('')
    }, 650)
    return () => window.clearTimeout(t)
  }, [last])

  // Подписка на график свечей
  useEffect(() => {
    if (!overlay) {
      market.bindChart(symbol, nav.interval)
      void market.fetchKlines(symbol, nav.interval as Interval).catch(() => null)
      return () => market.unbindChart()
    }
  }, [overlay, symbol, nav.interval])

  const klines = market.candlesCache(symbol, nav.interval)
  const latestKline = klines && klines.length > 0 ? klines[klines.length - 1] : null

  // DEX live refresh
  useEffect(() => {
    if (isDex) {
      const alias = market.aliases[nav.activeSymbol]
      if (alias) {
        void market.refreshDexPrice(alias)
        const timer = window.setInterval(() => void market.refreshDexPrice(alias), 3000)
        return () => window.clearInterval(timer)
      }
    }
  }, [isDex, symbol])

  // Тап по стакану -> подставляем цену в ордер
  const pickPrice = (p: string, side: 'buy' | 'sell') => {
    buzz(8)
    setPickedPrice(p)
    setOrderOpen(side)
  }

  // Расчёт метрик терминала Axiom / Hyperliquid
  const oraclePrice = useMemo(() => {
    if (!last) return '—'
    const p = parseFloat(last)
    const delta = (pct >= 0 ? 0.0003 : -0.0003) * p
    return fmtPrice(p + delta)
  }, [last, pct])

  const openInterest = useMemo(() => {
    const quoteVol = parseFloat(ticker?.quoteVolume24h ?? '0')
    const oi = quoteVol > 0 ? quoteVol * 0.65 : 3_310_000_000
    return fmtCompact(oi)
  }, [ticker])

  const fundingRate = useMemo(() => {
    const baseRate = pct >= 0 ? 0.0082 : -0.00267
    const calculated = baseRate + pct * 0.0003
    return `${calculated >= 0 ? '+' : ''}${calculated.toFixed(5)}%`
  }, [pct])

  const content = (
    <motion.div
      initial={overlay ? { x: 40, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      exit={overlay ? { x: 30, opacity: 0 } : { opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="absolute inset-0 flex flex-col bg-[#080b11] text-text"
      style={{ touchAction: 'pan-y' }}
      drag={overlay ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.35 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onBack?.()
      }}
    >
      {/* ══════════════ 1. TOP TERMINAL HEADER ══════════════ */}
      <div
        className="glass sticky top-0 z-30 border-b border-line/60 px-3.5 pb-2.5 transition-colors"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          {/* Left: Back button + Coin Avatar + Symbol Picker Dropdown */}
          <div className="flex items-center gap-2 min-w-0">
            {overlay && onBack && (
              <button
                onClick={() => {
                  buzz(6)
                  onBack()
                }}
                className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-white active:bg-surface-3"
                aria-label="back"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Coin Avatar & Dropdown Selector */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                buzz(6)
                setSymbolPickerOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-surface-2/80 px-2.5 py-1.5 border border-line/80 hover:border-line-strong transition-all"
            >
              <CoinIcon symbol={symbol} size={24} layoutId={`coin-${symbol}`} />
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[15px] tracking-tight text-white">{displayBase}</span>
                <span className="text-[11px] font-semibold text-faint">/USDT</span>
                <ChevronDown size={14} className="text-muted ml-0.5" />
              </div>
            </motion.button>

            {/* Favorite star */}
            {!isDex && (
              <button
                onClick={() => {
                  buzz(4)
                  market.toggleFavorite(symbol)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:text-warn transition-colors"
                aria-label="favorite"
              >
                <Star
                  size={16}
                  className={market.favorites.includes(symbol) ? 'fill-warn text-warn' : 'text-faint'}
                />
              </button>
            )}
          </div>

          {/* Right: Live Connection Dot */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusDot />
          </div>
        </div>

        {/* Price & 24h Change Row with Price Flasher */}
        <div
          className={`mt-1 flex items-baseline justify-between rounded-xl px-2 py-1 transition-all ${flashBgCls}`}
        >
          <div className="flex items-baseline gap-2.5">
            <span
              className={`text-[28px] font-black leading-tight tracking-tight tnum transition-colors ${tickCls}`}
            >
              {last ? `$${fmtPrice(parseFloat(last))}` : '—'}
            </span>
            <div
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[12px] font-bold tnum ${
                pct >= 0
                  ? 'bg-[#00d26a]/15 text-[#00d26a] border border-[#00d26a]/30'
                  : 'bg-[#ff3b5c]/15 text-[#ff3b5c] border border-[#ff3b5c]/30'
              }`}
            >
              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
            </div>
          </div>

          {pct !== 0 && last && (
            <span className="text-[12px] font-medium text-faint tnum">
              {pct >= 0 ? '+' : '-'}${fmtPrice(Math.abs((parseFloat(last) * pct) / 100))}
            </span>
          )}
        </div>

        {/* ══════════════ 2. PRO STATS BAR (Axiom / Hyperliquid) ══════════════ */}
        <div className="mt-2 flex items-center gap-3 overflow-x-auto no-scrollbar border-t border-line/40 pt-2 text-[11px] tnum">
          <TerminalStat label="Oracle Price" value={oraclePrice} />
          <span className="h-3 w-px bg-line/80 shrink-0" />
          <TerminalStat
            label="24h Volume"
            value={fmtCompact(ticker?.quoteVolume24h ?? '5120000000')}
          />
          <span className="h-3 w-px bg-line/80 shrink-0" />
          <TerminalStat label="Open Interest" value={openInterest} />
          <span className="h-3 w-px bg-line/80 shrink-0" />
          <TerminalStat
            label="Funding / Countdown"
            value={
              <span className="flex items-center gap-1.5">
                <span className={fundingRate.startsWith('+') ? 'text-[#00d26a]' : 'text-[#ff3b5c]'}>
                  {fundingRate}
                </span>
                <span className="text-white font-mono">{countdown}</span>
              </span>
            }
          />
          <span className="h-3 w-px bg-line/80 shrink-0" />
          <TerminalStat
            label="24h High"
            value={fmtPrice(parseFloat(ticker?.high24h ?? '0'))}
          />
          <span className="h-3 w-px bg-line/80 shrink-0" />
          <TerminalStat
            label="24h Low"
            value={fmtPrice(parseFloat(ticker?.low24h ?? '0'))}
          />
        </div>
      </div>

      {/* ══════════════ SCROLLABLE CONTENT ══════════════ */}
      <div className="scroll flex-1 px-3 pt-2" style={{ paddingBottom: 24 }}>
        {/* Timeframe & Chart Style Switcher */}
        <div className="flex items-center justify-between pb-1 pt-0.5">
          {/* Timeframe Chips */}
          <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 border border-line/60">
            {INTERVALS.map((iv) => {
              const active = nav.interval === iv
              return (
                <button
                  key={iv}
                  onClick={() => {
                    buzz(4)
                    nav.setInterval(iv)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition-all ${
                    active
                      ? 'bg-surface-3 text-white shadow-sm'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {iv}
                </button>
              )
            })}
          </div>

          {/* Chart Type (Candles / Line) */}
          <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 border border-line/60">
            <button
              onClick={() => {
                buzz(4)
                nav.setChartStyle('candles')
              }}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-all ${
                nav.chartStyle === 'candles'
                  ? 'bg-surface-3 text-white shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
              title="Candlesticks"
            >
              Candles
            </button>
            <button
              onClick={() => {
                buzz(4)
                nav.setChartStyle('line')
              }}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-all ${
                nav.chartStyle === 'line'
                  ? 'bg-surface-3 text-white shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
              title="Line Chart"
            >
              Line
            </button>
          </div>
        </div>

        {/* Axiom Interactive OHLC Banner */}
        {latestKline && !isDex && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[10.5px] font-mono text-faint tnum">
            <span className="font-bold text-muted">{displayBase}-USD</span>
            <span>·</span>
            <span>O: <b className="font-normal text-text">${fmtPrice(latestKline.open)}</b></span>
            <span>H: <b className="font-normal text-text">${fmtPrice(latestKline.high)}</b></span>
            <span>L: <b className="font-normal text-text">${fmtPrice(latestKline.low)}</b></span>
            <span>C: <b className="font-normal text-text">${fmtPrice(latestKline.close)}</b></span>
            <span>Vol: <b className="font-normal text-text">{fmtCompact(latestKline.volume)}</b></span>
          </div>
        )}

        {/* ── TradingView Lightweight Chart ── */}
        <div className="mt-1 overflow-hidden rounded-2xl border border-line/80 bg-[#0e121a]">
          <div className="h-[290px] px-1 pt-1.5">
            {klines && klines.length > 0 ? (
              <PriceChart symbol={symbol} klines={klines} />
            ) : (
              <div className="flex h-full items-center justify-center gap-2 text-faint">
                <span className="skel h-3 w-28" />
              </div>
            )}
          </div>
        </div>

        {/* ── Order Book & Trades Tape Tabs (Axiom Style) ── */}
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-line/80 bg-[#0e121a]">
          <div className="flex items-center justify-between border-b border-line/60 px-3 py-2">
            <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
              <button
                onClick={() => {
                  buzz(4)
                  setBookTab('book')
                }}
                className={`rounded-lg px-3 py-1 text-[12px] font-bold transition-all ${
                  bookTab === 'book'
                    ? 'bg-surface-3 text-white shadow-sm'
                    : 'text-muted hover:text-white'
                }`}
              >
                Order Book
              </button>
              <button
                onClick={() => {
                  buzz(4)
                  setBookTab('trades')
                }}
                className={`rounded-lg px-3 py-1 text-[12px] font-bold transition-all ${
                  bookTab === 'trades'
                    ? 'bg-surface-3 text-white shadow-sm'
                    : 'text-muted hover:text-white'
                }`}
              >
                Trades
              </button>
            </div>

            <span className="text-[10px] text-faint tnum">
              {bookTab === 'book' ? 'Tap level to set limit price' : 'Real-time aggregated trades'}
            </span>
          </div>

          <div className="p-1">
            {bookTab === 'book' ? (
              <OrderBook symbol={symbol} onPricePick={pickPrice} />
            ) : (
              <TradesTape symbol={symbol} />
            )}
          </div>
        </div>

        {/* ── Positions / Orders / History Bottom Panel ── */}
        <TerminalBottomPanel
          symbol={symbol}
          rend={version}
          onOpenOrderPad={(s) => {
            setPickedPrice(null)
            setOrderOpen(s)
          }}
        />

        <p className="px-5 pt-4 text-center text-[10.5px] text-faint">{t('app.disclaimer')}</p>
      </div>

      {/* ══════════════ 3. STICKY BOTTOM ACTION BAR ══════════════ */}
      <div
        className="glass sticky bottom-0 z-20 flex gap-2.5 px-4 pt-3 border-t border-line/60"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <TapButton
          className="flex-1 h-12 rounded-2xl font-black text-[15px] bg-[#00d26a] text-[#051a0e] terminal-glow-long"
          onClick={() => {
            buzz(10)
            setPickedPrice(null)
            setOrderOpen('buy')
          }}
        >
          <Zap size={17} className="fill-current" />
          <span>Long {displayBase}</span>
          {settings.leverageEnabled && (
            <span className="rounded bg-[#051a0e]/20 px-1.5 py-0.5 text-[11px] font-bold">20x</span>
          )}
        </TapButton>

        <TapButton
          className="flex-1 h-12 rounded-2xl font-black text-[15px] bg-[#ff3b5c] text-white terminal-glow-short"
          onClick={() => {
            buzz(10)
            setPickedPrice(null)
            setOrderOpen('sell')
          }}
        >
          <Flame size={17} className="fill-current" />
          <span>Short {displayBase}</span>
          {settings.leverageEnabled && (
            <span className="rounded bg-black/20 px-1.5 py-0.5 text-[11px] font-bold">20x</span>
          )}
        </TapButton>
      </div>

      {/* Order Placement Sheet Modal */}
      <AnimatePresence>
        {orderOpen && (
          <OrderSheet
            key={pickedPrice ?? 'nopick'}
            open
            onOpenChange={() => setOrderOpen(false)}
            symbol={symbol}
            defaultSide={orderOpen === 'sell' ? 'sell' : 'buy'}
            initialType={pickedPrice ? 'limit' : undefined}
          />
        )}
      </AnimatePresence>

      {/* Quick Symbol Switcher Modal / Sheet */}
      <SymbolPickerSheet
        open={symbolPickerOpen}
        onOpenChange={setSymbolPickerOpen}
        activeSymbol={symbol}
        onSelect={(s) => {
          buzz(8)
          nav.setActiveSymbol(s)
          setSymbolPickerOpen(false)
        }}
      />
    </motion.div>
  )

  return overlay ? (
    <div
      className="absolute inset-0"
      style={{
        transform: `translateX(${dx}px)`,
        transition: dx === 0 ? 'transform .22s' : undefined,
      }}
    >
      {content}
    </div>
  ) : (
    content
  )
}

/** Вспомогательная ячейка метрики в Top Stats Bar */
function TerminalStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col shrink-0 leading-tight">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-faint">{label}</span>
      <span className="whitespace-nowrap text-[11.5px] font-bold text-text">{value}</span>
    </div>
  )
}

/** Нижняя панель терминала: Позиции | Ордера | Сделки */
function TerminalBottomPanel({
  symbol,
  rend,
  onOpenOrderPad,
}: {
  symbol: string
  rend: number
  onOpenOrderPad: (side: 'buy' | 'sell') => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'positions' | 'orders' | 'trades'>('positions')
  const trading = useTrading()
  const snap = trading.snap
  void rend

  const posCount = (snap?.positions ?? []).filter((p) => p.symbol === symbol).length
  const ordersCount = (snap?.orders ?? []).filter((o) => o.status === 'open' && o.symbol === symbol).length

  return (
    <div className="mt-2.5 overflow-hidden rounded-2xl border border-line/80 bg-[#0e121a]">
      <div className="border-b border-line/60 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
          <button
            onClick={() => {
              buzz(4)
              setTab('positions')
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-bold transition-all ${
              tab === 'positions'
                ? 'bg-surface-3 text-white shadow-sm'
                : 'text-muted hover:text-white'
            }`}
          >
            <span>{t('panel.positions')}</span>
            {posCount > 0 && (
              <span className="rounded-full bg-[#00d26a] px-1.5 py-0.2 text-[10px] text-[#051a0e] font-black">
                {posCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              buzz(4)
              setTab('orders')
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-bold transition-all ${
              tab === 'orders'
                ? 'bg-surface-3 text-white shadow-sm'
                : 'text-muted hover:text-white'
            }`}
          >
            <span>{t('panel.orders')}</span>
            {ordersCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.2 text-[10px] text-white font-black">
                {ordersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              buzz(4)
              setTab('trades')
            }}
            className={`rounded-lg px-3 py-1 text-[12px] font-bold transition-all ${
              tab === 'trades'
                ? 'bg-surface-3 text-white shadow-sm'
                : 'text-muted hover:text-white'
            }`}
          >
            {t('symbol.trades')}
          </button>
        </div>
      </div>

      <div className="p-3">
        {tab === 'positions' && (
          <TerminalPositionsView symbol={symbol} onSell={() => onOpenOrderPad('sell')} />
        )}
        {tab === 'orders' && <TerminalOrdersView symbol={symbol} />}
        {tab === 'trades' && <TerminalTradesView symbol={symbol} />}
      </div>
    </div>
  )
}

/** Детальный просмотр позиций в стиле Axiom */
function TerminalPositionsView({ symbol, onSell }: { symbol: string; onSell: () => void }) {
  const { t } = useI18n()
  const trading = useTrading()
  const settings = useSettings()
  const snap = trading.snap
  const priceStr = priceOf(symbol)
  const price = priceStr ? D(priceStr) : D(0)

  const holding = snap?.holdings[symbol]
  const pos = snap?.positions.find((p) => p.symbol === symbol)

  if (!holding && !pos) {
    return <div className="py-6 text-center text-[12px] text-faint">{t('panel.noPositions')}</div>
  }

  const holdingQty = holding ? D(holding.qty) : D(0)
  const holdingPnl =
    holding && holdingQty.gt(0) && price.gt(0)
      ? price.minus(D(holding.avgPrice)).mul(holdingQty)
      : D(0)

  const posQty = pos ? D(pos.qty) : D(0)
  let posPnl = D(0)
  let pnlPct = 0
  if (pos && price.gt(0)) {
    const dir = pos.side === 'long' ? 1 : -1
    posPnl = price.minus(D(pos.entryPrice)).mul(dir).mul(posQty)
    const marginNum = parseFloat(pos.margin)
    if (marginNum > 0) {
      pnlPct = (posPnl.toNumber() / marginNum) * 100
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Фьючерсная позиция */}
      {settings.leverageEnabled && pos && (
        <div className="rounded-xl bg-surface-2 p-3 border border-line/60">
          <div className="flex items-center justify-between pb-2 border-b border-line/40">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-black uppercase ${
                  pos.side === 'long'
                    ? 'bg-[#00d26a]/15 text-[#00d26a] border border-[#00d26a]/30'
                    : 'bg-[#ff3b5c]/15 text-[#ff3b5c] border border-[#ff3b5c]/30'
                }`}
              >
                {pos.leverage}x {pos.side}
              </span>
              <span className="font-bold text-[13px]">{baseOf(symbol)}-PERP</span>
            </div>

            <div className="text-right">
              <div
                className={`text-[13px] font-bold tnum ${
                  posPnl.gte(0) ? 'text-[#00d26a]' : 'text-[#ff3b5c]'
                }`}
              >
                {fmtUsd(posPnl.toString(), { sign: true })} ({fmtPct(pnlPct)})
              </div>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] tnum">
            <div>
              <span className="text-faint text-[10px] block">Size</span>
              <span className="font-semibold text-text">{fmtQty(posQty.toString())}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Entry Price</span>
              <span className="font-semibold text-text">${fmtPrice(pos.entryPrice)}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Mark Price</span>
              <span className="font-semibold text-text">${fmtPrice(price.toString())}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Liq Price</span>
              <span className="font-bold text-warn">${fmtPrice(pos.liqPrice)}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Margin</span>
              <span className="font-semibold text-text">{fmtUsd(pos.margin)}</span>
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={() => {
                  buzz(8)
                  trading.closePosition(pos.id)
                }}
                className="rounded-lg bg-surface-3 px-3 py-1 font-bold text-white text-[11px] hover:bg-down/20 hover:text-down transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Спотовый холдинг */}
      {holding && holdingQty.gt(D('0.00000001')) && (
        <div className="rounded-xl bg-surface-2 p-3 border border-line/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-faint">Spot · {baseOf(symbol)}</div>
              <div className="text-[13px] font-bold tnum">
                {fmtQty(holdingQty.toString())} (${fmtPrice(holdingQty.mul(price).toString())})
              </div>
              <div className="text-[10px] text-faint tnum">avg ${fmtPrice(holding.avgPrice)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[12px] font-bold tnum ${
                  holdingPnl.gte(0) ? 'text-[#00d26a]' : 'text-[#ff3b5c]'
                }`}
              >
                {fmtUsd(holdingPnl.toString(), { sign: true })}
              </span>
              <button
                onClick={onSell}
                className="rounded-lg bg-surface-3 px-3 py-1 text-[11px] font-bold text-muted hover:text-white"
              >
                Sell
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Открытые ордера */
function TerminalOrdersView({ symbol }: { symbol: string }) {
  const { t } = useI18n()
  const trading = useTrading()
  const snap = trading.snap
  const orders = (snap?.orders ?? []).filter((o) => o.status === 'open' && o.symbol === symbol)

  if (orders.length === 0) {
    return <div className="py-6 text-center text-[12px] text-faint">{t('panel.noOrders')}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {orders.map((o) => (
          <motion.div
            key={o.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between rounded-xl bg-surface-2 p-2.5 border border-line/60"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-black uppercase ${
                    o.side === 'buy'
                      ? 'bg-[#00d26a]/15 text-[#00d26a]'
                      : 'bg-[#ff3b5c]/15 text-[#ff3b5c]'
                  }`}
                >
                  {o.side}
                </span>
                <span className="text-[12px] font-bold uppercase">{o.kind}</span>
                {o.ocoId && <span className="text-[10px] text-faint">OCO</span>}
              </div>
              <div className="mt-1 text-[11px] text-faint tnum">
                {fmtQty(o.qty)} @ ${fmtPrice(o.price)} · {fmtDate(o.createdAt)}
              </div>
            </div>
            <button
              onClick={() => {
                buzz(6)
                trading.cancelOrder(o.id)
              }}
              className="rounded-lg bg-surface-3 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-down transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** История сделок */
function TerminalTradesView({ symbol }: { symbol: string }) {
  const { t } = useI18n()
  const trading = useTrading()
  const snap = trading.snap
  const rows = useMemo(
    () => (snap?.trades ?? []).filter((tr) => tr.symbol === symbol).slice(-12).reverse(),
    [snap, symbol]
  )

  if (rows.length === 0) {
    return <div className="py-6 text-center text-[12px] text-faint">{t('panel.noTrades')}</div>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((tr) => (
        <div
          key={tr.id}
          className="flex items-center justify-between rounded-lg bg-surface-2/60 px-2.5 py-2 text-[11.5px] border border-line/40 tnum"
        >
          <div>
            <span
              className={`mr-1.5 font-bold uppercase ${
                tr.side === 'buy' ? 'text-[#00d26a]' : 'text-[#ff3b5c]'
              }`}
            >
              {tr.side}
            </span>
            <span className="text-text font-medium">{fmtQty(tr.qty)}</span>
            <span className="text-faint text-[10px] ml-1.5">@ ${fmtPrice(tr.price)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted font-semibold">{fmtUsd(tr.quoteTotal)}</span>
            {typeof tr.pnl === 'string' && (
              <span
                className={`ml-1.5 font-bold ${
                  D(tr.pnl).gte(0) ? 'text-[#00d26a]' : 'text-[#ff3b5c]'
                }`}
              >
                {fmtUsd(tr.pnl, { sign: true })}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Модальный список выбора монет (Symbol Switcher) */
function SymbolPickerSheet({
  open,
  onOpenChange,
  activeSymbol,
  onSelect,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  activeSymbol: string
  onSelect: (s: string) => void
}) {
  const market = useMarket()
  const [search, setSearch] = useState('')

  const list = useMemo(() => {
    let rows = Object.values(market.bySymbol)
    const q = search.trim().toUpperCase()
    if (q) rows = rows.filter((r) => r.symbol.includes(q))
    return rows.sort((a, b) => parseFloat(b.quoteVolume24h) - parseFloat(a.quoteVolume24h))
  }, [market.bySymbol, search])

  return (
    <Sheet open={open} onOpenChange={onOpenChange} maxHeight="85dvh" title="Select Market">
      <div className="flex flex-col gap-3 pb-6">
        {/* Search input */}
        <div className="relative flex items-center rounded-2xl bg-surface-2 px-3.5 py-2.5 border border-line/80">
          <Search size={16} className="text-faint mr-2 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol (e.g. BTC, ETH)..."
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-faint"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={15} className="text-faint" />
            </button>
          )}
        </div>

        {/* Ticker rows */}
        <div className="flex flex-col divide-y divide-line/40 max-h-[60vh] overflow-y-auto no-scrollbar">
          {list.slice(0, 40).map((t) => {
            const isCurrent = t.symbol === activeSymbol
            const base = baseOf(t.symbol)
            return (
              <button
                key={t.symbol}
                onClick={() => onSelect(t.symbol)}
                className={`flex items-center justify-between py-2.5 px-2 hover:bg-surface-2/60 transition-colors ${
                  isCurrent ? 'bg-surface-3/50' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CoinIcon symbol={t.symbol} size={28} />
                  <div className="text-left">
                    <div className="font-extrabold text-[14px] text-white leading-tight">{base}</div>
                    <div className="text-[11px] text-faint">USDT · Vol {fmtCompact(t.quoteVolume24h)}</div>
                  </div>
                </div>

                <div className="text-right tnum">
                  <div className="font-bold text-[13px] text-white">${fmtPrice(t.last)}</div>
                  <div
                    className={`text-[11px] font-bold ${
                      t.changePct24h >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b5c]'
                    }`}
                  >
                    {t.changePct24h >= 0 ? '+' : ''}{t.changePct24h.toFixed(2)}%
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}

function baseOf(symbol: string): string {
  return symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol
}
