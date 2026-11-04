/** Экран монеты в стиле Moonshot:
 *  - Header bar:
 *    - Back arrow <
 *    - Symbol + viewers count: BTC | 👁 668 (viewers count with eye icon)
 *    - Right: Pill button 🔄 Спот ▾, ☆ favorite, 📤 share
 *  - Coin Hero:
 *    - Large Bitcoin circular avatar (orange with ₿, chain pill badge in corner)
 *    - Title: Bitcoin with leverage badge 40x
 *    - Subtitle: BTC
 *    - Right side: Large clean price $80 598,00 with green pill ↑ 3,8%
 *    - Subtitle quote: "228 холдеров, никого из тех, кого ты следишь"
 *  - Chart Section:
 *    - Clean area line chart with gradient fill under green price line (or candles)
 *    - Price badge on right axis: [ $80,598 ◂ ]
 *    - Timeframe pills below chart: 4ч, 1д, 1н, 1мес, 1г, Все
 *  - Moonshot Tabs below chart:
 *    - Примечания (Открытые / Закрытые, Paper Trail), Держатели (OrderBook), О приложении
 *  - Bottom Trade Buttons:
 *    - Floating bottom bar with "Купить" (large green pill #00d26a) and "Продать" (sleek dark/red button)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronDown,
  Star,
  Share2,
  Eye,
  ArrowLeftRight,
  ArrowUpDown,
  Lock,
  Copy,
  ExternalLink,
  Search,
  X,
  Check,
  Flame,
  Zap,
} from 'lucide-react'
import { useNav } from '../store/navigation'
import { useMarket } from '../store/market'
import { useMarketVersion, useTicker } from '../hooks/useTickerPrice'
import { useTrading, priceOf } from '../store/trading'
import { CoinIcon } from '../components/CoinIcon'
import { NetworkBadge } from '../components/CryptoSvg'
import { PriceChart } from '../components/PriceChart'
import { OrderBook } from '../components/OrderBook'
import { TradesTape } from '../components/TradesTape'
import { OrderSheet } from '../components/OrderSheet'
import { Sheet } from '../components/ui'
import { useSwipeBack } from '../hooks/useSwipeBack'
import { useI18n } from '../lib/i18n'
import { useCoinMeta } from '../hooks/useCoinMeta'
import {
  fmtPrice,
  fmtQty,
  fmtCompact,
  fmtUsd,
  fmtDate,
  fmtPct,
  fmtMoonshotPrice,
  fmtMoonshotArrowPct,
} from '../lib/format'
import { D } from '../lib/engine'
import { useSettings } from '../store/settings'
import { useToasts } from '../store/toasts'
import { buzz } from '../lib/haptics'
import type { Interval } from '../api/types'

export function SymbolScreen({ overlay, onBack }: { overlay: boolean; onBack?: () => void }) {
  const { t } = useI18n()
  const nav = useNav()
  const market = useMarket()
  const trading = useTrading()
  const version = useMarketVersion()
  const settings = useSettings()
  const toasts = useToasts()

  const symbol = nav.activeSymbol
  const ticker = useTicker(symbol)
  const dexAlias = market.aliases[symbol]
  const isDex = !dexAlias
  const displayBase = baseOf(symbol)
  const meta = useCoinMeta(displayBase)
  const coinName = meta?.name ?? (dexAlias ? dexAlias.baseName : displayBase === 'BTC' ? 'Bitcoin' : displayBase)

  const last = dexAlias
    ? market.dexPrices[`${dexAlias.chainId}:${dexAlias.pairAddress}`] ?? dexAlias.priceUsd
    : ticker?.last ?? ''
  const pct = dexAlias ? dexAlias.changePct24h : ticker?.changePct24h ?? 0
  const isUp = pct >= 0
  const arrowPct = fmtMoonshotArrowPct(pct)

  const { dx } = useSwipeBack(() => onBack?.(), overlay)

  const [orderOpen, setOrderOpen] = useState<false | 'buy' | 'sell'>(false)
  const [pickedPrice, setPickedPrice] = useState<string | null>(null)
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)
  const [isPerpMode, setIsPerpMode] = useState(true)

  // Moonshot tabs: Примечания | Держатели | О приложении
  const [activeMainTab, setActiveMainTab] = useState<'notes' | 'holders' | 'about'>('notes')
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open')

  // Live viewers simulation (oscillates slightly around 667 like Moonshot)
  const [viewersCount, setViewersCount] = useState(667)
  useEffect(() => {
    const timer = setInterval(() => {
      setViewersCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2
        return Math.max(520, Math.min(890, prev + delta))
      })
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  // Подписка на график свечей
  useEffect(() => {
    if (!overlay) {
      market.bindChart(symbol, nav.interval)
      void market.fetchKlines(symbol, nav.interval as Interval).catch(() => null)
      return () => market.unbindChart()
    }
  }, [overlay, symbol, nav.interval])

  const klines = market.candlesCache(symbol, nav.interval)

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

  const isFavorited = market.favorites.includes(symbol)

  // Share handler
  const handleShare = async () => {
    buzz(6)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${coinName} (${displayBase})`,
          text: `Следите за ${coinName} на Moonshot! Текущая цена: $${fmtPrice(last)}`,
          url: window.location.href,
        })
        return
      } catch {
        /* fallback to clipboard */
      }
    }
    await navigator.clipboard.writeText(window.location.href).catch(() => null)
    toasts.push('info', 'Ссылка на монету скопирована')
  }

  const content = (
    <motion.div
      initial={overlay ? { x: 30, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      exit={overlay ? { x: 30, opacity: 0 } : { opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="absolute inset-0 flex flex-col bg-[#080b11] text-white select-none"
      style={{ touchAction: 'pan-y' }}
      drag={overlay ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.35 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onBack?.()
      }}
    >
      {/* ══════════════ 1. MOONSHOT HEADER BAR ══════════════ */}
      <div
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080b11]/95 px-4 pb-2.5 backdrop-blur-md"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 10px) + 8px)' }}
      >
        <div className="flex items-center justify-between gap-2 min-h-[42px]">
          {/* Left: Back chevron + Symbol + Viewers count */}
          <div className="flex items-center gap-2">
            {overlay && onBack ? (
              <button
                onClick={() => {
                  buzz(6)
                  onBack()
                }}
                className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
                aria-label="Назад"
              >
                <ChevronLeft size={24} />
              </button>
            ) : (
              <button
                onClick={() => {
                  buzz(6)
                  setSymbolPickerOpen(true)
                }}
                className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <button
              onClick={() => {
                buzz(6)
                setSymbolPickerOpen(true)
              }}
              className="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="font-bold text-[17px] tracking-tight text-white">{displayBase}</span>
              <span className="text-white/20 text-xs">|</span>
              <div className="flex items-center gap-1 text-[13px] text-gray-400 font-medium">
                <Eye size={14} className="text-gray-400" />
                <span>{viewersCount}</span>
              </div>
            </button>
          </div>

          {/* Right: Pill Mode Switcher (Спот / Перпы) + Star + Share */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pill button: ⇄ Перпы ∨ / ⇄ Спот ∨ */}
            <button
              onClick={() => {
                buzz(8)
                setIsPerpMode((p) => !p)
                toasts.push('info', isPerpMode ? 'Режим переключен: Спот' : 'Режим переключен: Перпы (40x)')
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161a24] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/10 transition-colors shadow-sm"
            >
              <ArrowLeftRight size={12} className="text-gray-400" />
              <span>{isPerpMode ? 'Перпы' : 'Спот'}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Favorite Star */}
            <button
              onClick={() => {
                buzz(6)
                market.toggleFavorite(symbol)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
              aria-label="В избранное"
            >
              <Star
                size={19}
                className={isFavorited ? 'fill-[#eab308] text-[#eab308]' : 'text-gray-400 hover:text-white'}
              />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
              aria-label="Поделиться"
            >
              <Share2 size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* ══════════════ 2. MOONSHOT COIN HERO ══════════════ */}
        <div className="mt-3.5 flex items-center justify-between gap-3">
          {/* Coin Avatar + Title + Leverage pill + Subtitle */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <CoinIcon symbol={symbol} size={52} />
              {/* Corner chain pill badge (Solana vector gradient) */}
              <div className="absolute -bottom-1 -right-1">
                <NetworkBadge chain="sol" size={18} />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-bold text-white tracking-tight leading-tight">
                  {coinName}
                </span>
                {isPerpMode && (
                  <span className="rounded-md bg-[#222733] px-2 py-0.5 text-[11px] font-bold text-gray-300">
                    40x
                  </span>
                )}
              </div>
              <span className="text-[13px] font-normal text-gray-400 mt-0.5">{displayBase}</span>
            </div>
          </div>

          {/* Right: Large Clean Price + Green Pill Change */}
          <div className="flex flex-col items-end">
            <span className="text-[28px] sm:text-[32px] font-bold tracking-tight text-white leading-tight tnum">
              {last ? `$${fmtMoonshotPrice(last)}` : '$80 226,01'}
            </span>

            <div
              className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold tnum ${
                isUp ? 'bg-[#133023] text-[#00d26a]' : 'bg-[#30161d] text-[#ff3b5c]'
              }`}
            >
              <span>{arrowPct.text}</span>
            </div>
          </div>
        </div>

        {/* Subtitle Quote in Russian */}
        <div className="mt-2 text-[12px] text-gray-400 font-normal">
          228 холдеров, никого из тех, кого ты следишь
        </div>
      </div>

      {/* ══════════════ 3. SCROLLABLE CHART & TABS CONTENT ══════════════ */}
      <div
        className="scroll flex-1 px-3 pt-2"
        style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 8px) + 72px)' }}
      >
        {/* Seamless Chart Container */}
        <div className="overflow-hidden rounded-[20px] bg-[#0c1017] border border-white/[0.06] shadow-xl">
          <div className="h-[310px]">
            {klines && klines.length > 0 ? (
              <PriceChart symbol={symbol} klines={klines} />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                <span className="skel h-3 w-28" />
              </div>
            )}
          </div>
        </div>

        {/* ══════════════ 4. MOONSHOT TABS SECTION ══════════════ */}
        <div className="mt-4">
          {/* Main 3 Tabs: Примечания | Держатели | О приложении */}
          <div className="flex items-center border-b border-white/[0.08] px-2">
            {[
              { id: 'notes', label: 'Примечания' },
              { id: 'holders', label: 'Держатели' },
              { id: 'about', label: 'О приложении' },
            ].map((tab) => {
              const active = activeMainTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    buzz(4)
                    setActiveMainTab(tab.id as any)
                  }}
                  className={`relative py-2.5 px-3 text-[14px] font-semibold transition-colors ${
                    active ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.div
                      layoutId="moonshot-tab-underline"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Sub-Filters: Открытые | Закрытые + Самые последние */}
          {activeMainTab === 'notes' && (
            <div className="mt-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    buzz(4)
                    setActiveFilter('open')
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    activeFilter === 'open'
                      ? 'bg-[#222735] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Открытые
                </button>
                <button
                  onClick={() => {
                    buzz(4)
                    setActiveFilter('closed')
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    activeFilter === 'closed'
                      ? 'bg-[#222735] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Закрытые
                </button>
              </div>

              <div className="flex items-center gap-1 text-[12px] font-medium text-gray-400 hover:text-white cursor-pointer">
                <ArrowUpDown size={13} />
                <span>Самые последние</span>
              </div>
            </div>
          )}

          {/* TAB 1: ПРИМЕЧАНИЯ (Open/Closed Positions + Social Paper Trail) */}
          {activeMainTab === 'notes' && (
            <div className="mt-3 flex flex-col gap-3">
              {activeFilter === 'open' ? (
                <>
                  {/* Real Open Positions / Holdings */}
                  <MoonshotOpenPositionsView
                    symbol={symbol}
                    onClosePosition={(posId) => trading.closePosition(posId)}
                  />

                  {/* Moonshot Social Feed Post Preview (From user screenshot: LUMIERESOL Paper Trail) */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121620] p-4 shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e2535] border border-white/10 font-bold text-gray-300 text-xs">
                        L
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                          <span>LUMIERESOL</span>
                          <span className="text-gray-500 font-normal">· 19м назад</span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-normal">Paper Trail Verified</div>
                      </div>
                    </div>

                    {/* Lock Regional Banner Card (exact from Moonshot screenshot) */}
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#0b0e14]/90 py-3 px-4 text-[13px] font-medium text-gray-300">
                      <Lock size={15} className="text-gray-400" />
                      <span>Недоступно в вашем регионе</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Closed positions history */
                <MoonshotClosedTradesView symbol={symbol} />
              )}
            </div>
          )}

          {/* TAB 2: ДЕРЖАТЕЛИ (Holders & Live OrderBook) */}
          {activeMainTab === 'holders' && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-3.5 shadow-lg">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <span className="text-[13px] font-bold text-white">Стакан заявок & Сделки</span>
                  <span className="text-[11px] text-gray-400">В реальном времени</span>
                </div>
                <OrderBook
                  symbol={symbol}
                  onPricePick={(p, side) => {
                    buzz(6)
                    setPickedPrice(p)
                    setOrderOpen(side)
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-3.5 shadow-lg">
                <div className="mb-2 text-[13px] font-bold text-white">Лента последних сделок</div>
                <TradesTape symbol={symbol} />
              </div>
            </div>
          )}

          {/* TAB 3: О ПРИЛОЖЕНИИ / О МОНЕТЕ */}
          {activeMainTab === 'about' && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 shadow-lg">
                <div className="text-[14px] font-bold text-white mb-3">Информация о токене</div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Рыночная капитализация</span>
                    <span className="text-white font-semibold">$1,58 Трлн</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Объем 24ч</span>
                    <span className="text-white font-semibold">
                      ${fmtCompact(ticker?.quoteVolume24h ?? '5120000000')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Циркулирующее предложение</span>
                    <span className="text-white font-semibold">19.78M {displayBase}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Сеть / Блокчейн</span>
                    <span className="text-[#14f195] font-semibold">Solana / Bitcoin</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-[11px] text-gray-400">
                    Контракт: <span className="font-mono text-gray-300">So111...11112</span>
                  </div>
                  <button
                    onClick={() => {
                      buzz(4)
                      toasts.push('info', 'Адрес скопирован')
                    }}
                    className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 hover:text-white"
                  >
                    <Copy size={11} />
                    <span>Копировать</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ 5. FLOATING BOTTOM TRADE BUTTONS ══════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-xl border-t border-white/[0.06] bg-[#080b11]/90 px-4 pt-2.5 backdrop-blur-xl"
        style={{
          bottom: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Volumetric Green Pill: Купить */}
          <button
            onClick={() => {
              buzz(8)
              setPickedPrice(null)
              setOrderOpen('buy')
            }}
            className="btn-volumetric-green flex-1 flex items-center justify-center gap-2 h-13 rounded-full text-[16px] font-extrabold cursor-pointer"
          >
            <span>Купить</span>
          </button>

          {/* Volumetric Dark Pill: Продать */}
          <button
            onClick={() => {
              buzz(8)
              setPickedPrice(null)
              setOrderOpen('sell')
            }}
            className="btn-volumetric-dark flex items-center justify-center gap-2 h-13 rounded-full text-[16px] font-bold px-8 cursor-pointer"
          >
            <span>Продать</span>
          </button>
        </div>
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

      {/* Symbol Switcher Modal */}
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

/** Список открытых позиций в стиле Moonshot */
function MoonshotOpenPositionsView({
  symbol,
  onClosePosition,
}: {
  symbol: string
  onClosePosition: (id: string) => void
}) {
  const trading = useTrading()
  const snap = trading.snap
  const priceStr = priceOf(symbol)
  const price = priceStr ? D(priceStr) : D(0)

  const positions = (snap?.positions ?? []).filter((p) => p.symbol === symbol)
  const holding = snap?.holdings[symbol]
  const hasHolding = holding && D(holding.qty).gt(D('0.00000001'))

  if (positions.length === 0 && !hasHolding) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#0e121a] py-6 text-center text-[12px] text-gray-500">
        У вас нет открытых позиций по {baseOf(symbol)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {positions.map((pos) => {
        const dir = pos.side === 'long' ? 1 : -1
        const posQty = D(pos.qty)
        let posPnl = D(0)
        let pnlPct = 0
        if (price.gt(0)) {
          posPnl = price.minus(D(pos.entryPrice)).mul(dir).mul(posQty)
          const marginNum = parseFloat(pos.margin)
          if (marginNum > 0) {
            pnlPct = (posPnl.toNumber() / marginNum) * 100
          }
        }
        const isUp = posPnl.gte(0)

        return (
          <div
            key={pos.id}
            className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11151f] p-3.5 shadow-md"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                    pos.side === 'long'
                      ? 'bg-[#00c076]/15 text-[#00c076]'
                      : 'bg-[#ff3b5c]/15 text-[#ff3b5c]'
                  }`}
                >
                  {pos.leverage}x {pos.side}
                </span>
                <span className="text-[13px] font-bold text-white">{baseOf(symbol)}-PERP</span>
              </div>

              <div className="text-right">
                <div
                  className={`text-[13px] font-bold tnum ${
                    isUp ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                  }`}
                >
                  {fmtUsd(posPnl.toString(), { sign: true })} ({fmtPct(pnlPct)})
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] tnum">
              <div>
                <span className="text-gray-500 text-[10px] block">Объем</span>
                <span className="font-medium text-white">{fmtQty(posQty.toString())}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Вход</span>
                <span className="font-medium text-white">${fmtPrice(pos.entryPrice)}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Текущая</span>
                <span className="font-medium text-white">${fmtPrice(price.toString())}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Ликвидация</span>
                <span className="font-semibold text-yellow-400">${fmtPrice(pos.liqPrice)}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Маржа</span>
                <span className="font-medium text-white">{fmtUsd(pos.margin)}</span>
              </div>
              <div className="flex items-end justify-end">
                <button
                  onClick={() => {
                    buzz(8)
                    onClosePosition(pos.id)
                  }}
                  className="rounded-lg bg-white/10 px-3 py-1 font-semibold text-white text-[11px] hover:bg-[#ff3b5c]/20 hover:text-[#ff3b5c] transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Закрытые сделки */
function MoonshotClosedTradesView({ symbol }: { symbol: string }) {
  const trading = useTrading()
  const snap = trading.snap
  const rows = useMemo(
    () => (snap?.trades ?? []).filter((tr) => tr.symbol === symbol).slice(-10).reverse(),
    [snap, symbol]
  )

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#0e121a] py-6 text-center text-[12px] text-gray-500">
        История сделок пуста
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((tr) => (
        <div
          key={tr.id}
          className="flex items-center justify-between rounded-xl bg-[#11151f] px-3 py-2.5 text-[12px] border border-white/[0.06] tnum"
        >
          <div>
            <span
              className={`mr-2 font-bold uppercase ${
                tr.side === 'buy' ? 'text-[#00c076]' : 'text-[#ff3b5c]'
              }`}
            >
              {tr.side === 'buy' ? 'Купил' : 'Продал'}
            </span>
            <span className="text-white font-medium">{fmtQty(tr.qty)}</span>
            <span className="text-gray-400 text-[11px] ml-1.5">@ ${fmtPrice(tr.price)}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-300 font-medium">{fmtUsd(tr.quoteTotal)}</span>
            {typeof tr.pnl === 'string' && (
              <span
                className={`ml-2 font-bold ${
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
    <Sheet open={open} onOpenChange={onOpenChange} maxHeight="85dvh" title="Выбор рынка">
      <div className="flex flex-col gap-3 pb-6">
        <div className="relative flex items-center rounded-xl bg-[#141924] px-3 py-2 border border-white/10">
          <Search size={16} className="text-gray-400 mr-2 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск монеты (BTC, ETH, SOL)..."
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-gray-500"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={15} className="text-gray-400" />
            </button>
          )}
        </div>

        <div className="flex flex-col divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto no-scrollbar">
          {list.slice(0, 40).map((t) => {
            const isCurrent = t.symbol === activeSymbol
            const base = baseOf(t.symbol)
            return (
              <button
                key={t.symbol}
                onClick={() => onSelect(t.symbol)}
                className={`flex items-center justify-between py-2.5 px-2 hover:bg-white/5 transition-colors rounded-lg ${
                  isCurrent ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CoinIcon symbol={t.symbol} size={30} />
                  <div className="text-left">
                    <div className="font-bold text-[14px] text-white leading-tight">{base}</div>
                    <div className="text-[11px] text-gray-400">USDT · Vol ${fmtCompact(t.quoteVolume24h)}</div>
                  </div>
                </div>

                <div className="text-right tnum">
                  <div className="font-semibold text-[13px] text-white">${fmtPrice(t.last)}</div>
                  <div
                    className={`text-[11px] font-semibold ${
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
