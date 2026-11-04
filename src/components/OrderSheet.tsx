/** Нижний sheet ордера в минималистичном стиле (Phantom / Apple):
 *  - Чистый drawer с верхним хэндлом и заголовком монеты
 *  - Мягкий переключатель Long / Short без кислотного неона
 *  - Крупный лаконичный ввод суммы с переключателем валюты
 *  - Плоские кнопки процентов (25%, 50%, 75%, 100%)
 *  - Чёткая и аккуратная таблица параметров ордера
 *  - Минималистичная цельная кнопка действия */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  OctagonAlert,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Zap,
  PlusCircle,
  ArrowUpDown,
  Check,
} from 'lucide-react'
import { Sheet } from './ui'
import { CoinIcon } from './CoinIcon'
import { useI18n } from '../lib/i18n'
import { useMarket } from '../store/market'
import { useTrading, type SubmitArgs } from '../store/trading'
import { useSettings } from '../store/settings'
import { priceOf as priceOfStore } from '../store/trading'
import { D, floorToStep, liqPrice } from '../lib/engine'
import { fmtPrice, fmtQty, fmtUsd, fmtPct } from '../lib/format'
import { useToasts } from '../store/toasts'
import { buzz } from '../lib/haptics'

type OrderType = SubmitArgs['type']

const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50]
const PERCENT_PRESETS = [25, 50, 75, 100]

