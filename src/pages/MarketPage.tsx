/** Страница «Рынок»: топ-100, поиск, сортировка, избранное, pull-to-refresh, DEX. */
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Star, RefreshCw, Info, Plus, BarChart3, X, TrendingUp } from 'lucide-react'
import { useNav } from '../store/navigation'
import { useMarket } from '../store/market'
import { useMarketVersion } from '../hooks/useTickerPrice'
import { useTrading } from '../store/trading'
import { useSettings } from '../store/settings'
import { Header, StatusDot, RowsSkeleton, EmptyState, Sparkline, PctChip } from '../components/Atomics'
import { CoinIcon } from '../components/CoinIcon'
import { Seg, Sheet } from '../components/ui'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useLongPress } from '../hooks/useLongPress'
import { useI18n } from '../lib/i18n'
import { useCoinMeta } from '../hooks/useCoinMeta'
import { fmtPrice, fmtCompact } from '../lib/format'
import type { Ticker } from '../api/types'
import type { DexPair } from '../api/dexscreener'
import { dexSearch, dexShortSymbol } from '../api/dexscreener'
import { OrderSheet } from '../components/OrderSheet'

type SortKey = 'volume' | 'change' | 'losers' | 'name'

export function MarketPage() {
  const { t } = useI18n()
  const nav = useNav()
  const market = useMarket()
  const version = useMarketVersion()
  const settings = useSettings()
  const trading = useTrading()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('volume')
  const [ctx, setCtx] = useState<{ symbol: string; action: 'menu' | 'buy' } | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)

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

  const list = useMemo(() => {
    let rows: Ticker[] = Object.values(market.bySymbol)
    const q = query.trim().toUpperCase()
    if (q) rows = rows.filter((r) => r.symbol.includes(q))
    const favs = new Set(market.favorites)
    const favorites = rows.filter((r) => favs.has(r.symbol))
    const rest = rows.filter((r) => !favs.has(r.symbol))
    const sortFn = (a: Ticker, b: Ticker): number => {
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
    favorites.sort(sortFn)
    rest.sort(sortFn)
    return [...favorites, ...rest]
  }, [market.bySymbol, market.favorites, query, sort, version])

  /* Top 3 movers (absolute change) for the "Hot" section */
  const hotMovers = useMemo(() => {
    const all: Ticker[] = Object.values(market.bySymbol)
    return [...all]
      .sort((a, b) => Math.abs(b.changePct24h) - Math.abs(a.changePct24h))
      .slice(0, 3)
  }, [market.bySymbol, version])

  if (market.loading) {
    return (
      <div className="flex h-full flex-col">
        <Header title={t('market.title')} right={<StatusDot />} />
        <div className="p-4 pb-2">
          <div className="skel h-11 w-full rounded-[16px]" />
        </div>
        <RowsSkeleton rows={10} />
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <Header
        title={t('market.title')}
        subtitle={`${list.length} · ${t('market.all').toLowerCase()}`}
        right={<StatusDot />}
      />

      <div className="px-4 pb-2">
        {/* Search bar with focus glow */}
        <div
          className="flex items-center gap-2 rounded-[16px] border bg-surface px-3 py-2.5 transition-all duration-200"
          style={{
            borderColor: searchFocused
              ? 'var(--accent, #5b7bfe)'
              : 'var(--line, rgba(255,255,255,0.08))',
            boxShadow: searchFocused
              ? '0 0 0 3px rgba(91,123,254,0.15), 0 2px 8px -2px rgba(0,0,0,0.2)'
              : 'none',
          }}
        >
          <Search size={17} className="shrink-0 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={t('market.search')}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            inputMode="search"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="clear">
              <X size={15} className="text-faint" />
            </button>
          )}
        </div>

        {/* Sort pills */}
        <div className="mt-2">
          <Seg
            size="sm"
            layoutId="market-sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'volume', label: t('market.sort.volume') },
              { value: 'change', label: t('market.sort.change') },
              { value: 'losers', label: t('market.sort.losers') },
              { value: 'name', label: t('market.sort.name') },
            ]}
          />
        </div>
      </div>

      <div ref={scrollRef} className="scroll flex-1" style={{ touchAction: 'pan-y' }}>
        <PullIndicator pull={pullY} refreshing={refreshing} />

        {market.offline ? (
          <div className="pt-6">
            <EmptyState icon={<Info size={24} />} title={t('market.failed')} />
            <div className="text-center">
              <button
                className="rounded-full bg-surface-3 px-4 py-2 text-[13px] font-semibold text-accent"
                onClick={() => void market.loadTickers()}
              >
                {t('market.retry')}
              </button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Search size={24} />} title={t('market.empty.search')} hint={t('market.empty.searchHint')} />
        ) : (
          <>
            {/* Hot movers section */}
            {!query && hotMovers.length > 0 && (
              <HotMovers
                tickers={hotMovers}
                onOpen={(s) => nav.openSymbol(s)}
                onQuick={(s) => setCtx({ symbol: s, action: 'buy' })}
              />
            )}

            <VirtualRows
              rows={list}
              favorites={market.favorites}
              onOpen={(s) => nav.openSymbol(s)}
              onQuick={(s) => setCtx({ symbol: s, action: 'buy' })}
              onContext={(s) => setCtx({ symbol: s, action: 'menu' })}
            />
          </>
        )}

        {settings.dexEnabled && <DexSection />}
      </div>

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

      <OrderSheet
        open={ctx?.action === 'buy'}
        onOpenChange={(o) => {
          if (!o) setCtx(null)
        }}
        symbol={ctx?.symbol ?? 'BTCUSDT'}
        defaultSide="buy"
      />
    </div>
  )
}

