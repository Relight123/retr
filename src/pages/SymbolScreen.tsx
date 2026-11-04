/** Экран монеты в минималистичном стиле (Phantom / Apple / Clean TradingView):
 *  - Header: аватарка монеты (32px), тикер, chevron выбора монеты, избранное, статус соединения
 *  - Large Price & Change: крупная цена с табличными цифрами, лаконичный процентный чип
 *  - Clean Secondary Stats: элегантная строка (Vol 24h · High · Low)
 *  - Minimalist Timeframe Pills: 1m, 5m, 15m, 1h, 4h, 1d
 *  - Seamless Chart: бесшовный контейнер со скруглением 16px
 *  - Order Book / Trades: лаконичный сегмент-контрол
 *  - Bottom Action Bar: цельные минималистичные кнопки Buy / Long и Sell / Short */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  ChevronDown,
  ChevronLeft,
  Search,
  X,
  Zap,
  Flame,
} from 'lucide-react'
import { useNav } from '../store/navigation'
import { useMarket } from '../store/market'
import { useMarketVersion, useTicker } from '../hooks/useTickerPrice'
import { useTrading, priceOf } from '../store/trading'
import { StatusDot } from '../components/Atomics'
import { CoinIcon } from '../components/CoinIcon'
import { TapButton, Sheet } from '../components/ui'
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
import type { Interval } from '../api/types'

