/** История: статистика, кривая капитала, журнал сделок. */
import { useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useTrading } from '../store/trading'
import { useMarketVersion } from '../hooks/useTickerPrice'
import { Header, EmptyState } from '../components/Atomics'
import { Chip, Seg } from '../components/ui'
import { EquityChart } from '../components/EquityChart'
import { computeStats, equityCurve } from '../lib/engine'
import { useI18n } from '../lib/i18n'
import { fmtUsd, fmtPrice, fmtQty, fmtDate, fmtPct } from '../lib/format'
import type { Trade } from '../lib/engine/types'

type Filter = 'all' | 'wins' | 'losses' | 'limit'

export function HistoryPage() {
  const { t } = useI18n()
  const trading = useTrading()
  const version = useMarketVersion()
  void version
  const snap = trading.snap
  const [filter, setFilter] = useState<Filter>('all')

  const stats = useMemo(
    () => (snap ? computeStats(snap.trades, snap.startBalance) : null),
    [snap]
  )

  const curve = useMemo(
    () => (snap ? equityCurve(snap.trades, snap.startBalance) : []),
    [snap]
  )

  const closed = useMemo(() => {
    if (!snap) return []
    const rs = snap.trades.filter((tr) => tr.pnl !== undefined)
    if (filter === 'wins') return rs.filter((tr) => parseFloat(tr.pnl as string) >= 0)
    if (filter === 'losses') return rs.filter((tr) => parseFloat(tr.pnl as string) < 0)
    if (filter === 'limit') return snap.trades.filter((tr) => tr.kind === 'limit')
    return snap.trades
  }, [snap, filter])

  if (!snap) return null
  const st = stats!

  return (
    <div className="flex h-full flex-col">
      <Header title={t('history.title')} />

      <div className="scroll flex-1" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 84px)' }}>
        <div className="px-3 pt-2">
          <Seg
            size="sm"
            layoutId="hist-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('history.filter.all') },
              { value: 'wins', label: t('history.filter.wins') },
              { value: 'losses', label: t('history.filter.losses') },
              { value: 'limit', label: t('history.filter.limit') },
            ]}
          />
        </div>

        {closed.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={20} />}
            title={t('history.empty')}
            hint={t('history.emptyHint')}
          />
        ) : (
          <>
            {/* Статистика */}
            <div className="mx-3 mt-3 rounded-[22px] border border-line bg-surface p-4">
              <div className="mb-2 text-[13px] font-semibold">{t('history.stats.title')}</div>
              <div className="grid grid-cols-3 gap-3">
                <Kv label={t('history.trades')} value={String(st.count)} />
                <Kv label={t('history.winrate')} value={fmtPct(st.winratePct, false)} accent={wrAccent(st.winratePct)} />
                <Kv label={t('history.pf')} value={st.profitFactor !== null ? st.profitFactor.toFixed(2) : '—'} />
                <Kv label={t('history.avgWin')} value={fmtUsd(st.avgWin)} accent="up" />
                <Kv label={t('history.avgLoss')} value={fmtUsd(-st.avgLoss)} accent="down" />
                <Kv label={t('history.mdd')} value={fmtPct(st.maxDrawdownPct, false)} accent="down" />
                <Kv label={t('history.best')} value={fmtUsd(st.best?.pnl ?? 0)} accent="up" />
                <Kv label={t('history.worst')} value={fmtUsd(st.worst?.pnl ?? 0)} accent="down" />
                <Kv label="Σ" value={fmtUsd(st.totalPnl, { sign: true })} accent={st.totalPnl >= 0 ? 'up' : 'down'} />
              </div>
            </div>

            {/* Кривая капитала */}
            <div className="mx-3 mt-4 rounded-[22px] border border-line bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[13px] font-semibold">{t('history.equity')}</div>
                <div className="text-[12px] text-faint tnum">
                  {fmtPct(st.totalPnl)} · {fmtUsd(st.totalPnl, { sign: true })}
                </div>
              </div>
              <EquityChart points={curve} />
            </div>

            {/* Журнал */}
            <div className="px-3 pt-4 text-[13px] font-semibold">{t('history.title')}</div>
            <div className="mx-3 mt-1 rounded-[22px] border border-line bg-surface">
              {closed.map((tr) => (
                <TradeRow key={tr.id + String(tr.ts)} tr={tr} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function wrAccent(wr: number): 'up' | 'down' | undefined {
  if (wr >= 50) return 'up'
  if (wr > 0) return 'down'
  return undefined
}

function Kv({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'up' | 'down'
}) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-faint">{label}</div>
      <div
        className={`mt-0.5 text-[14.5px] font-bold tnum ${
          accent === 'up' ? 'text-up' : accent === 'down' ? 'text-down' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function TradeRow({ tr }: { tr: Trade }) {
  const pnl = tr.pnl !== undefined ? parseFloat(tr.pnl) : null
  const dirSz = tr.side === 'buy' ? '+' : '−'
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Chip color={pnl === null ? 'neutral' : pnl >= 0 ? 'up' : 'down'} className="!px-1.5 !py-0 !text-[10px]">
            {tr.side === 'buy' ? 'BUY' : 'SELL'}
          </Chip>
          <span className="truncate text-[13.5px] font-semibold">{tr.symbol}</span>
          <span className="shrink-0 text-[10.5px] uppercase text-faint">
            {tr.kind}
            {tr.leverage ? ` ${tr.leverage}x` : ''}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-faint tnum">
          {dirSz}
          {fmtQty(tr.qty)} @ {fmtPrice(tr.price)} · {fmtDate(tr.ts)}
        </div>
      </div>
      <div className="text-right">
        {pnl !== null ? (
          <div className={`text-[13.5px] font-bold tnum ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
            {fmtUsd(pnl, { sign: true })}
          </div>
        ) : (
          <div className="text-[13px] font-semibold tnum">{fmtUsd(tr.quoteTotal)}</div>
        )}
        <div className="text-[11px] text-faint tnum">fee {fmtUsd(tr.fee)}</div>
      </div>
    </div>
  )
}