/** Hot movers – top 3 by absolute change, horizontal scroll cards */
function HotMovers({
  tickers,
  onOpen,
  onQuick,
}: {
  tickers: Ticker[]
  onOpen: (s: string) => void
  onQuick: (s: string) => void
}) {
  return (
    <div className="px-4 pb-3">
      <div className="mb-2 flex items-center gap-1.5">
        <TrendingUp size={13} className="text-accent" />
        <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">Hot</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollSnapType: 'x mandatory' }}>
        {tickers.map((t) => (
          <HotCard key={t.symbol} ticker={t} onOpen={onOpen} onQuick={onQuick} />
        ))}
      </div>
    </div>
  )
}

function HotCard({
  ticker,
  onOpen,
  onQuick,
}: {
  ticker: Ticker
  onOpen: (s: string) => void
  onQuick: (s: string) => void
}) {
  const base = ticker.symbol.endsWith('USDT') ? ticker.symbol.slice(0, -4) : ticker.symbol
  const coinMeta = useCoinMeta(base)
  const up = ticker.changePct24h >= 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex min-w-[140px] flex-1 cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-surface p-3"
      style={{
        scrollSnapAlign: 'start',
        boxShadow: '0 2px 12px -4px rgba(0,0,0,0.25)',
      }}
      onClick={() => onOpen(ticker.symbol)}
    >
      <div className="flex items-center justify-between">
        <CoinIcon symbol={ticker.symbol} size={32} />
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full text-accent transition-colors hover:bg-surface-3"
          onClick={(e) => {
            e.stopPropagation()
            onQuick(ticker.symbol)
          }}
          aria-label="quick buy"
        >
          <Plus size={15} />
        </button>
      </div>
      <div>
        <div className="text-[13px] font-bold">{base}</div>
        {coinMeta?.name && (
          <div className="truncate text-[10.5px] text-faint">{coinMeta.name}</div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[13px] font-semibold tnum">{fmtPrice(ticker.last)}</span>
        <PctChip pct={ticker.changePct24h} />
      </div>
    </motion.div>
  )
}

function PullIndicator({ pull, refreshing }: { pull: number; refreshing: boolean }) {
  const { t } = useI18n()
  return (
    <div
      className="flex items-center justify-center gap-2 text-[11px] text-faint"
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
      <CtxOption
        icon={<Plus size={17} />}
        label={t('ctx.buy')}
        onClick={() => {
          close()
          onBuy()
        }}
      />
      <CtxOption
        icon={<BarChart3 size={17} />}
        label={t('ctx.chart')}
        onClick={() => {
          close()
          nav.openSymbol(symbol)
        }}
      />
      <CtxOption
        icon={
          <Star size={17} className={market.favorites.includes(symbol) ? 'fill-warn text-warn' : ''} />
        }
        label={market.favorites.includes(symbol) ? t('ctx.unfav') : t('ctx.fav')}
        onClick={() => {
          market.toggleFavorite(symbol)
          close()
        }}
      />
    </div>
  )
}

function CtxOption({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] font-medium"
      onClick={onClick}
    >
      <span className="text-accent">{icon}</span>
      {label}
    </button>
  )
}

