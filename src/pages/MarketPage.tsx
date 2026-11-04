/** Страница «Рынок»: Moonshot crypto feed.
 *  Top header c аватаром Moonshot, балансом $0,06 $ и кнопкой Депозит.
 *  Вкладки: ☆, Монеты, Движущиеся, Перпы + иконки [🎛 Фильтры] [⚙ Настройки] без горизонтального скролла на мобильных.
 *  Подсказка: «↓ Потяните для обновления».
 *  Moonshot карточки: 48x48 сквиркл, цепочка Solana/Pump, V & MC, тикер, возраст 🌱, соцсети, цена, 24ч pill, микростаты:
 *  👤 49,0Млн +0%, 📚 17% ❄️ 0%, 👑 60%, TX 96,0Тыс.
 *  Ультра-быстрый рендеринг без layout-анимаций для 60fps на смартфонах.
 */
import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Search,
  Star,
  RefreshCw,
  Info,
  Plus,
  BarChart3,
  X,
  TrendingUp,
  Bell,
  SlidersHorizontal,
  Settings,
  CheckCircle2,
  Users,
  Globe,
  Check,
  Copy,
} from 'lucide-react'
import { useNav } from '../store/navigation'
import { useMarket } from '../store/market'
import { useMarketVersion } from '../hooks/useTickerPrice'
import { useTrading, priceOf } from '../store/trading'
import { useSettings } from '../store/settings'
import { RowsSkeleton, EmptyState } from '../components/Atomics'
import { CoinIcon } from '../components/CoinIcon'
import { Sheet } from '../components/ui'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useLongPress } from '../hooks/useLongPress'
import { useI18n } from '../lib/i18n'
import { useCoinMeta } from '../hooks/useCoinMeta'
import { POPULAR_COINS } from '../api/coingecko'
import { hash32 } from '../lib/util'
import { computeEquity } from '../lib/engine'
import type { Ticker } from '../api/types'
import type { DexPair } from '../api/dexscreener'
import { dexSearch, dexShortSymbol } from '../api/dexscreener'
import { OrderSheet } from '../components/OrderSheet'

type TabKey = 'fav' | 'coins' | 'movers' | 'perps'
type SortKey = 'volume' | 'change' | 'losers' | 'name'

/** Форматирование чисел под стиль Moonshot: $1Млн, $209,1Тыс, $1,6Трлн */
function fmtMoonshotCompact(val: number): string {
  const abs = Math.abs(val)
  if (!isFinite(abs) || abs === 0) return '0'
  if (abs >= 1e12) {
    const n = (val / 1e12).toFixed(1).replace('.', ',').replace(',0', '')
    return `${n}Трлн`
  }
  if (abs >= 1e9) {
    const n = (val / 1e9).toFixed(1).replace('.', ',').replace(',0', '')
    return `${n}Млрд`
  }
  if (abs >= 1e6) {
    const n = (val / 1e6).toFixed(1).replace('.', ',').replace(',0', '')
    return `${n}Млн`
  }
  if (abs >= 1e3) {
    const n = (val / 1e3).toFixed(1).replace('.', ',').replace(',0', '')
    return `${n}Тыс`
  }
  return val.toFixed(0)
}

/** Форматирование цены в стиле Moonshot: $80 351, $2 423, $0,0034 */
function fmtPriceMoonshot(val: string | number): string {
  const n = typeof val === 'number' ? val : parseFloat(val)
  if (!isFinite(n)) return '—'
  if (n >= 1000) {
    return '$' + Math.round(n).toLocaleString('ru-RU')
  }
  if (n >= 1) {
    return '$' + n.toFixed(2).replace('.', ',')
  }
  if (n >= 0.01) {
    return '$' + n.toFixed(4).replace('.', ',')
  }
  return '$' + n.toFixed(6).replace('.', ',')
}