export function OrderSheet({
  open,
  onOpenChange,
  symbol,
  defaultSide,
  initialType,
  positionId,
  onPricePick: _onPricePick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  symbol: string
  defaultSide: 'buy' | 'sell'
  initialType?: OrderType
  positionId?: string
  onPricePick?: (p: string) => void
}) {
  const { t } = useI18n()
  const market = useMarket()
  const trading = useTrading()
  const settings = useSettings()
  const toast = useToasts.getState()

  const dexAlias = market.aliases[symbol]
  const ticker = market.bySymbol[symbol]
  const last = (dexAlias
    ? (() => {
        const id = `${dexAlias.chainId}:${dexAlias.pairAddress}`
        return market.dexPrices[id] ?? dexAlias?.priceUsd
      })()
    : ticker?.last) ?? (priceOfStore(symbol) ?? '')

  const [side, setSide] = useState<'buy' | 'sell'>(defaultSide)
  const [mode, setMode] = useState<'spot' | 'futures'>('futures')
  const [type, setType] = useState<OrderType>(initialType ?? 'market')
  const [unit, setUnit] = useState<'quote' | 'base'>('quote')
  const [amount, setAmount] = useState('')
  const [percentSlider, setPercentSlider] = useState<number>(0)
  const [limitPrice, setLimitPrice] = useState('')
  const [triggerPrice, setTriggerPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [slPrice, setSlPrice] = useState('')
  const [lev, setLev] = useState(20)
  const [levOpen, setLevOpen] = useState(false)
  const [tpsl, setTpsl] = useState(false)
  const [busy, setBusy] = useState(false)

  const baseSymbol = baseLabel(symbol, dexAlias)
  const filt = market.getFilters(symbol)
  const stepSize = D(filt.stepSize)

  const snap = trading.snap
  const cash = snap ? D(snap.cash) : D(0)
  const holdings = snap?.holdings[symbol]
  const heldQty = holdings ? D(holdings.qty) : D(0)
  const pos = snap?.positions.find((p) => p.symbol === symbol)

  // Reset/sync on sheet open
  useEffect(() => {
    if (!open) {
      setAmount('')
      setPercentSlider(0)
      setLimitPrice('')
      setTriggerPrice('')
      setTpPrice('')
      setSlPrice('')
      setType(initialType ?? 'market')
      setSide(defaultSide)
      setLevOpen(false)
    } else {
      if (last && !limitPrice) setLimitPrice(last)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setMode(settings.leverageEnabled ? 'futures' : 'spot')
  }, [settings.leverageEnabled])

  // Estimated fill / execution price
  const estPrice = useMemo(() => {
    const p = type === 'market' ? last : type === 'limit' ? limitPrice : triggerPrice || last
    const v = parseFloat(p || '')
    return isFinite(v) && v > 0 ? p : last
  }, [type, last, limitPrice, triggerPrice])

  // Calculated quantity
  const qtyRaw = useMemo(() => {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!isFinite(amt) || amt <= 0) return D(0)
    const ref = D(estPrice || last || '0')
    if (ref.lte(0)) return D(0)
    return unit === 'quote' ? D(amt).div(ref) : D(amt)
  }, [amount, unit, estPrice, last])

  const qty = useMemo(() => floorToStep(qtyRaw, stepSize), [qtyRaw, stepSize])
  const notional = useMemo(() => qty.mul(D(estPrice || last || '0')), [qty, estPrice, last])

  const fee = notional.mul(D(settings.feePct).div(100))
  const margin = mode === 'futures' ? notional.div(lev) : notional

  // Estimated liquidation price
  const refPrice = D(estPrice || last || '0')
  const estimatedLiq = useMemo(() => {
    if (mode !== 'futures') return null
    if (refPrice.lte(0)) return null
    return liqPrice(refPrice.toString(), lev, side === 'buy' ? 'long' : 'short')
  }, [mode, refPrice, lev, side])

  // TP/SL checkbox toggle
  const toggleTpsl = () => {
    buzz(6)
    if (tpsl) {
      setTpsl(false)
      if (type === 'oco') setType('market')
      return
    }
    setTpsl(true)
    const ref = parseFloat(estPrice || last || '0')
    if (isFinite(ref) && ref > 0) {
      const levScale = mode === 'futures' ? Math.min(lev, 10) : 1
      if (!tpPrice) {
        const tpDelta = side === 'buy' ? 0.05 * levScale : -0.05 * levScale
        setTpPrice((ref * (1 + tpDelta)).toPrecision(7))
      }
      if (!slPrice) {
        const slDelta = side === 'buy' ? -0.03 * levScale : 0.03 * levScale
        setSlPrice((ref * (1 + slDelta)).toPrecision(7))
      }
    }
    setType('oco')
  }

  // Quick percent applicator
  const applyPercent = (pct: number) => {
    buzz(8)
    setPercentSlider(pct)
    if (pct <= 0) {
      setAmount('')
      return
    }

    if (mode === 'spot') {
      if (side === 'buy') {
        const avail = cash.toNumber()
        const target = (avail * pct) / 100
        setAmount(target > 0 ? target.toFixed(2) : '0')
        setUnit('quote')
      } else {
        const avail = heldQty.toNumber()
        const target = (avail * pct) / 100
        setAmount(target > 0 ? target.toPrecision(6) : '0')
        setUnit('base')
      }
    } else {
      const availMargin = cash.toNumber()
      const effectiveMargin = Math.max(0, availMargin * 0.99)
      const targetNotional = (effectiveMargin * lev * pct) / 100
      if (unit === 'quote') {
        setAmount(targetNotional > 0 ? targetNotional.toFixed(2) : '0')
      } else {
        const p = parseFloat(estPrice || last || '0')
        if (p > 0) {
          const coinQty = targetNotional / p
          setAmount(coinQty > 0 ? coinQty.toFixed(4) : '0')
        }
      }
    }
  }

  const setTpPercentOffset = (pDelta: number) => {
    buzz(4)
    const ref = parseFloat(estPrice || last || '0')
    if (ref > 0) {
      const mult = side === 'buy' ? 1 + pDelta / 100 : 1 - pDelta / 100
      setTpPrice((ref * mult).toPrecision(7))
    }
  }

  const setSlPercentOffset = (pDelta: number) => {
    buzz(4)
    const ref = parseFloat(estPrice || last || '0')
    if (ref > 0) {
      const mult = side === 'buy' ? 1 - pDelta / 100 : 1 + pDelta / 100
      setSlPrice((ref * mult).toPrecision(7))
    }
  }

  // Validation
  const needPosition = mode === 'futures' && (type === 'oco' || type === 'take-profit' || type === 'stop-loss')
  const error = useMemo(() => {
    if (qty.lte(0)) return 'qty'
    if (notional.lt(D(filt.minNotional))) return 'minNotional'
    if ((type === 'limit' && !limitPrice) || (type !== 'market' && type !== 'limit' && type !== 'oco' && !triggerPrice)) return 'price'
    if (type === 'oco' && (!tpPrice || !slPrice)) return 'price'
    if (needPosition && !pos) return 'noPosition'

    if (mode === 'spot') {
      if (side === 'buy' && qty.gt(0)) {
        const need = notional.plus(fee)
        if (cash.lt(need)) return 'balance'
      }
      if (side === 'sell' && heldQty.lt(qty)) return 'asset'
    } else {
      const need = margin.plus(fee)
      if (cash.lt(need)) return 'balance'
    }
    return null
  }, [qty, notional, filt.minNotional, type, limitPrice, triggerPrice, tpPrice, slPrice, needPosition, pos, mode, side, cash, fee, heldQty, margin])

  const canSubmit = error === null && !busy

  const submit = () => {
    if (!canSubmit) return
    buzz(12)
    setBusy(true)
    const args: SubmitArgs = {
      symbol,
      market: mode,
      side,
      type: type === 'oco' ? 'oco' : type,
      qty: qty.toString(),
      limitPrice: type === 'limit' ? limitPrice : undefined,
      triggerPrice: type === 'stop-loss' || type === 'take-profit' ? triggerPrice : undefined,
      tpPrice: type === 'oco' ? tpPrice : undefined,
      slPrice: type === 'oco' ? slPrice : undefined,
      leverage: mode === 'futures' ? lev : undefined,
      positionId: needPosition ? (pos?.id ?? positionId) : undefined,
    }
    void trading
      .submitOrder(args)
      .then((res) => {
        if (!res.ok) {
          toast.push('error', errorText(res.error, t, filt.minNotional))
          return
        }
        buzz(18)
        onOpenChange(false)
      })
      .finally(() => setBusy(false))
  }

  const handleAddFunds = () => {
    buzz(10)
    trading.resetAccount('10000')
    toast.push('success', 'Added $10,000 USD paper trading balance')
  }

  const isLong = side === 'buy'

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      maxHeight="90dvh"
      title={
        <div className="flex items-center gap-2">
          <CoinIcon symbol={symbol} size={20} />
          <span className="font-semibold tracking-tight text-white">{symbol}</span>
          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-faint">
            {mode === 'futures' ? `${lev}x Perp` : 'Spot'}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-6 text-text">
        {/* ── 1. Clean Long / Short Switcher ── */}
        <div className="flex rounded-xl bg-surface-2 p-1 border border-line">
          <button
            onClick={() => {
              buzz(8)
              setSide('buy')
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold transition-colors ${
              isLong
                ? 'bg-[#00c076] text-[#032014]'
                : 'text-muted hover:text-white'
            }`}
          >
            <Zap size={15} className={isLong ? 'fill-current' : ''} />
            <span>{mode === 'futures' ? 'Long' : t('symbol.buy')}</span>
          </button>
          <button
            onClick={() => {
              buzz(8)
              setSide('sell')
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold transition-colors ${
              !isLong
                ? 'bg-[#ff3b5c] text-white'
                : 'text-muted hover:text-white'
            }`}
          >
            <Flame size={15} className={!isLong ? 'fill-current' : ''} />
            <span>{mode === 'futures' ? 'Short' : t('symbol.sell')}</span>
          </button>
        </div>

        {/* ── 2. Order Type Sub-tabs & Leverage Pill ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5 border border-line">
            {(['market', 'limit', 'stop-loss', 'oco'] as const).map((ot) => {
              const active = type === ot
              const label =
                ot === 'market'
                  ? 'Market'
                  : ot === 'limit'
                  ? 'Limit'
                  : ot === 'stop-loss'
                  ? 'Stop'
                  : 'TP/SL'
              return (
                <button
                  key={ot}
                  onClick={() => {
                    buzz(4)
                    setType(ot)
                    setTpsl(ot === 'oco')
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    active
                      ? 'bg-surface-3 text-white'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {settings.leverageEnabled && (
            <button
              onClick={() => {
                buzz(6)
                setLevOpen((v) => !v)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-text hover:bg-surface-3 transition-colors"
            >
              <SlidersHorizontal size={12} className="text-muted" />
              <span className="tnum">Leverage: <span className="font-semibold text-white">{lev}x</span></span>
              {levOpen ? <ChevronUp size={13} className="text-muted" /> : <ChevronDown size={13} className="text-muted" />}
            </button>
          )}
        </div>

        {/* ── Leverage Selector Drawer / Expandable ── */}
        <AnimatePresence>
          {levOpen && settings.leverageEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden rounded-xl border border-line bg-surface-2 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-faint">Adjust Leverage</span>
                <span className="text-[12px] font-semibold text-white tnum">{lev}x</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                {LEVERAGE_PRESETS.map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      buzz(4)
                      setLev(l)
                    }}
                    className={`h-7 rounded-md text-[11.5px] font-medium tnum transition-colors ${
                      lev === l
                        ? 'bg-white text-black font-semibold'
                        : 'bg-surface-3 text-muted hover:text-white'
                    }`}
                  >
                    {l}x
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={lev}
                onChange={(e) => setLev(parseInt(e.target.value))}
                className={`terminal-range-slider ${isLong ? '' : 'short-thumb'}`}
              />
              <div className="mt-1 flex justify-between text-[10px] text-faint tnum">
                <span>1x (100% Margin)</span>
                <span>20x (5% Margin)</span>
                <span>50x (2% Margin)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 3. Price Fields (Limit / Trigger) ── */}
        {(type === 'limit' || type === 'oco') && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
            <span className="text-[12px] text-muted">Price</span>
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={last ? fmtPrice(parseFloat(last)) : '0.00'}
                className="w-32 bg-transparent text-right font-semibold text-white text-[15px] outline-none tnum placeholder:text-faint"
              />
              <span className="text-[11px] font-medium text-faint">USDT</span>
              <button
                onClick={() => {
                  buzz(4)
                  if (last) setLimitPrice(last)
                }}
                className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted hover:text-white uppercase"
              >
                Last
              </button>
            </div>
          </div>
        )}

        {type === 'stop-loss' && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
            <span className="text-[12px] text-muted">Trigger Price</span>
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={last ? fmtPrice(parseFloat(last)) : '0.00'}
                className="w-32 bg-transparent text-right font-semibold text-white text-[15px] outline-none tnum placeholder:text-faint"
              />
              <span className="text-[11px] font-medium text-faint">USDT</span>
            </div>
          </div>
        )}

        {/* ── 4. Minimal Amount Input Box ── */}
        <div className="rounded-xl border border-line bg-surface-2 p-3.5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-muted">
              {isLong ? 'Buy Amount' : 'Sell Amount'}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-surface-3 px-2 py-0.5">
                <CoinIcon symbol={symbol} size={16} />
                <span className="text-[12px] font-medium text-text">{baseSymbol}</span>
              </div>
              <button
                onClick={() => {
                  buzz(4)
                  setUnit(unit === 'quote' ? 'base' : 'quote')
                }}
                className="flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-[11px] text-muted hover:text-white transition-colors"
                title="Switch unit"
              >
                <ArrowUpDown size={11} />
                <span>{unit === 'quote' ? 'USDT' : baseSymbol}</span>
              </button>
            </div>
          </div>

          {/* Main numeric input */}
          <div className="relative flex items-center justify-between py-1">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.]/g, '').replace(',', '.')
                setAmount(val)
              }}
              placeholder="0.0"
              className="w-full bg-transparent text-[30px] font-semibold text-white outline-none tnum placeholder:text-faint/40"
            />
            <span className="ml-2 text-[14px] font-medium text-muted shrink-0">
              {unit === 'quote' ? 'USDT' : baseSymbol}
            </span>
          </div>

          {/* Quick Percentage Flat Buttons */}
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {PERCENT_PRESETS.map((p) => {
              const active = percentSlider === p
              return (
                <button
                  key={p}
                  onClick={() => applyPercent(p)}
                  className={`h-7 rounded-lg text-[11.5px] font-medium tnum transition-colors ${
                    active
                      ? isLong
                        ? 'bg-[#00c076]/15 text-[#00c076] font-semibold'
                        : 'bg-[#ff3b5c]/15 text-[#ff3b5c] font-semibold'
                      : 'bg-surface-3/80 text-muted hover:text-white'
                  }`}
                >
                  {p}%
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 5. TP / SL Toggle & Details ── */}
        <div className="rounded-xl border border-line bg-surface-2 overflow-hidden">
          <button
            onClick={toggleTpsl}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-surface-3/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                  tpsl
                    ? 'border-accent bg-accent text-white'
                    : 'border-line-strong bg-transparent'
                }`}
              >
                {tpsl && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="text-[12.5px] font-medium text-text">Take Profit / Stop Loss</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11.5px]">
              <span className="text-faint">Est. Liq:</span>
              <span className={`font-medium tnum ${estimatedLiq ? 'text-warn' : 'text-faint'}`}>
                {estimatedLiq ? `$${fmtPrice(estimatedLiq)}` : '—'}
              </span>
            </div>
          </button>

          <AnimatePresence>
            {tpsl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="border-t border-line p-3 flex flex-col gap-2.5"
              >
                {/* Take Profit */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#00c076]">Take Profit</span>
                    <div className="flex items-center gap-1">
                      {[5, 10, 25, 50].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setTpPercentOffset(pct)}
                          className="rounded px-1 py-0.2 text-[10px] font-medium bg-[#00c076]/10 text-[#00c076] hover:bg-[#00c076]/20"
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center rounded-lg bg-surface-3 px-2.5 py-1.5">
                    <input
                      inputMode="decimal"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder={last ? fmtPrice(parseFloat(last) * 1.05) : '0.00'}
                      className="w-full bg-transparent text-[13px] font-medium text-white outline-none tnum"
                    />
                    <span className="text-[11px] text-faint">USDT</span>
                  </div>
                </div>

                {/* Stop Loss */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#ff3b5c]">Stop Loss</span>
                    <div className="flex items-center gap-1">
                      {[3, 5, 10, 20].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setSlPercentOffset(pct)}
                          className="rounded px-1 py-0.2 text-[10px] font-medium bg-[#ff3b5c]/10 text-[#ff3b5c] hover:bg-[#ff3b5c]/20"
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center rounded-lg bg-surface-3 px-2.5 py-1.5">
                    <input
                      inputMode="decimal"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder={last ? fmtPrice(parseFloat(last) * 0.95) : '0.00'}
                      className="w-full bg-transparent text-[13px] font-medium text-white outline-none tnum"
                    />
                    <span className="text-[11px] text-faint">USDT</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 6. Clean Order Summary Table ── */}
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 p-3 border border-line text-[12px]">
          <SummaryRow label="Available Margin">
            <span className="text-white">{fmtUsd(cash.toString())}</span>
          </SummaryRow>

          <SummaryRow label={t('order.orderValue')}>
            <span>{fmtUsd(notional.toString())}</span>
          </SummaryRow>

          {mode === 'futures' && (
            <>
              <SummaryRow label="Margin Required">
                <span className="text-white font-medium">{fmtUsd(margin.toString())}</span>
              </SummaryRow>
              <SummaryRow label="Est. Liq Price">
                <span className={`font-medium ${estimatedLiq ? 'text-warn' : 'text-faint'}`}>
                  {estimatedLiq ? `$${fmtPrice(estimatedLiq)}` : '—'}
                </span>
              </SummaryRow>
            </>
          )}

          <SummaryRow label={t('order.fee')}>
            <span className="text-muted">
              {fmtUsd(fee.toString())} ({fmtPct(settings.feePct)})
            </span>
          </SummaryRow>
        </div>

        {/* ── 7. Errors & Hints ── */}
        {error === 'balance' && (
          <div className="flex items-center justify-between rounded-xl bg-down/10 px-3 py-2 text-[12px] text-down border border-down/20">
            <div className="flex items-center gap-1.5">
              <Flame size={14} />
              <span>Insufficient margin balance</span>
            </div>
            <button
              onClick={handleAddFunds}
              className="flex items-center gap-1 rounded bg-down/20 px-2 py-0.5 font-medium text-white text-[11px]"
            >
              <PlusCircle size={12} /> Add Funds
            </button>
          </div>
        )}
        {error === 'minNotional' && (
          <div className="flex items-center gap-1.5 text-[12px] text-down">
            <OctagonAlert size={14} />
            <span>Min order value: ${parseFloat(filt.minNotional)}</span>
          </div>
        )}
        {error === 'price' && (
          <div className="flex items-center gap-1.5 text-[12px] text-down">
            <OctagonAlert size={14} />
            <span>Please enter a valid price</span>
          </div>
        )}
        {error === 'noPosition' && (
          <div className="flex items-center gap-1.5 text-[12px] text-down">
            <OctagonAlert size={14} />
            <span>Open position required for TP/SL</span>
          </div>
        )}

        {/* ── 8. Minimal Solid Action Button ── */}
        {cash.lte(0) ? (
          <button
            onClick={handleAddFunds}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-white font-semibold text-[15px] transition-transform active:scale-[0.98]"
          >
            <PlusCircle size={17} />
            Add Funds ($10,000)
          </button>
        ) : (
          <button
            disabled={!canSubmit}
            onClick={submit}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] ${
              !canSubmit
                ? 'opacity-40 bg-surface-3 text-muted cursor-not-allowed'
                : isLong
                ? 'bg-[#00c076] text-[#032014]'
                : 'bg-[#ff3b5c] text-white'
            }`}
          >
            {isLong ? <Zap size={16} className="fill-current" /> : <Flame size={16} className="fill-current" />}
            <span>
              {isLong ? `Long ${baseSymbol}` : `Short ${baseSymbol}`}
              {mode === 'futures' && ` (${lev}x)`}
            </span>
          </button>
        )}
      </div>
    </Sheet>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-faint">{label}</span>
      <span className="font-normal text-text tnum">{children}</span>
    </div>
  )
}

function baseLabel(symbol: string, alias: { base: string } | null | undefined): string {
  if (alias) return alias.base
  if (symbol.endsWith('USDT')) return symbol.slice(0, -4)
  return symbol
}

function errorText(
  code: string | undefined,
  t: (k: string, v?: Record<string, string | number>) => string,
  minNotional: string
): string {
  switch (code) {
    case 'INSUFFICIENT_BALANCE':
      return t('toast.error.balance')
    case 'INSUFFICIENT_ASSET':
      return t('toast.error.asset')
    case 'MIN_NOTIONAL':
      return t('toast.error.minNotional', { min: String(parseFloat(minNotional)) })
    case 'MIN_QTY':
      return t('toast.error.minQty')
    case 'INVALID_PRICE':
      return t('toast.error.price')
    case 'INVALID_QTY':
      return t('toast.error.qty')
    case 'OFFLINE':
      return t('toast.error.offline')
    default:
      return t('toast.error.unknown')
  }
}
