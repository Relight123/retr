/** Лента сделок: стрим aggTrade, кэп 40, подсветка «крупных» и баланс продаж/покупок. */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TradeTick } from '../api/types'
import { onChartTrades } from '../store/market'
import { fmtPrice, fmtTime, fmtCompact, fmtDecimalsForPrice } from '../lib/format'

const CAP = 40
/** notional сделки (USDT), с которой трейд считается «крупным». */
const WHALE_NOTIONAL = 20_000

export function TradesTape({ symbol }: { symbol: string }) {
  const [trades, setTrades] = useState<TradeTick[]>([])
  const buf = useRef<TradeTick[]>([])

  useEffect(() => {
    buf.current = []
    setTrades([])
    const flush = window.setInterval(() => {
      if (buf.current.length === 0) return
      const batch = buf.current
      buf.current = []
      setTrades((prev) => [...batch, ...prev].slice(0, CAP))
    }, 400)
    const off = onChartTrades(symbol, (t) => {
      buf.current.push(t)
      if (buf.current.length > 220) buf.current = buf.current.slice(-120)
    })
    return () => {
      window.clearInterval(flush)
      off()
    }
  }, [symbol])

  // прецизионность количества по цене (как в стакане)
  const qtyDecimals = useMemo(
    () => (trades[0] ? fmtDecimalsForPrice(parseFloat(trades[0].price)) : 4),
    [trades]
  )

  // баланс тейкеров по видимым сделкам
  const { buyPct, sellVol, buyVol } = useMemo(() => {
    let b = 0
    let s = 0
    for (const t of trades) {
      const notional = parseFloat(t.price) * parseFloat(t.qty)
      if (t.sell) s += notional
      else b += notional
    }
    const total = b + s
    return { buyPct: total > 0 ? (b / total) * 100 : 50, buyVol: b, sellVol: s }
  }, [trades])

  return (
    <div className="flex flex-col px-3 pb-3">
      {/* поток тейкеров: куплено / продано */}
      <div className="mb-2 rounded-[12px] bg-surface-2 px-2.5 py-2">
        <div className="flex items-center justify-between text-[10.5px] font-medium tnum">
          <span className="flex items-center gap-1" style={{ color: 'var(--up)' }}>
            <span className="text-[10px] font-bold">{Math.round(buyPct)}%</span>
            B {fmtCompact(buyVol)}
          </span>
          <span className="text-faint">Buy / Sell</span>
          <span className="flex items-center gap-1" style={{ color: 'var(--down)' }}>
            S {fmtCompact(sellVol)}
            <span className="text-[10px] font-bold">{Math.round(100 - buyPct)}%</span>
          </span>
        </div>
        <div className="mt-1.5 flex h-[5px] gap-0.5 overflow-hidden rounded-full">
          <span
            className="rounded-full transition-all duration-300"
            style={{ background: 'var(--up)', opacity: 0.9, width: `${buyPct}%` }}
          />
          <span
            className="flex-1 rounded-full"
            style={{ background: 'var(--down)', opacity: 0.9 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-faint">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>
      {trades.length === 0 ? (
        <div className="flex h-[190px] items-center justify-center text-faint">
          <span className="text-[12px] animate-pulse">
            Tape…
          </span>
        </div>
      ) : (
        <div className="flex max-h-[210px] flex-col overflow-hidden">
          {trades.map((t, i) => {
            const notional = parseFloat(t.price) * parseFloat(t.qty)
            const whale = notional >= WHALE_NOTIONAL
            const col = t.sell ? 'var(--down)' : 'var(--up)'
            return (
              <div
                key={`${t.ts}-${t.price}-${t.qty}-${i}`}
                style={{
                  opacity: whale ? 1 : Math.max(0.45, 1 - i * 0.035),
                }}
                className="grid shrink-0 items-center grid-cols-3 rounded py-[1.5px] text-[11px] tnum"
              >
                <span className="flex items-center gap-1 font-medium" style={{ color: col }}>
                  {whale && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-warn/20 px-1 py-[1px] text-[9px] font-bold text-warn" title={`Whale: ${fmtCompact(notional)}`}>
                      🐋
                    </span>
                  )}
                  {fmtPrice(t.price)}
                </span>
                <span className={`text-right ${whale ? 'font-semibold' : 'text-[10.5px] text-muted'}`}>
                  {parseFloat(t.qty).toFixed(qtyDecimals)}
                </span>
                <span className="text-right text-[9.5px] text-faint">{fmtTime(t.ts)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