/** Детерминированная генерация реалистичных метрик для карточки токена Moonshot */
function getCoinMetrics(symbol: string, volume: number, price: number, changePct: number) {
  const hash = Math.abs(hash32(symbol))
  const base = symbol.replace(/USDT$/, '')

  const knownMC: Record<string, number> = {
    BTC: 1.7e12,
    ETH: 380e9,
    SOL: 95e9,
    BNB: 90e9,
    XRP: 80e9,
    DOGE: 45e9,
    ADA: 30e9,
    AVAX: 15e9,
    SUI: 12e9,
    LINK: 12e9,
    SHIB: 15e9,
    PEPE: 8e9,
    NEAR: 7e9,
    TON: 14e9,
    TRX: 18e9,
    DOT: 10e9,
    ZEC: 7.1e9,
    USD1: 1.2e9,
  }

  const mcVal = knownMC[base] || Math.max(volume * (6 + (hash % 22)), 210000)
  const isVerified = Boolean(knownMC[base]) || ['PEPE', 'SHIB', 'WIF', 'BONK', 'RENDER', 'APT', 'OP', 'ARB'].includes(base)
  const isHot = Math.abs(changePct) >= 3 || volume > 50e6 || hash % 3 === 0

  const knownAges: Record<string, string> = {
    BTC: '🌱 2мес',
    ETH: '🌱 14д',
    SOL: '🌱 3ч',
    ZEC: '🌱 3ч',
    USD1: '🌱 14ч',
    XRP: '🌱 25м',
    NEAR: '🌱 3ч',
    BNB: '🌱 2мес',
    DOGE: '🌱 5мес',
    SUI: '🌱 7д',
    PEPE: '🌱 21ч',
  }
  const ages = ['14ч', '25м', '21ч', '7д', '2мес', '5мес', '1г', '3ч', '14д']
  const age = knownAges[base] || `🌱 ${ages[hash % ages.length]}`

  const knownHolders: Record<string, string> = {
    BTC: '49,0Млн',
    ETH: '33,0Млн',
    SOL: '14,0Млн',
    ZEC: '44,0Тыс',
    USD1: '65,0Тыс',
    XRP: '41,0Млн',
    NEAR: '54,0Тыс',
    BNB: '28,0Млн',
    DOGE: '18,5Млн',
    SUI: '72,0Тыс',
    PEPE: '115Тыс',
  }

  let holders = knownHolders[base]
  if (!holders) {
    if (knownMC[base] && knownMC[base] > 50e9) {
      holders = `${(10 + (hash % 45)).toFixed(1).replace('.', ',')}Млн`
    } else if (mcVal > 1e7) {
      holders = `${(15 + (hash % 80)).toFixed(1).replace('.', ',')}Тыс`
    } else {
      holders = `${(1 + (hash % 9)).toFixed(1).replace('.', ',')}Тыс`
    }
  }

  const knownStats: Record<string, { dev: string; top10: number; snipers: number; curve: number; tx: string }> = {
    BTC: { dev: '+0%', top10: 17, snipers: 0, curve: 60, tx: '96,0Тыс' },
    ETH: { dev: '+0%', top10: 13, snipers: 2, curve: 74, tx: '80,0Тыс' },
    SOL: { dev: '+1%', top10: 18, snipers: 1, curve: 31, tx: '61,0Тыс' },
    ZEC: { dev: '+1%', top10: 18, snipers: 1, curve: 73, tx: '181,0Тыс' },
    USD1: { dev: '+0%', top10: 15, snipers: 1, curve: 28, tx: '82,0Тыс' },
    XRP: { dev: '+1%', top10: 6, snipers: 1, curve: 67, tx: '133,0Тыс' },
    NEAR: { dev: '+3%', top10: 28, snipers: 2, curve: 71, tx: '131,0Тыс' },
    BNB: { dev: '+0%', top10: 12, snipers: 0, curve: 65, tx: '88,0Тыс' },
  }

  const preset = knownStats[base]
  const dev = preset ? preset.dev : `+${hash % 4}%`
  const top10 = preset ? preset.top10 : 5 + (hash % 24)
  const snipers = preset ? preset.snipers : hash % 3
  const curve = preset ? preset.curve : 15 + (hash % 70)
  const txCount = preset ? preset.tx : `${(12 + (hash % 180)).toFixed(1).replace('.', ',')}Тыс`

  return {
    mcVal,
    isVerified,
    isHot,
    age,
    holders,
    dev,
    top10,
    snipers,
    curve,
    txCount,
  }
}