const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d']

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
  const meta = useCoinMeta(displayBase)
  const coinName = meta?.name ?? (dexAlias ? dexAlias.baseName : '')

  const last = dexAlias
    ? market.dexPrices[`${dexAlias.chainId}:${dexAlias.pairAddress}`] ?? dexAlias.priceUsd
    : ticker?.last ?? ''
  const pct = dexAlias ? dexAlias.changePct24h : ticker?.changePct24h ?? 0

  const { dx } = useSwipeBack(() => onBack?.(), overlay)

  const [orderOpen, setOrderOpen] = useState<false | 'buy' | 'sell'>(false)
  const [pickedPrice, setPickedPrice] = useState<string | null>(null)
  const [bookTab, setBookTab] = useState<'book' | 'trades'>('book')
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)

  // Мягкий цветовой импульс при тике
  const prevLastRef = useRef('')
  const [tickCls, setTickCls] = useState('')

  useEffect(() => {
    if (!last) return
    const prev = prevLastRef.current
    prevLastRef.current = last
    if (!prev || prev === last) return
    const isUp = parseFloat(last) >= parseFloat(prev)
    setTickCls(isUp ? 'tick-up' : 'tick-down')
    const timer = window.setTimeout(() => setTickCls(''), 600)
    return () => window.clearTimeout(timer)
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

  const isFavorited = market.favorites.includes(symbol)

  const content = (
    <motion.div
      initial={overlay ? { x: 30, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      exit={overlay ? { x: 30, opacity: 0 } : { opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="absolute inset-0 flex flex-col bg-[#0a0d14] text-text"
      style={{ touchAction: 'pan-y' }}
      drag={overlay ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.35 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onBack?.()
      }}
    >
      {/* ══════════════ 1. HEADER (MINIMAL & CALM) ══════════════ */}
      <div
        className="glass sticky top-0 z-30 border-b border-line px-4 pb-3"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
      >
        {/* Top bar: Back, Coin selector, Star, Status */}
        <div className="flex items-center justify-between gap-2 min-h-[40px]">
          <div className="flex items-center gap-2.5 min-w-0">
            {overlay && onBack && (
              <button
                onClick={() => {
                  buzz(6)
                  onBack()
                }}
                className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-white transition-colors"
                aria-label="back"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Coin Avatar & Symbol Dropdown Button */}
            <button
              onClick={() => {
                buzz(6)
                setSymbolPickerOpen(true)
              }}
              className="flex items-center gap-2.5 py-1 px-1.5 -ml-1.5 rounded-xl hover:bg-surface-2/60 transition-colors"
            >
              <CoinIcon symbol={symbol} size={32} layoutId={`coin-${symbol}`} />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-[17px] tracking-tight text-white">{displayBase}</span>
                  <span className="text-[12px] font-medium text-faint">/USDT</span>
                  <ChevronDown size={14} className="text-muted ml-0.5" />
                </div>
                {coinName && (
                  <span className="text-[11px] text-faint font-normal mt-0.5">{coinName}</span>
                )}
              </div>
            </button>

            {/* Favorite Star */}
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
                  className={isFavorited ? 'fill-warn text-warn' : 'text-faint hover:text-muted'}
                />
              </button>
            )}
          </div>

          {/* Right: Live Connection Dot */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusDot />
          </div>
        </div>

        {/* Price & 24h Change Row */}
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span
              className={`text-[32px] sm:text-[36px] font-semibold tracking-tight text-white tnum leading-tight transition-colors ${tickCls}`}
            >
              {last ? `$${fmtPrice(parseFloat(last))}` : '—'}
            </span>

            <div
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium tnum ${
                pct >= 0
                  ? 'bg-[#00c076]/10 text-[#00c076]'
                  : 'bg-[#ff3b5c]/10 text-[#ff3b5c]'
              }`}
            >
              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
            </div>
          </div>

          {pct !== 0 && last && (
            <span className="text-[12px] font-normal text-muted tnum">
              {pct >= 0 ? '+' : '-'}${fmtPrice(Math.abs((parseFloat(last) * pct) / 100))}
            </span>
          )}
        </div>

        {/* ══════════════ 2. CLEAN SECONDARY STATS ROW ══════════════ */}
        <div className="mt-2.5 flex items-center gap-2.5 text-[11.5px] text-muted tnum overflow-x-auto no-scrollbar pt-1 border-t border-line">
          <span className="whitespace-nowrap">
            <span className="text-faint">Vol 24h: </span>
            <span className="text-text font-medium">
              ${fmtCompact(ticker?.quoteVolume24h ?? '5120000000')}
            </span>
          </span>
          <span className="text-faint/50">·</span>
          <span className="whitespace-nowrap">
            <span className="text-faint">High: </span>
            <span className="text-text font-medium">
              ${ticker?.high24h ? fmtPrice(parseFloat(ticker.high24h)) : '—'}
            </span>
          </span>
          <span className="text-faint/50">·</span>
          <span className="whitespace-nowrap">
            <span className="text-faint">Low: </span>
            <span className="text-text font-medium">
              ${ticker?.low24h ? fmtPrice(parseFloat(ticker.low24h)) : '—'}
            </span>
          </span>
        </div>
      </div>

      {/* ══════════════ SCROLLABLE CONTENT ══════════════ */}
      <div className="scroll flex-1 px-3 pt-2.5" style={{ paddingBottom: 24 }}>
        {/* Timeframe & Chart Style Switcher */}
        <div className="flex items-center justify-between pb-1.5 pt-0.5">
          {/* Timeframe Minimal Pills */}
          <div className="flex items-center gap-1">
            {INTERVALS.map((iv) => {
              const active = nav.interval === iv
              return (
                <button
                  key={iv}
                  onClick={() => {
                    buzz(4)
                    nav.setInterval(iv)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-surface-3 text-white'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {iv}
                </button>
              )
            })}
          </div>

          {/* Chart Style (Candles / Line) */}
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5">
            <button
              onClick={() => {
                buzz(4)
                nav.setChartStyle('candles')
              }}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                nav.chartStyle === 'candles'
                  ? 'bg-surface-3 text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => {
                buzz(4)
                nav.setChartStyle('line')
              }}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                nav.chartStyle === 'line'
                  ? 'bg-surface-3 text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* OHLC Bar */}
        {latestKline && !isDex && (
          <div className="mt-0.5 mb-1 flex flex-wrap items-center gap-x-2 text-[10.5px] font-mono text-faint tnum px-0.5">
            <span>O: <span className="text-muted">${fmtPrice(latestKline.open)}</span></span>
            <span>H: <span className="text-muted">${fmtPrice(latestKline.high)}</span></span>
            <span>L: <span className="text-muted">${fmtPrice(latestKline.low)}</span></span>
            <span>C: <span className="text-muted">${fmtPrice(latestKline.close)}</span></span>
          </div>
        )}

        {/* ── Seamless Minimalist Chart Container ── */}
        <div className="overflow-hidden rounded-[16px] bg-surface border border-line">
          <div className="h-[290px] px-1 pt-1">
            {klines && klines.length > 0 ? (
              <PriceChart symbol={symbol} klines={klines} />
            ) : (
              <div className="flex h-full items-center justify-center text-faint">
                <span className="skel h-3 w-28" />
              </div>
            )}
          </div>
        </div>

        {/* ── Order Book & Trades Tape Tabs ── */}
        <div className="mt-3 overflow-hidden rounded-[16px] bg-surface border border-line">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
            <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-0.5">
              <button
                onClick={() => {
                  buzz(4)
                  setBookTab('book')
                }}
                className={`rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
                  bookTab === 'book'
                    ? 'bg-surface-3 text-white'
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
                className={`rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
                  bookTab === 'trades'
                    ? 'bg-surface-3 text-white'
                    : 'text-muted hover:text-white'
                }`}
              >
                Trades
              </button>
            </div>

            <span className="text-[11px] text-faint tnum">
              {bookTab === 'book' ? 'Tap level to set price' : 'Real-time trades'}
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

        {/* ── Positions / Orders / Trades Bottom Panel ── */}
        <TerminalBottomPanel
          symbol={symbol}
          rend={version}
          onOpenOrderPad={(s) => {
            setPickedPrice(null)
            setOrderOpen(s)
          }}
        />

        <p className="px-5 pt-4 text-center text-[11px] text-faint">{t('app.disclaimer')}</p>
      </div>

      {/* ══════════════ 3. MINIMAL SOLID BOTTOM ACTION BAR ══════════════ */}
      <div
        className="glass sticky bottom-0 z-20 flex gap-2.5 px-4 pt-3 border-t border-line"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <TapButton
          className="flex-1 h-12 rounded-xl font-semibold text-[15px] bg-[#00c076] text-[#032014]"
          onClick={() => {
            buzz(10)
            setPickedPrice(null)
            setOrderOpen('buy')
          }}
        >
          <Zap size={16} className="fill-current" />
          <span>Long {displayBase}</span>
          {settings.leverageEnabled && (
            <span className="rounded bg-black/15 px-1.5 py-0.5 text-[11px] font-semibold">20x</span>
          )}
        </TapButton>

        <TapButton
          className="flex-1 h-12 rounded-xl font-semibold text-[15px] bg-[#ff3b5c] text-white"
          onClick={() => {
            buzz(10)
            setPickedPrice(null)
            setOrderOpen('sell')
          }}
        >
          <Flame size={16} className="fill-current" />
          <span>Short {displayBase}</span>
          {settings.leverageEnabled && (
            <span className="rounded bg-black/25 px-1.5 py-0.5 text-[11px] font-semibold">20x</span>
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

      {/* Quick Symbol Switcher Modal */}
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

/** Нижняя панель: Позиции | Ордера | Сделки */
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
    <div className="mt-3 overflow-hidden rounded-[16px] bg-surface border border-line">
      <div className="border-b border-line px-3.5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-0.5">
          <button
            onClick={() => {
              buzz(4)
              setTab('positions')
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
              tab === 'positions'
                ? 'bg-surface-3 text-white'
                : 'text-muted hover:text-white'
            }`}
          >
            <span>{t('panel.positions')}</span>
            {posCount > 0 && (
              <span className="rounded-full bg-[#00c076] px-1.5 py-0.2 text-[10px] text-[#032014] font-bold">
                {posCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              buzz(4)
              setTab('orders')
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
              tab === 'orders'
                ? 'bg-surface-3 text-white'
                : 'text-muted hover:text-white'
            }`}
          >
            <span>{t('panel.orders')}</span>
            {ordersCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.2 text-[10px] text-white font-bold">
                {ordersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              buzz(4)
              setTab('trades')
            }}
            className={`rounded-lg px-3 py-1 text-[12px] font-medium transition-colors ${
              tab === 'trades'
                ? 'bg-surface-3 text-white'
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

/** Детальный просмотр позиций */
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
    <div className="flex flex-col gap-2.5">
      {/* Фьючерсная позиция */}
      {settings.leverageEnabled && pos && (
        <div className="rounded-xl bg-surface-2 p-3 border border-line">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  pos.side === 'long'
                    ? 'bg-[#00c076]/10 text-[#00c076]'
                    : 'bg-[#ff3b5c]/10 text-[#ff3b5c]'
                }`}
              >
                {pos.leverage}x {pos.side}
              </span>
              <span className="font-semibold text-[13px]">{baseOf(symbol)}-PERP</span>
            </div>

            <div className="text-right">
              <div
                className={`text-[13px] font-semibold tnum ${
                  posPnl.gte(0) ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                }`}
              >
                {fmtUsd(posPnl.toString(), { sign: true })} ({fmtPct(pnlPct)})
              </div>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] tnum">
            <div>
              <span className="text-faint text-[10px] block">Size</span>
              <span className="font-medium text-text">{fmtQty(posQty.toString())}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Entry Price</span>
              <span className="font-medium text-text">${fmtPrice(pos.entryPrice)}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Mark Price</span>
              <span className="font-medium text-text">${fmtPrice(price.toString())}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Liq Price</span>
              <span className="font-semibold text-warn">${fmtPrice(pos.liqPrice)}</span>
            </div>
            <div>
              <span className="text-faint text-[10px] block">Margin</span>
              <span className="font-medium text-text">{fmtUsd(pos.margin)}</span>
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={() => {
                  buzz(8)
                  trading.closePosition(pos.id)
                }}
                className="rounded-lg bg-surface-3 px-2.5 py-1 font-medium text-white text-[11px] hover:bg-down/20 hover:text-down transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Спотовый холдинг */}
      {holding && holdingQty.gt(D('0.00000001')) && (
        <div className="rounded-xl bg-surface-2 p-3 border border-line">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-faint">Spot · {baseOf(symbol)}</div>
              <div className="text-[13px] font-semibold tnum">
                {fmtQty(holdingQty.toString())} (${fmtPrice(holdingQty.mul(price).toString())})
              </div>
              <div className="text-[10px] text-faint tnum">avg ${fmtPrice(holding.avgPrice)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[12px] font-semibold tnum ${
                  holdingPnl.gte(0) ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                }`}
              >
                {fmtUsd(holdingPnl.toString(), { sign: true })}
              </span>
              <button
                onClick={onSell}
                className="rounded-lg bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-muted hover:text-white transition-colors"
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
            className="flex items-center justify-between rounded-xl bg-surface-2 p-2.5 border border-line"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                    o.side === 'buy'
                      ? 'bg-[#00c076]/10 text-[#00c076]'
                      : 'bg-[#ff3b5c]/10 text-[#ff3b5c]'
                  }`}
                >
                  {o.side}
                </span>
                <span className="text-[12px] font-semibold uppercase">{o.kind}</span>
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
              className="rounded-lg bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-muted hover:text-down transition-colors"
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
          className="flex items-center justify-between rounded-lg bg-surface-2/60 px-2.5 py-2 text-[11.5px] border border-line/50 tnum"
        >
          <div>
            <span
              className={`mr-1.5 font-bold uppercase ${
                tr.side === 'buy' ? 'text-[#00c076]' : 'text-[#ff3b5c]'
              }`}
            >
              {tr.side}
            </span>
            <span className="text-text font-medium">{fmtQty(tr.qty)}</span>
            <span className="text-faint text-[10px] ml-1.5">@ ${fmtPrice(tr.price)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted font-medium">{fmtUsd(tr.quoteTotal)}</span>
            {typeof tr.pnl === 'string' && (
              <span
                className={`ml-1.5 font-semibold ${
                  D(tr.pnl).gte(0) ? 'text-[#00c076]' : 'text-[#ff3b5c]'
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
        <div className="relative flex items-center rounded-xl bg-surface-2 px-3 py-2 border border-line">
          <Search size={16} className="text-faint mr-2 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coin (e.g. BTC, ETH)..."
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
                className={`flex items-center justify-between py-2.5 px-2 hover:bg-surface-2/60 transition-colors rounded-lg ${
                  isCurrent ? 'bg-surface-3/50' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CoinIcon symbol={t.symbol} size={28} />
                  <div className="text-left">
                    <div className="font-semibold text-[14px] text-white leading-tight">{base}</div>
                    <div className="text-[11px] text-faint">USDT · Vol ${fmtCompact(t.quoteVolume24h)}</div>
                  </div>
                </div>

                <div className="text-right tnum">
                  <div className="font-medium text-[13px] text-white">${fmtPrice(t.last)}</div>
                  <div
                    className={`text-[11px] font-medium ${
                      t.changePct24h >= 0 ? 'text-[#00c076]' : 'text-[#ff3b5c]'
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
