/** Портфель: капитал, PnL, донат распределения, позиции и активы. */
import { useMemo } from 'react'
import { X, PieChart, Wallet } from 'lucide-react'
import { useNav } from '../store/navigation'
import { useTrading, priceOf } from '../store/trading'
import { useMarketVersion } from '../hooks/useTickerPrice'
import { computeEquity } from '../lib/engine'
import { Header, EmptyState } from '../components/Atomics'
import { Odometer } from '../components/Odometer'
import { Donut, DonutLegend } from '../components/Donut'
import { CoinIcon } from '../components/CoinIcon'
import { Chip } from '../components/ui'
import { useI18n } from '../lib/i18n'
import { fmtUsd, fmtQty, fmtPrice, fmtPct } from '../lib/format'
import { D } from '../lib/engine'

export function PortfolioPage() {
  const nav = useNav()
  const { t } = useI18n()
  const version = useMarketVersion()
  void version
  const trading = useTrading()
  const snap = trading.snap

  const eq = useMemo(
    () => (snap ? computeEquity(snap, priceOf) : null),
    [snap]
  )

  const dayPnl = useMemo(() => {
    if (!eq || !snap) return 0
    return parseFloat(eq.equity) - parseFloat(snap.dayAnchor.equity)
  }, [eq, snap])

  const allPnl = useMemo(() => {
    if (!eq || !snap) return 0
    return parseFloat(eq.equity) - parseFloat(snap.startBalance)
  }, [eq, snap])

  const items = useMemo(() => {
    if (!snap) return []
    const list: Array<{ label: string; value: number }> = [
      { label: 'USDT · ' + t('portfolio.cash'), value: parseFloat(snap.cash) },
    ]
    for (const [sym, h] of Object.entries(snap.holdings)) {
      const p = priceOf(sym)
      const v = p ? parseFloat(D(h.qty).mul(D(p)).toFixed(4)) : 0
      if (v > 0) list.push({ label: sym, value: v })
    }
    for (const p of snap.positions) {
      if (parseFloat(p.margin) > 0) list.push({ label: `${p.symbol} ${p.leverage}x`, value: parseFloat(p.margin) })
    }
    return list
  }, [snap, version, t])

  const equity = eq ? parseFloat(eq.equity) : 0
  const dayPct = snap && parseFloat(snap.dayAnchor.equity) > 0 ? (dayPnl / parseFloat(snap.dayAnchor.equity)) * 100 : 0
  const allPct = snap && parseFloat(snap.startBalance) > 0 ? (allPnl / parseFloat(snap.startBalance)) * 100 : 0
  const hasPositions = snap && snap.positions.length > 0
  const hasHoldings = snap && Object.values(snap.holdings).some((h) => parseFloat(h.qty) > 0)

  return (
    <div className="flex h-full flex-col">
      <Header title={t('portfolio.title')} />

      <div className="scroll flex-1" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 84px)' }}>
        {/* Капитал */}
        <div className="px-4 pt-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-faint">
            {t('portfolio.equity')}
          </div>
          <div className="mt-1 text-[34px] font-bold leading-tight">
            {eq ? (
              <Odometer value={fmtUsd(eq.equity)} flash />
            ) : (
              <span className="skel inline-block h-8 w-40" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatCell label={t('portfolio.pnlDay')} value={fmtUsd(dayPnl, { sign: true })} pct={dayPct} />
            <StatCell label={t('portfolio.pnlAll')} value={fmtUsd(allPnl, { sign: true })} pct={allPct} />
          </div>
          {eq && snap && (
            <div className="mt-2 flex gap-4 text-[11.5px] text-faint tnum">
              <span>
                {t('portfolio.usdtFree')}: <b className="text-muted">{fmtUsd(snap.cash)}</b>
              </span>
              <span>
                {t('portfolio.upnl')}: <PnlValue v={eq.upnl} />
              </span>
            </div>
          )}
        </div>

        {/* Донат */}
        <div className="mx-3 mt-4 rounded-[22px] border border-line bg-surface p-4">
          <div className="mb-2 text-[13px] font-semibold">{t('portfolio.distribution')}</div>
          {items.length > 0 ? (
            <div className="flex flex-col items-center pt-1">
              <Donut items={items} center={<CenterEquity v={equity} />} />
              <DonutLegend items={items} delay={0.3} />
            </div>
          ) : (
            <EmptyState title={t('portfolio.empty')} hint={t('portfolio.emptyHint')} icon={<PieChart size={20} />} />
          )}
        </div>

        {/* Позиции фьючерсов */}
        {hasPositions && snap && (
          <div className="mx-3 mt-4 rounded-[22px] border border-line bg-surface p-4">
            <div className="mb-2 text-[13px] font-semibold">{t('portfolio.positions')}</div>
            <div className="flex flex-col">
              {snap.positions.map((p) => (
                <PositionRow key={p.id} p={p} onOpen={(s) => nav.openSymbol(s)} />
              ))}
            </div>
          </div>
        )}

        {/* Активы спота */}
        <div className="mx-3 mt-4 rounded-[22px] border border-line bg-surface p-4">
          <div className="mb-2 text-[13px] font-semibold">{t('portfolio.assets')}</div>
          {hasHoldings && snap ? (
            <div className="flex flex-col">
              {Object.entries(snap.holdings)
                .filter(([, h]) => parseFloat(h.qty) > 0)
                .map(([sym, h]) => (
                  <HoldingRow key={sym} sym={sym} qty={h.qty} avg={h.avgPrice} onOpen={(s) => nav.openSymbol(s)} />
                ))}
            </div>
          ) : (
            <EmptyState title={t('portfolio.empty')} hint={t('portfolio.emptyHint')} icon={<Wallet size={20} />} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value, pct }: { label: string; value: string; pct: number }) {
  const colorCls = pct >= 0 ? 'text-up' : 'text-down'
  return (
    <div className="rounded-[16px] border border-line bg-surface px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-faint">{label}</div>
      <div className={`mt-0.5 text-[14px] font-bold tnum ${colorCls}`}>{value}</div>
      <div className={`text-[11px] tnum ${colorCls}`}>{fmtPct(pct)}</div>
    </div>
  )
}

function PnlValue({ v }: { v: string | number }) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return <b className={n >= 0 ? 'text-up' : 'text-down'}>{fmtUsd(v, { sign: true })}</b>
}

function CenterEquity({ v }: { v: number }) {
  return (
    <div>
      <div className="text-[20px] font-bold tnum">${fmtPrice(v)}</div>
      <div className="text-[10px] text-faint">Σ</div>
    </div>
  )
}

/** Строка позиции фьючерса: маржа, upnl, кнопка закрытия. */
function PositionRow({ p, onOpen }: { p: { id: string; symbol: string; side: 'long' | 'short'; leverage: number; qty: string; entryPrice: string; margin: string; liqPrice: string }; onOpen: (s: string) => void }) {
  const { t } = useI18n()
  const trading = useTrading()
  const version = useMarketVersion()
  void version
  const price = parseFloat(priceOf(p.symbol) ?? '') || 0
  const dir = p.side === 'long' ? 1 : -1
  const pnl = price > 0 ? (price - parseFloat(p.entryPrice)) * dir * parseFloat(p.qty) : 0
  const margin = parseFloat(p.margin)
  const pnlPct = margin > 0 ? (pnl / margin) * 100 : 0

  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <button className="flex items-center gap-2.5 text-left" onClick={() => onOpen(p.symbol)}>
        <CoinIcon symbol={p.symbol.replace('USDT', '')} size={34} />
        <div>
          <div className="flex items-center gap-1.5 text-[14px] font-semibold">
            {p.symbol}
            <Chip color={p.side === 'long' ? 'up' : 'down'} className="!px-1.5 !py-0 !text-[10px]">
              {p.side.toUpperCase()} {p.leverage}x
            </Chip>
          </div>
          <div className="mt-0.5 text-[11px] text-faint tnum">
            {fmtQty(p.qty)} @ {fmtPrice(p.entryPrice)} · {pfloorLt(p.liqPrice, t)}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className={`text-[14px] font-bold tnum ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
            {fmtUsd(pnl, { sign: true })}
          </div>
          <div className={`text-[11px] tnum ${pnl >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(pnlPct)}</div>
        </div>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted"
          onClick={() => trading.closePosition(p.id)}
          aria-label={t('symbol.close')}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

function pfloorLt(liq: string, t: (k: string) => string): string {
  return `${t('portfolio.liquidation')} ${fmtPrice(liq)}`
}

/** Строка спот-актива: количество, стоимость и PnL с avg. */
function HoldingRow({ sym, qty, avg, onOpen }: { sym: string; qty: string; avg: string; onOpen: (s: string) => void }) {
  const version = useMarketVersion()
  void version
  const price = parseFloat(priceOf(sym) ?? '') || 0
  const q = parseFloat(qty) || 0
  const val = q * price
  const pnl = price > 0 ? (price - parseFloat(avg)) * q : 0
  const pnlPct = parseFloat(avg) > 0 ? ((price - parseFloat(avg)) / parseFloat(avg)) * 100 : 0

  return (
    <button className="flex items-center justify-between border-b border-line py-3 text-left last:border-0" onClick={() => onOpen(sym)}>
      <div className="flex items-center gap-2.5">
        <CoinIcon symbol={sym.replace('USDT', '')} size={34} />
        <div>
          <div className="text-[14px] font-semibold">{sym}</div>
          <div className="text-[11px] text-faint tnum">
            {fmtQty(qty)} @ {fmtPrice(avg)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[14px] font-semibold tnum">{fmtUsd(val)}</div>
        <div className={`text-[11px] tnum ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
          {fmtUsd(pnl, { sign: true })} ({fmtPct(pnlPct)})
        </div>
      </div>
    </button>
  )
}