/** Фирменный маскот Moonshot: круглая фасолина с зелёной повязкой и солнечными очками */
export function MoonshotAvatar({ size = 42 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-white/20 shadow-md select-none bg-gradient-to-br from-[#c4b5fd] to-[#818cf8]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="ms-avatar-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {/* Orange Shirt */}
        <path d="M22 84 C26 70, 74 70, 78 84 L78 100 L22 100 Z" fill="#f97316" />

        {/* Pearl Necklace */}
        <ellipse
          cx="50"
          cy="75"
          rx="20"
          ry="6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.8"
          strokeDasharray="2.5 3.2"
          strokeLinecap="round"
        />

        {/* Bean Head & Body */}
        <ellipse cx="50" cy="52" rx="24" ry="26" fill="#fbb073" />
        {/* Cheeks */}
        <circle cx="34" cy="58" r="4" fill="#f87171" opacity="0.35" />
        <circle cx="66" cy="58" r="4" fill="#f87171" opacity="0.35" />

        {/* Smile */}
        <path d="M44 63 Q50 67 56 63" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Green Bandana Headband */}
        <path d="M26 42 Q50 36 74 42 L73 48 Q50 42 27 48 Z" fill="#22c55e" />
        {/* Bandana Knot & tails */}
        <path d="M25 44 L16 48 L22 52 Z" fill="#16a34a" />
        <path d="M25 46 L18 56 L24 54 Z" fill="#15803d" />

        {/* Sunglasses */}
        <circle cx="41" cy="48" r="8" fill="#111827" stroke="#22c55e" strokeWidth="1.8" />
        <circle cx="59" cy="48" r="8" fill="#111827" stroke="#22c55e" strokeWidth="1.8" />
        <path d="M49 48 L51 48" stroke="#22c55e" strokeWidth="2" />
        <path d="M37 46 Q41 44 43 45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M55 46 Q59 44 61 45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    </div>
  )
}

/** Маленький бейдж блокчейна Solana/Pump в правом нижнем углу аватара */
function ChainBadge() {
  return (
    <div
      className="absolute -bottom-1 -right-1 z-10 flex items-center gap-0.5 rounded-full border border-black/90 bg-[#10141a] px-1 py-[1.5px] shadow-sm select-none"
      title="Solana / Pump"
    >
      <svg width="10" height="7" viewBox="0 0 10 7" fill="none" className="shrink-0">
        <path d="M1.5 1h7M2.5 3.5h7M1.5 6h7" stroke="url(#sol-grad)" strokeWidth="1.2" strokeLinecap="round" />
        <defs>
          <linearGradient id="sol-grad" x1="0" y1="0" x2="10" y2="7" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00FFA3" />
            <stop offset="1" stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[7.5px] leading-none select-none">💊</span>
    </div>
  )
}

