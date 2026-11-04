/** Стакан в стиле про-терминала: кумулятив Σ на-quote, бары глубины справа, спред-строка.
 *  Тап по уровню — цена в ордер-пэд (ask → buy, bid → sell). */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Depth } from '../api/types'
import { onChartDepth } from '../store/market'
import { useLongPress } from '../hooks/useLongPress'
import { fmtPrice, fmtCompact } from '../lib/format'

export interface BookLevel {
  price: string
  qty: number
}

const ROWS = 10

export function OrderBook({
  symbol,
  onPricePick,
}: {
  symbol: string
  onPricePick?: (price: string, side: 'buy' | 'sell') => void
}) {
  const [depth, setDepth] = useState<Depth | null>(null)
  const [flashSide, setFlashSide] = useState<'bid' | 'ask' | null>(null)
  const flashTimer = useRef<number | null>(null)
  const lastMid = useRef(0)

  useEffect(() => {
    const off = onChartDepth(symbol, (d) => {
      setDepth(d)
      // короткая вспышка стороны, к которой пришёл агрессор
      const bid = parseFloat(d.bids[0]?.[0] ?? '0')
      const ask = parseFloat(d.asks[0]?.[0] ?? '0')
      if (bid > 0 && ask > 0 && bid <= ask && ask > lastMid.current) {
        lastMid.current = ask
        setFlashSide('ask')
      } else if (bid > 0 && ask > 0) {
        setFlashSide('bid')
      }
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashSide(null), 450)
    })
    setDepth(null)
    return off
  }, [symbol])

  const levels = useMemo(() => {
    const asks = depth?.asks.slice(0, ROWS) ?? []
    const bids = depth?.bids.slice(0, ROWS) ?? []
    // кумулятив: от лучших к хвосту
    let cum = 0
    const asksC = asks.map(([p, q]) => {
      cum += parseFloat(q) * parseFloat(p)
      return { price: p, qty: parseFloat(q), cum }
    })
    cum = 0
    const bidsC = bids.map(([p, q]) => {
      cum += parseFloat(q) * parseFloat(p)
      return { price: p, qty: parseFloat(q), cum }
    })
    const maxCum = Math.max(asksC[asksC.length - 1]?.cum ?? 0, bidsC[bidsC.length - 1]?.cum ?? 0, 1)
    const bestBid = parseFloat(bids[0]?.[0] ?? '0')
    const bestAsk = parseFloat(asks[0]?.[0] ?? '0')
    const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0
    const spreadAbs = bestBid > 0 && bestAsk > 0 ? bestAsk - bestBid : 0
    const spreadPct = mid > 0 ? (spreadAbs / mid) * 100 : 0
    return { asksC, bidsC, maxCum, mid, spreadAbs, spreadPct }
  }, [depth])

  const longPress = useLongPress(() => {
    if (levels.bidsC[0] && onPricePick) onPricePick(levels.bidsC[0].price, 'sell')
  }, 520)

  if (!depth) {
    return (
      <div className="flex h-[264px] flex-col items-center justify-center text-faint">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="text-[12px]"
        >
          Depth…
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-3 pb-3" {...longPress} style={{ touchAction: 'pan-y' }}>
      <div className="overflow-hidden rounded-[16px] text-[11px] tnum">
        <div className="grid grid-cols-[1fr_auto_1fr] pb-1.5 text-[10px] font-medium uppercase tracking-wider text-faint">
          <span>Price</span>
          <span className="text-right">Amount (USD)</span>
          <span className="text-right">Total (USD)</span>
        </div>

        {/* asks — снизу вверх (лучшая ближе к спреду) */}
        <div className="flex flex-col-reverse">
          <AnimatePresence initial={false}>
            {levels.asksC.map((l, i) => (
              <Level
                key={`a${l.price}`}
                idx={i}
                side="ask"
                price={l.price}
                qty={l.qty}
                cum={l.cum}
                maxCum={levels.maxCum}
                flash={flashSide === 'ask' && l.price === depth.asks[0][0]}
                onPick={onPricePick}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* центральный блок: Spread в стиле Axiom / Hyperliquid */}
        <div className="my-1.5 flex items-center justify-center gap-2 border-y border-line/60 bg-surface-2/40 py-1 text-[11px] tnum">
          <span className="text-muted font-medium">Spread:</span>
          <span className="font-semibold text-text">{fmtPrice(levels.spreadAbs)}</span>
          <span className="text-faint">·</span>
          <span className="text-faint">{levels.spreadPct > 0 ? `${levels.spreadPct.toFixed(3)}%` : '0.001%'}</span>
        </div>

        {/* bids — сверху вниз */}
        <AnimatePresence initial={false}>
          {levels.bidsC.map((l, i) => (
            <Level
              key={`b${l.price}`}
              idx={i}
              side="bid"
              price={l.price}
              qty={l.qty}
              cum={l.cum}
              maxCum={levels.maxCum}
              flash={flashSide === 'bid' && l.price === depth.bids[0][0]}
              onPick={onPricePick}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Level({
  idx,
  side,
  price,
  qty,
  cum,
  maxCum,
  flash,
  onPick,
}: {
  idx: number
  side: 'bid' | 'ask'
  price: string
  qty: number
  cum: number
  maxCum: number
  flash: boolean
  onPick?: (price: string, side: 'buy' | 'sell') => void
}) {
  const pct = Math.max(3, (cum / maxCum) * 100)
  const color = side === 'bid' ? 'var(--up)' : 'var(--down)'
  const pickSide = side === 'bid' ? 'sell' : 'buy'
  const fade = 1 - Math.min(0.5, idx * 0.07)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 20 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.14 }}
      className="relative grid cursor-pointer grid-cols-[1fr_auto_1fr]"
      onClick={() => onPick?.(price, pickSide)}
      style={{ touchAction: 'manipulation' }}
    >
      {/* бар кумулятивной глубины, привязан к правому краю */}
      <motion.span
        className="absolute inset-y-0 right-0 rounded-l"
        style={{
          background: `linear-gradient(to left, ${color}, transparent)`,
          opacity: flash ? 0.22 : 0.07,
          transition: 'opacity .35s ease-out',
        }}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.22 }}
      />
      <span
        className={`relative px-1 py-0.5 font-medium ${flash ? 'font-bold' : ''}`}
        style={{ color, opacity: fade + 0.25 }}
      >
        {fmtPrice(price)}
      </span>
      <span className="relative py-0.5 text-right text-[10.5px] text-muted">
        {qty >= 1 ? qty.toFixed(2) : qty.toPrecision(3)}
      </span>
      <span className="relative py-0.5 pr-1 text-right text-[10.5px] text-muted">
        {fmtCompact(cum)}
      </span>
    </motion.div>
  )
}