function VirtualRows({
  rows,
  favorites,
  onOpen,
  onQuick,
  onContext,
}: {
  rows: Ticker[]
  favorites: string[]
  onOpen: (s: string) => void
  onQuick: (s: string) => void
  onContext: (s: string) => void
}) {
  const parentRef = React.useRef<HTMLDivElement | null>(null)
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  })

  const setRef = useCallback((node: HTMLDivElement | null) => {
    parentRef.current = node
  }, [])

  return (
    <div ref={setRef} style={{ height: v.getTotalSize(), position: 'relative' }}>
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
              rank={item.index < 10 ? item.index + 1 : undefined}
              onOpen={onOpen}
              onQuick={onQuick}
              onContext={onContext}
            />
          </div>
        )
      })}
    </div>
  )
}

const MarketRow = React.memo(function MarketRow({
  ticker,
  fav,
  rank,
  onOpen,
  onQuick,
  onContext,
}: {
  ticker: Ticker
  fav: boolean
  rank?: number
  onOpen: (s: string) => void
  onQuick: (s: string) => void
  onContext: (s: string) => void
}) {
  const market = useMarket()
  const base = ticker.symbol.endsWith('USDT') ? ticker.symbol.slice(0, -4) : ticker.symbol
  const coinMeta = useCoinMeta(base)

  useEffect(() => {
    market.ensureSpark(ticker.symbol)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker.symbol])
  const long = useLongPress(() => onContext(ticker.symbol))
  const up = ticker.changePct24h >= 0

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex items-center gap-3 rounded-xl px-4 py-2 transition-colors duration-150 active:bg-surface-3"
      style={{ minHeight: 68, touchAction: 'pan-y' }}
      onClick={() => onOpen(ticker.symbol)}
      {...long}
    >
      {/* Icon + optional rank badge */}
      <div className="relative shrink-0">
        <CoinIcon symbol={ticker.symbol} size={38} layoutId={`coin-${ticker.symbol}`} />
        {rank && rank <= 5 && (
          <span
            className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #5b7bfe, #a259ff)',
              boxShadow: '0 1px 4px rgba(91,123,254,0.4)',
            }}
          >
            {rank}
          </span>
        )}
      </div>

      {/* Symbol + coin name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold">{base}</span>
          {fav && <Star size={11} className="shrink-0 fill-warn text-warn" />}
        </div>
        <div className="truncate text-[11px] text-faint">
          {coinMeta?.name || (
            <span className="tnum">{fmtCompact(ticker.quoteVolume24h)}</span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline path={market.spark[ticker.symbol]} up={up} />

      {/* Price + change */}
      <div className="w-[92px] text-right">
        <div className="text-[14px] font-semibold tnum">{fmtPrice(ticker.last)}</div>
        <div className="mt-0.5 flex justify-end">
          <PctChip pct={ticker.changePct24h} />
        </div>
      </div>

      {/* Quick buy button */}
      <button
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-accent transition-colors duration-150 hover:bg-surface-3"
        onClick={(e) => {
          e.stopPropagation()
          onQuick(ticker.symbol)
        }}
        aria-label="quick buy"
      >
        <Plus size={18} />
      </button>
    </motion.div>
  )
})

/** DEX-раздел (настройка dexEnabled): поиск DexScreener. */
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
    <div className="px-4 pb-8 pt-2">
      <div className="mb-2 text-[13px] font-semibold">{t('market.dex')}</div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search()
          }}
          placeholder={t('market.dexSearch')}
          className="min-w-0 flex-1 rounded-[12px] border border-line bg-surface px-3 py-2 text-[13px] outline-none"
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
          return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold">
                  {dexShortSymbol(p)} <span className="text-[10px] text-faint">{p.chainId}</span>
                </div>
                <div className="text-[10.5px] text-faint tnum">
                  liq ${fmtCompact(p.liquidityUsd)} · vol ${fmtCompact(p.volume24h)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] font-semibold tnum">{fmtPrice(p.priceUsd)}</div>
                <div className="mt-0.5 flex justify-end">
                  <PctChip pct={p.changePct24h} />
                </div>
              </div>
              {market.aliases[id] ? (
                <button
                  className="text-[11px] text-down"
                  onClick={() => market.removeDexToken(id)}
                  aria-label="remove"
                >
                  ✕
                </button>
              ) : (
                <button
                  className="text-[16px] text-accent"
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