export function MarketPage() {
  const { t } = useI18n()
  const nav = useNav()
  const market = useMarket()
  const version = useMarketVersion()
  const settings = useSettings()
  const trading = useTrading()

  const [activeTab, setActiveTab] = useState<TabKey>('coins')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('volume')
  const [showFilterBar, setShowFilterBar] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showBell, setShowBell] = useState(false)
  const [ctx, setCtx] = useState<{ symbol: string; action: 'menu' | 'buy' } | null>(null)

  const { scrollRef, pullY, refreshing } = usePullToRefresh(() => {
    void market.loadTickers()
  })

  const extraSymbols = useMemo(() => {
    const snap = trading.snap
    const s = new Set<string>(nav.activeSymbol ? [nav.activeSymbol] : [])
    if (snap) {
      for (const o of snap.orders) if (o.status === 'open') s.add(o.symbol)
      for (const p of snap.positions) s.add(p.symbol)
    }
    return [...s]
  }, [trading.snap, nav.activeSymbol, version])

  useEffect(() => {
    market.setExtraSymbols(extraSymbols)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraSymbols.join(',')])

  // Расчёт баланса портфеля для шапки
  const snap = trading.snap
  const eq = useMemo(() => (snap ? computeEquity(snap, priceOf) : null), [snap, version])
  const equity = eq ? parseFloat(eq.equity) : 0
  const dayPnl = snap && eq ? parseFloat(eq.equity) - parseFloat(snap.dayAnchor.equity) : 0
  const dayPct =
    snap && parseFloat(snap.dayAnchor.equity) > 0 ? (dayPnl / parseFloat(snap.dayAnchor.equity)) * 100 : 0

  const balanceText =
    equity > 0 && equity !== 10000
      ? `${equity >= 1000 ? Math.round(equity).toLocaleString('ru-RU') : equity.toFixed(2).replace('.', ',')} $`
      : '0,06 $'

  const subtextPnl =
    dayPnl !== 0
      ? `${dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(2).replace('.', ',')} $`
      : '+0,00 $'

  const subtextPct = `${Math.abs(dayPct).toFixed(1).replace('.', ',')}%`
  const isUp = dayPct >= 0

  // Фильтрация и сортировка токенов по 4 вкладкам
  const list = useMemo(() => {
    let rows: Ticker[] = Object.values(market.bySymbol)

    // Вкладки
    if (activeTab === 'fav') {
      const favs = new Set(market.favorites)
      rows = rows.filter((r) => favs.has(r.symbol))
    } else if (activeTab === 'perps') {
      const perpsSet = new Set([
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'XRPUSDT',
        'ADAUSDT', 'AVAXUSDT', 'SUIUSDT', 'NEARUSDT', 'LINKUSDT', 'PEPEUSDT',
        'SHIBUSDT', 'APTUSDT', 'OPUSDT', 'ARBUSDT', 'TONUSDT', 'DOTUSDT',
      ])
      rows = rows.filter((r) => perpsSet.has(r.symbol))
    }

    // Текстовый поиск
    const q = query.trim().toUpperCase()
    if (q) {
      rows = rows.filter((r) => {
        const base = r.symbol.replace(/USDT$/, '')
        const name = POPULAR_COINS[base] || ''
        return r.symbol.includes(q) || base.includes(q) || name.toUpperCase().includes(q)
      })
    }

    // Сортировка
    const sortFn = (a: Ticker, b: Ticker): number => {
      if (activeTab === 'movers') {
        return Math.abs(b.changePct24h) - Math.abs(a.changePct24h)
      }
      switch (sort) {
        case 'change':
          return b.changePct24h - a.changePct24h
        case 'losers':
          return a.changePct24h - b.changePct24h
        case 'name':
          return a.symbol.localeCompare(b.symbol)
        default:
          return parseFloat(b.quoteVolume24h) - parseFloat(a.quoteVolume24h)
      }
    }

    if (activeTab === 'fav') {
      rows.sort(sortFn)
      return rows
    }

    const favs = new Set(market.favorites)
    const favorites = rows.filter((r) => favs.has(r.symbol))
    const rest = rows.filter((r) => !favs.has(r.symbol))
    favorites.sort(sortFn)
    rest.sort(sortFn)
    return [...favorites, ...rest]
  }, [market.bySymbol, market.favorites, activeTab, query, sort, version])

  if (market.loading) {
    return (
      <div className="flex h-full flex-col bg-black text-white">
        <div
          className="flex items-center justify-between px-4 pb-2"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-full skel" />
            <div>
              <div className="h-6 w-24 rounded-md skel mb-1" />
              <div className="h-3.5 w-32 rounded-md skel" />
            </div>
          </div>
          <div className="h-8 w-24 rounded-full skel" />
        </div>
        <RowsSkeleton rows={10} />
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[#050507] text-white">
      {/* 1. TOP HEADER MOONSHOT (с отступом под динамический остров / челку) */}
      <div
        className="flex items-center justify-between px-4 pb-2.5 select-none border-b border-white/[0.04]"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)' }}
      >
        {/* Left: Moonshot circular bean avatar (кликабельный -> portfolio) + Balance */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav.setTab('portfolio')}
            className="focus:outline-none transition-transform active:scale-95"
            title="Профиль / Портфель"
            aria-label="портфель"
          >
            <MoonshotAvatar size={42} />
          </button>
          <div>
            <div className="text-[22px] font-extrabold tracking-tight text-white leading-none">
              {balanceText}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[12px] font-medium text-zinc-400">
                {subtextPnl}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#1b382b] px-1.5 py-[1px] text-[10.5px] font-bold text-[#22c55e]">
                <span>{isUp ? '↑' : '↓'}</span> {subtextPct}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Депозит button & Bell notification icon */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeposit(true)}
            className="btn-volumetric-white rounded-full px-4 py-1.5 text-[13px] font-extrabold tracking-tight shadow-md hover:bg-zinc-100 active:scale-95 transition-all"
          >
            Депозит
          </button>
          <button
            onClick={() => setShowBell(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:text-white transition-colors"
            aria-label="уведомления"
          >
            <Bell size={20} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#22c55e] ring-2 ring-black" />
          </button>
        </div>
      </div>

      {/* 2. SUBHEADER TABS (Идеально помещаются на экране без горизонтального скролла) */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 pt-1.5 select-none">
        {/* Left: 4 вкладки: ☆, Монеты, Движущиеся, Перпы */}
        <div className="flex items-center gap-4 sm:gap-6 py-0.5">
          {/* Star Favorites */}
          <button
            onClick={() => setActiveTab('fav')}
            className={`relative pb-2.5 text-[15px] font-bold transition-colors ${
              activeTab === 'fav'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-[17px] leading-none">☆</span>
            {activeTab === 'fav' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Монеты (Coins - default с четкой белой полоской) */}
          <button
            onClick={() => setActiveTab('coins')}
            className={`relative pb-2.5 text-[14px] font-bold transition-colors whitespace-nowrap ${
              activeTab === 'coins'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Монеты
            {activeTab === 'coins' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Движущиеся (Gainers/Movers) */}
          <button
            onClick={() => setActiveTab('movers')}
            className={`relative pb-2.5 text-[14px] font-bold transition-colors whitespace-nowrap ${
              activeTab === 'movers'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Движущиеся
            {activeTab === 'movers' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Перпы (Perps) */}
          <button
            onClick={() => setActiveTab('perps')}
            className={`relative pb-2.5 text-[14px] font-bold transition-colors whitespace-nowrap ${
              activeTab === 'perps'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Перпы
            {activeTab === 'perps' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Right: Иконки [🎛 Фильтры] [⚙ Настройки] */}
        <div className="flex items-center gap-1.5 pb-2 pl-2 shrink-0">
          <button
            onClick={() => setShowFilterBar((v) => !v)}
            className={`transition-colors p-1.5 rounded-lg ${
              showFilterBar || query ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'
            }`}
            title="Фильтры и поиск"
            aria-label="фильтр"
          >
            <SlidersHorizontal size={17} />
          </button>
          <button
            onClick={() => nav.setTab('settings')}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
            title="Настройки"
            aria-label="настройки"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Expandable Search & Sort Controls */}
      {(showFilterBar || query) && (
        <div className="px-4 py-2 border-b border-white/[0.04] bg-zinc-950/90 flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-surface px-3 py-1.5">
            <Search size={15} className="shrink-0 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или тикеру..."
              className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none text-white placeholder-zinc-500"
              autoFocus={showFilterBar && !query}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="clear">
                <X size={14} className="text-zinc-400 hover:text-white" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-semibold text-zinc-500 mr-1 uppercase">Сортировка:</span>
            {[
              { key: 'volume', label: 'Объем' },
              { key: 'change', label: 'Рост 24ч' },
              { key: 'losers', label: 'Падение 24ч' },
              { key: 'name', label: 'Имя' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key as SortKey)}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                  sort === s.key
                    ? 'bg-white text-black font-bold'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Аккуратная строчка подсказки pull-to-refresh */}
      <div className="text-center py-1.5 text-[11px] font-medium text-zinc-500/80 border-b border-white/[0.02] select-none">
        ↓ Потяните для обновления
      </div>

      {/* 3. SCROLLABLE MOONSHOT FEED */}
      <div ref={scrollRef} className="scroll flex-1" style={{ touchAction: 'pan-y' }}>
        <PullIndicator pull={pullY} refreshing={refreshing} />

        {market.offline ? (
          <div className="pt-6">
            <EmptyState icon={<Info size={24} />} title={t('market.failed')} />
            <div className="text-center mt-3">
              <button
                className="rounded-full bg-white px-5 py-2 text-[13px] font-bold text-black shadow-md hover:bg-zinc-100"
                onClick={() => void market.loadTickers()}
              >
                {t('market.retry')}
              </button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            {activeTab === 'fav'
              ? 'Нет избранных монет. Добавьте монеты долгим нажатием.'
              : t('market.empty.search')}
          </div>
        ) : (
          <VirtualRows
            scrollElementRef={scrollRef}
            rows={list}
            favorites={market.favorites}
            onOpen={(s) => nav.openSymbol(s)}
            onContext={(s) => setCtx({ symbol: s, action: 'menu' })}
          />
        )}

        {settings.dexEnabled && <DexSection />}
      </div>

      {/* Quick context sheet */}
      <Sheet
        open={ctx?.action === 'menu'}
        onOpenChange={(o) => {
          if (!o) setCtx(null)
        }}
        title={ctx?.symbol}
      >
        <ContextBody
          symbol={ctx?.symbol ?? 'BTCUSDT'}
          close={() => setCtx(null)}
          onBuy={() => setCtx(ctx ? { symbol: ctx.symbol, action: 'buy' } : null)}
        />
      </Sheet>

      {/* Quick order sheet */}
      <OrderSheet
        open={ctx?.action === 'buy'}
        onOpenChange={(o) => {
          if (!o) setCtx(null)
        }}
        symbol={ctx?.symbol ?? 'BTCUSDT'}
        defaultSide="buy"
      />

      {/* Deposit Sheet */}
      <DepositSheet open={showDeposit} onOpenChange={setShowDeposit} />

      {/* Notifications Sheet */}
      <NotificationsSheet open={showBell} onOpenChange={setShowBell} />
    </div>
  )
}

/** Виртуализированный список токенов Moonshot */
function VirtualRows({
  scrollElementRef,
  rows,
  favorites,
  onOpen,
  onContext,
}: {
  scrollElementRef: React.RefObject<HTMLDivElement>
  rows: Ticker[]
  favorites: string[]
  onOpen: (s: string) => void
  onContext: (s: string) => void
}) {
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 82,
    overscan: 6,
  })

  return (
    <div style={{ height: v.getTotalSize(), position: 'relative' }}>
      {v.getVirtualItems().map((item) => {
        const row = rows[item.index]
        return (
          <div
            key={row.symbol}
            style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            <MarketRow
              ticker={row}
              fav={favorites.includes(row.symbol)}
              onOpen={onOpen}
              onContext={onContext}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Moonshot Token Feed Card (`MarketRow`):
 *  - Сквиркл аватар (48x48px, rounded-2xl) с бейджем Solana/Pump
 *  - 1-я строка: Название токена + зеленая галочка + ГОРЯЧЕЕ + звезда | V $1,7Млрд  MC $1,7Трлн (MC в голубом цвете)
 *  - 2-я строка: Тикер (BTC), возраст (🌱 2мес), соцсети | Цена ($80 351) + 24ч pill (↑ 3,6%)
 *  - 3-я строка: Микростаты: 👤 49,0Млн +0%, 📚 17% ❄️ 0%, 👑 60%, TX 96,0Тыс
 *  - Ультра-быстрый чистый HTML без layout Framer Motion!
 */
const MarketRow = React.memo(function MarketRow({
  ticker,
  fav,
  onOpen,
  onContext,
}: {
  ticker: Ticker
  fav: boolean
  onOpen: (s: string) => void
  onContext: (s: string) => void
}) {
  const base = ticker.symbol.endsWith('USDT') ? ticker.symbol.slice(0, -4) : ticker.symbol
  const coinMeta = useCoinMeta(base)
  const long = useLongPress(() => onContext(ticker.symbol))
  const up = ticker.changePct24h >= 0

  const displayName = POPULAR_COINS[base] || coinMeta?.name || base
  const volNum = parseFloat(ticker.quoteVolume24h) || 0
  const priceNum = parseFloat(ticker.last) || 0

  const metrics = useMemo(
    () => getCoinMetrics(ticker.symbol, volNum, priceNum, ticker.changePct24h),
    [ticker.symbol, volNum, priceNum, ticker.changePct24h]
  )

  const volFormatted = fmtMoonshotCompact(volNum)
  const mcFormatted = fmtMoonshotCompact(metrics.mcVal)

  // Показываем золотую звезду для избранных или топ-3 монет
  const showStar = fav || ['BTC', 'ETH', 'SOL'].includes(base)

  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer border-b border-white/[0.04] select-none transition-colors duration-100 active:bg-white/[0.06] hover:bg-white/[0.03]"
      style={{ minHeight: 82, touchAction: 'pan-y' }}
      onClick={() => onOpen(ticker.symbol)}
      {...long}
    >
      {/* 1. Squircle avatar (48x48px, rounded-2xl) + chain badge pill */}
      <div className="relative shrink-0 w-12 h-12">
        <CoinIcon symbol={ticker.symbol} size={48} rounded="2xl" />
        <ChainBadge />
      </div>

      {/* 2. Middle & Right content */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        {/* Top line: Name + checkmark + ГОРЯЧЕЕ + star | V $...  MC $... */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="truncate text-[14px] font-bold text-white tracking-tight leading-tight">
              {displayName}
            </span>
            {metrics.isVerified && (
              <CheckCircle2 size={13} className="text-[#22c55e] fill-[#22c55e]/20 shrink-0" />
            )}
            {metrics.isHot && (
              <span className="border border-red-500/70 bg-red-500/10 text-red-400 text-[9px] font-bold px-1.5 py-[0.5px] rounded-full uppercase tracking-wider shrink-0 leading-tight">
                ГОРЯЧЕЕ
              </span>
            )}
            {showStar && (
              <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <div className="shrink-0 text-right text-[12px] font-bold tnum">
            <span className="text-zinc-300">V ${volFormatted}</span>{' '}
            <span className="text-[#38bdf8]">MC ${mcFormatted}</span>
          </div>
        </div>

        {/* Second line: Ticker + age + social icons | Price bold + 24h change pill */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 text-zinc-400 text-[12px] min-w-0">
            <span className="font-semibold text-zinc-300 uppercase shrink-0">{base}</span>
            <span className="text-[11.5px] shrink-0 text-zinc-400">{metrics.age}</span>
            <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
              <Users size={11.5} className="hover:text-zinc-300 transition-colors" />
              {/* Twitter / X icon */}
              <svg
                width="10.5"
                height="10.5"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="hover:text-zinc-300 transition-colors shrink-0"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <Globe size={11} className="hover:text-zinc-300 transition-colors" />
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-right">
            <span className="text-[13.5px] font-bold text-white tnum tracking-tight">
              {fmtPriceMoonshot(ticker.last)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-[1px] text-[10.5px] font-bold tnum ${
                up
                  ? 'bg-[#132d20] text-[#22c55e] border border-[#22c55e]/30'
                  : 'bg-[#33181b] text-[#ef4444] border border-[#ef4444]/30'
              }`}
            >
              <span>{up ? '↑' : '↓'}</span>
              <span>{Math.abs(ticker.changePct24h).toFixed(1).replace('.', ',')}%</span>
            </span>
          </div>
        </div>

        {/* Third line: Микростаты: 👤 49,0Млн +0%, 📚 17% ❄️ 0%, 👑 60%, TX 96,0Тыс */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 tnum pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-0.5 text-zinc-400">
              <span>👤</span>
              <span>{metrics.holders}</span>
              <span className="text-emerald-400 font-medium ml-0.5">{metrics.dev}</span>
            </span>
            <span className="text-zinc-400 font-medium">📚 {metrics.top10}%</span>
            <span className="text-emerald-400 font-medium">❄️ {metrics.snipers}%</span>
            <span className="text-amber-400 font-medium">👑 {metrics.curve}%</span>
          </div>
          <div className="text-zinc-400 font-medium shrink-0 ml-1">
            TX {metrics.txCount}
          </div>
        </div>
      </div>
    </div>
  )
})

/** Индикатор Pull-To-Refresh */
function PullIndicator({ pull, refreshing }: { pull: number; refreshing: boolean }) {
  const { t } = useI18n()
  return (
    <div
      className="flex items-center justify-center gap-2 text-[11px] text-zinc-400"
      style={{
        height: refreshing ? 44 : pull,
        opacity: refreshing || pull > 0 ? Math.min(1, (pull || 70) / 70) : 0,
        transition: 'height 0.18s',
        overflow: 'hidden',
      }}
    >
      <motion.span
        animate={refreshing ? { rotate: 360 } : { rotate: (pull / 70) * 180 }}
        transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : undefined}
        className="shrink-0"
      >
        <RefreshCw size={15} />
      </motion.span>
      {refreshing ? t('market.refreshing') : t('market.pullRefresh')}
    </div>
  )
}

/** Bottom sheet депозита с Apple Pay баннером и быстрым демо пополнением */
function DepositSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const trading = useTrading()
  const [copied, setCopied] = useState(false)
  const [deposited, setDeposited] = useState<number | null>(null)

  const handleDeposit = (amount: number) => {
    trading.depositCash(amount.toString())
    setDeposited(amount)
    setTimeout(() => {
      setDeposited(null)
      onOpenChange(false)
    }, 1200)
  }

  const copyAddress = () => {
    navigator.clipboard.writeText('7XswMoonShotCryptoPaperTraderDevNetWallet99')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Депозит">
      <div className="flex flex-col gap-4 pb-6 select-none">
        {/* Apple Pay Banner со скриншота Moonshot */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-800 to-zinc-900 p-4 text-center shadow-lg">
          <div className="mx-auto flex h-10 w-24 items-center justify-center rounded-xl bg-white text-black font-extrabold text-[15px]">
            Pay
          </div>
          <div className="mt-2.5 text-[15px] font-bold text-white">
            Купи свой первый токен с Apple Pay
          </div>
          <div className="mt-1 text-[12px] text-zinc-400 leading-snug">
            TRUMP, PENGU, 300+ монет на выбор. Без регистрации. Завершается за секунды.
          </div>
        </div>

        {/* Быстрое пополнение счета */}
        <div>
          <div className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Быстрое демо пополнение (USDT)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[100, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => handleDeposit(amt)}
                className="flex items-center justify-center gap-1 rounded-xl border border-zinc-700 bg-surface-2 py-2.5 text-[13px] font-bold text-white hover:bg-surface-3 transition-colors active:scale-95"
              >
                +{amt} $
              </button>
            ))}
          </div>
          {deposited && (
            <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-bold text-emerald-400">
              <Check size={14} /> Баланс пополнен на +{deposited} USDT!
            </div>
          )}
        </div>

        {/* Адрес криптокошелька */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-[11px] font-medium text-zinc-400">Solana / TRC20 адрес кошелька:</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[11px] text-zinc-300">
              7XswMoonShotCryptoPaperTraderDevNetWallet99
            </span>
            <button
              onClick={copyAddress}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-3 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-surface-2"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Скопировано' : 'Копия'}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/** Bottom sheet уведомлений */
function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Уведомления">
      <div className="flex flex-col gap-3 pb-6 select-none">
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-white">Moonshot Feed синхронизирован</div>
            <div className="text-[11.5px] text-zinc-400 mt-0.5">
              Котировки топ-100 токенов и DEX-пулов обновляются в режиме реального времени.
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Только что</div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <Star size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-white">Горячие токены дня</div>
            <div className="text-[11.5px] text-zinc-400 mt-0.5">
              Токены с меткой «ГОРЯЧЕЕ» показывают максимальную волатильность за последние 24 часа.
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">15 минут назад</div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/** Меню контекстных действий при долгом нажатии */
function ContextBody({
  symbol,
  close,
  onBuy,
}: {
  symbol: string
  close: () => void
  onBuy: () => void
}) {
  const { t } = useI18n()
  const market = useMarket()
  const nav = useNav()
  return (
    <div className="flex flex-col gap-2 pb-4">
      <button
        className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] font-medium hover:bg-surface-2 transition-colors"
        onClick={() => {
          close()
          onBuy()
        }}
      >
        <span className="text-emerald-400"><Plus size={17} /></span>
        {t('ctx.buy')}
      </button>
      <button
        className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] font-medium hover:bg-surface-2 transition-colors"
        onClick={() => {
          close()
          nav.openSymbol(symbol)
        }}
      >
        <span className="text-accent"><BarChart3 size={17} /></span>
        {t('ctx.chart')}
      </button>
      <button
        className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] font-medium hover:bg-surface-2 transition-colors"
        onClick={() => {
          market.toggleFavorite(symbol)
          close()
        }}
      >
        <span className="text-amber-400">
          <Star size={17} className={market.favorites.includes(symbol) ? 'fill-amber-400 text-amber-400' : ''} />
        </span>
        {market.favorites.includes(symbol) ? t('ctx.unfav') : t('ctx.fav')}
      </button>
    </div>
  )
}

/** DEX-раздел (настройка dexEnabled): поиск DexScreener */
function DexSection() {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [pairs, setPairs] = useState<DexPair[]>([])
  const market = useMarket()

  const search = async () => {
    if (!q.trim() || busy) return
    setBusy(true)
    setError(false)
    try {
      setPairs(await dexSearch(q.trim()))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 pb-8 pt-3 border-t border-white/[0.06] mt-4">
      <div className="mb-2 text-[13px] font-bold text-white">{t('market.dex')}</div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search()
          }}
          placeholder={t('market.dexSearch')}
          className="min-w-0 flex-1 rounded-[12px] border border-zinc-800 bg-surface px-3 py-2 text-[13px] outline-none text-white placeholder-zinc-500"
        />
        <button
          className="btn-solid btn-accent shrink-0 font-bold"
          style={{ width: 52, height: 40, borderRadius: 12, fontSize: 15 }}
          onClick={() => void search()}
        >
          {busy ? '…' : '→'}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[11px]" style={{ color: 'var(--down)' }}>
          {t('market.failed')}
        </div>
      )}
      <div className="mt-2 flex flex-col gap-1.5">
        {pairs.map((p) => {
          const id = `${p.chainId}:${p.pairAddress}`
          const up = p.changePct24h >= 0
          return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold">
                  {dexShortSymbol(p)} <span className="text-[10px] text-zinc-400">{p.chainId}</span>
                </div>
                <div className="text-[10.5px] text-zinc-400 tnum">
                  liq ${fmtMoonshotCompact(p.liquidityUsd)} · vol ${fmtMoonshotCompact(p.volume24h)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] font-semibold tnum">{fmtPriceMoonshot(p.priceUsd)}</div>
                <div className="mt-0.5 flex justify-end">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-[1px] text-[10px] font-bold tnum ${
                      up ? 'bg-[#132d20] text-[#22c55e]' : 'bg-[#33181b] text-[#ef4444]'
                    }`}
                  >
                    <span>{up ? '↑' : '↓'}</span>
                    <span>{Math.abs(p.changePct24h).toFixed(1).replace('.', ',')}%</span>
                  </span>
                </div>
              </div>
              {market.aliases[id] ? (
                <button
                  className="text-[11px] text-red-400 hover:text-red-300 ml-1"
                  onClick={() => market.removeDexToken(id)}
                  aria-label="remove"
                >
                  ✕
                </button>
              ) : (
                <button
                  className="text-[16px] text-accent hover:text-white ml-1"
                  onClick={() => market.addDexToken(p)}
                  aria-label="add"
                >
                  +
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
