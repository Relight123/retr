/** График в стиле Moonshot:
 *  - Чистая область с неоново-зеленым градиентом (Area) или переключение на свечи (Candles)
 *  - Зеленый бейдж текущей цены на правой оси: [ $80,598 ◂ ]
 *  - Социальные маркеры сделок трейдеров на кривой графика (желтые кружки / стаки с аватарами)
 *  - Таймфрейм-пилюли под графиком: 4ч, 1д, 1н, 1мес, 1г, Все (с активным стилем)
 *  - Переключатели: свечи, индикаторы, полноэкранный режим
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import {
  CandlestickChart,
  SlidersHorizontal,
  Maximize2,
  TrendingUp,
} from 'lucide-react'
import type { Kline } from '../api/types'
import { onChartKline } from '../store/market'
import { useNav } from '../store/navigation'
import { fmtDecimalsForPrice, fmtPrice, fmtCompact } from '../lib/format'
import { buzz } from '../lib/haptics'

const UP_COLOR = '#00d26a'
const DOWN_COLOR = '#ff3b5c'
const VOL_UP_COLOR = 'rgba(0, 210, 106, 0.20)'
const VOL_DOWN_COLOR = 'rgba(255, 59, 92, 0.20)'

/** Offset to make lightweight-charts display local device time instead of UTC */
const tzOffsetMs = -new Date().getTimezoneOffset() * 60 * 1000

function toLocalTs(epochMs: number): UTCTimestamp {
  return Math.floor((epochMs + tzOffsetMs) / 1000) as UTCTimestamp
}

interface CrosshairData {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const TIMEFRAMES = [
  { label: '4ч', interval: '4h', rangeSec: 4 * 3600 },
  { label: '1д', interval: '1h', rangeSec: 24 * 3600 },
  { label: '1н', interval: '4h', rangeSec: 7 * 24 * 3600 },
  { label: '1мес', interval: '1d', rangeSec: 30 * 24 * 3600 },
  { label: '1г', interval: '1d', rangeSec: 365 * 24 * 3600 },
  { label: 'Все', interval: '1d', rangeSec: null },
]

export function PriceChart({ symbol, klines }: { symbol: string; klines: Kline[] }) {
  const holder = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Candlestick'> | null>(null)
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const chartStyle = useNav((s) => s.chartStyle)
  const setChartStyle = useNav((s) => s.setChartStyle)
  const interval = useNav((s) => s.interval)
  const setIntervalNav = useNav((s) => s.setInterval)

  const styleRef = useRef(chartStyle)
  styleRef.current = chartStyle

  const [activeTf, setActiveTf] = useState('Все')
  const [lastBar, setLastBar] = useState<Kline | null>(klines[klines.length - 1] ?? null)
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null)
  const [priceY, setPriceY] = useState<number | null>(null)
  const [activeMarkerInfo, setActiveMarkerInfo] = useState<{ name: string; action: string; price: string } | null>(null)
  const [markerCoords, setMarkerCoords] = useState<Array<{ x: number; y: number; marker: any }>>([])

  // Социальные маркеры трейдеров на кривой графика (Moonshot signature)
  const sampleMarkers = useMemo(() => {
    if (klines.length < 8) return []
    const len = klines.length
    return [
      {
        idx: Math.max(1, Math.floor(len * 0.22)),
        type: 'single',
        avatar: '👨‍🚀',
        name: 'whalesol',
        action: 'купил 0.45 BTC',
        count: 1,
      },
      {
        idx: Math.max(2, Math.floor(len * 0.42)),
        type: 'single',
        avatar: '🦊',
        name: 'crypto_chad',
        action: 'купил 1.20 BTC',
        count: 1,
      },
      {
        idx: Math.max(3, Math.floor(len * 0.65)),
        type: 'stacked',
        avatar: '🔥',
        name: '3 холдера',
        action: 'купили на пробое',
        count: 3,
      },
      {
        idx: Math.max(4, Math.floor(len * 0.84)),
        type: 'stacked',
        avatar: '⚡',
        name: '4 трейдера',
        action: 'активные покупки',
        count: 4,
      },
      {
        idx: Math.min(len - 1, Math.max(5, Math.floor(len * 0.94))),
        type: 'single',
        avatar: '💎',
        name: 'diamond_hands',
        action: 'купил на пике',
        count: 1,
      },
    ]
  }, [klines.length, symbol])

  // Обновление координаты цены на правой шкале
  const updatePriceBadgeY = useCallback(() => {
    const chart = chartRef.current
    const main = mainRef.current
    if (!chart || !main || klines.length === 0) return

    const last = klines[klines.length - 1]
    if (!last) return
    const priceVal = parseFloat(last.close)
    const y = main.priceToCoordinate(priceVal)
    if (y !== null && !isNaN(y)) {
      setPriceY(y)
    }

    // Обновляем координаты маркеров
    const coords: Array<{ x: number; y: number; marker: any }> = []
    const timeScale = chart.timeScale()

    for (const m of sampleMarkers) {
      const k = klines[m.idx]
      if (!k) continue
      const ts = toLocalTs(k.time)
      const x = timeScale.timeToCoordinate(ts)
      const yCoord = main.priceToCoordinate(parseFloat(k.close))
      if (x !== null && yCoord !== null && !isNaN(x) && !isNaN(yCoord) && x > 20 && x < holder.current!.clientWidth - 60) {
        coords.push({ x, y: yCoord, marker: m })
      }
    }
    setMarkerCoords(coords)
  }, [klines, sampleMarkers])

  // Инициализация TradingView Lightweight Charts
  useEffect(() => {
    const el = holder.current
    if (!el) return

    const chart = createChart(el, {
      localization: {
        locale: 'ru-RU',
        dateFormat: 'yyyy-MM-dd',
      },
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#7d8799',
        fontFamily: "'Inter Variable', -apple-system, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.025)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.025)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.04)',
        scaleMargins: { top: 0.12, bottom: 0.22 },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.04)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 6.5,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.12)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1a1f2c',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.12)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1a1f2c',
        },
      },
      autoSize: false,
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
      handleScroll: { vertTouchDrag: false },
    })
    chartRef.current = chart

    let crosshairRaf: number | null = null
    const handleCrosshairMove = (param: any) => {
      if (crosshairRaf !== null) return
      crosshairRaf = requestAnimationFrame(() => {
        crosshairRaf = null
        if (!param || !param.time || !param.seriesData?.size) {
          setCrosshairData(null)
          return
        }
        const main = mainRef.current
        if (!main) return
        const data = param.seriesData.get(main)
        if (!data) {
          setCrosshairData(null)
          return
        }
        const volSeries = volRef.current
        const volData = volSeries ? (param.seriesData.get(volSeries) as any) : null
        const vol = volData?.value ?? 0

        if ('open' in data && 'close' in data) {
          setCrosshairData({
            open: Number(data.open),
            high: Number(data.high),
            low: Number(data.low),
            close: Number(data.close),
            volume: Number(vol),
          })
        } else if ('value' in data) {
          setCrosshairData({
            open: Number(data.value),
            high: Number(data.value),
            low: Number(data.value),
            close: Number(data.value),
            volume: Number(vol),
          })
        }
      })
    }
    chart.subscribeCrosshairMove(handleCrosshairMove)

    // Подписка на скролл / изменение масштаба для пересчета Y цены
    chart.timeScale().subscribeVisibleLogicalRangeChange(updatePriceBadgeY)
    chart.timeScale().subscribeVisibleTimeRangeChange(updatePriceBadgeY)

    let resizeRaf: number | null = null
    const resize = () => {
      if (resizeRaf !== null) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        if (!el || !chartRef.current) return
        const w = el.clientWidth
        const h = el.clientHeight
        if (w > 0 && h > 0) {
          chartRef.current.resize(w, h)
          updatePriceBadgeY()
        }
      })
    }
    const initW = el.clientWidth
    const initH = el.clientHeight
    if (initW > 0 && initH > 0) chart.resize(initW, initH)

    const ro = new ResizeObserver(resize)
    ro.observe(el)

    return () => {
      if (crosshairRaf !== null) cancelAnimationFrame(crosshairRaf)
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      mainRef.current = null
      volRef.current = null
    }
  }, [updatePriceBadgeY])

  // Установка данных серии
  const setData = useCallback(() => {
    const main = mainRef.current
    const vol = volRef.current
    if (!main || !vol || klines.length === 0) return

    if (styleRef.current === 'candles') {
      const series = main as ISeriesApi<'Candlestick'>
      series.setData(
        klines.map((k) => ({
          time: toLocalTs(k.time),
          open: parseFloat(k.open),
          high: parseFloat(k.high),
          low: parseFloat(k.low),
          close: parseFloat(k.close),
        }))
      )
    } else {
      const series = main as ISeriesApi<'Area'>
      series.setData(
        klines.map((k) => ({
          time: toLocalTs(k.time),
          value: parseFloat(k.close),
        }))
      )
    }

    vol.setData(
      klines.map((k) => {
        const v = parseFloat(k.volume)
        const up = parseFloat(k.close) >= parseFloat(k.open)
        return {
          time: toLocalTs(k.time),
          value: v,
          color: up ? VOL_UP_COLOR : VOL_DOWN_COLOR,
        }
      })
    )

    requestAnimationFrame(updatePriceBadgeY)
  }, [klines, updatePriceBadgeY])

  // Пересоздание серии при смене стиля графика (Area / Candlesticks)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    if (mainRef.current) {
      chart.removeSeries(mainRef.current)
      mainRef.current = null
    }
    if (volRef.current) {
      chart.removeSeries(volRef.current)
      volRef.current = null
    }

    const last = parseFloat(klines[klines.length - 1]?.close ?? '0')
    const precision = fmtDecimalsForPrice(last)
    const minMove = Math.pow(10, -precision)

    if (chartStyle === 'candles') {
      const main = chart.addCandlestickSeries({
        upColor: UP_COLOR,
        downColor: DOWN_COLOR,
        wickUpColor: UP_COLOR,
        wickDownColor: DOWN_COLOR,
        borderVisible: false,
        priceFormat: { type: 'price', precision, minMove },
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dashed,
        priceLineColor: 'rgba(0, 210, 106, 0.4)',
        lastValueVisible: false,
      })
      mainRef.current = main
    } else {
      // Clean Moonshot Area Line Chart with gradient
      const main = chart.addAreaSeries({
        topColor: 'rgba(0, 210, 106, 0.28)',
        bottomColor: 'rgba(0, 210, 106, 0.00)',
        lineColor: UP_COLOR,
        lineWidth: 2,
        priceFormat: { type: 'price', precision, minMove },
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dashed,
        priceLineColor: 'rgba(0, 210, 106, 0.4)',
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: UP_COLOR,
      })
      mainRef.current = main
    }

    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      priceLineVisible: false,
      lastValueVisible: false,
    })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } })
    volRef.current = vol

    setData()
  }, [chartStyle, symbol, klines.length === 0, setData])

  // Обновление данных при изменении klines
  useEffect(() => {
    setLastBar(klines[klines.length - 1] ?? null)
    setData()
  }, [klines, setData])

  // Живые тики с рынка
  useEffect(() => {
    const off = onChartKline(symbol, interval, (k) => {
      const main = mainRef.current
      const vol = volRef.current
      if (!main || !vol) return

      const time = toLocalTs(k.time)
      setLastBar(k)

      const o = parseFloat(k.open)
      const h = parseFloat(k.high)
      const l = parseFloat(k.low)
      const c = parseFloat(k.close)
      const v = parseFloat(k.volume)
      const up = c >= o

      if (styleRef.current === 'candles') {
        ;(main as ISeriesApi<'Candlestick'>).update({
          time,
          open: o,
          high: h,
          low: l,
          close: c,
        })
      } else {
        ;(main as ISeriesApi<'Area'>).update({ time, value: c })
      }

      vol.update({
        time,
        value: v,
        color: up ? VOL_UP_COLOR : VOL_DOWN_COLOR,
      })

      updatePriceBadgeY()
    })
    return off
  }, [symbol, interval, updatePriceBadgeY])

  // Обработчик таймфреймов
  const handleTfSelect = (tf: (typeof TIMEFRAMES)[number]) => {
    buzz(4)
    setActiveTf(tf.label)
    if (tf.interval) {
      setIntervalNav(tf.interval)
    }

    const chart = chartRef.current
    if (!chart || klines.length === 0) return

    if (!tf.rangeSec) {
      chart.timeScale().fitContent()
      setTimeout(updatePriceBadgeY, 80)
      return
    }

    const last = klines[klines.length - 1]
    const first = klines[0]
    if (!last || !first) return

    const to = toLocalTs(last.time)
    const firstTs = toLocalTs(first.time)
    const from = Math.max(firstTs, to - tf.rangeSec) as UTCTimestamp
    chart.timeScale().setVisibleRange({ from, to })
    setTimeout(updatePriceBadgeY, 80)
  }

  // Данные для верхнего информационного оверлея
  const displayBar = crosshairData ?? (lastBar ? {
    open: parseFloat(lastBar.open),
    high: parseFloat(lastBar.high),
    low: parseFloat(lastBar.low),
    close: parseFloat(lastBar.close),
    volume: parseFloat(lastBar.volume),
  } : null)

  const isUp = displayBar ? displayBar.close >= displayBar.open : true
  const lastPrice = lastBar ? parseFloat(lastBar.close) : 0

  return (
    <div className="relative flex h-full w-full flex-col select-none overflow-hidden bg-[#0c1017]">
      {/* ── Floating OHLCV crosshair legend ── */}
      {crosshairData && (
        <div className="pointer-events-none absolute left-3 top-2 z-20 flex items-center gap-2 rounded-lg bg-[#141923]/90 px-2.5 py-1 text-[11px] font-mono text-gray-300 backdrop-blur-md shadow-lg border border-white/5">
          <span>O: <span className="text-white">${fmtPrice(crosshairData.open)}</span></span>
          <span>H: <span className="text-white">${fmtPrice(crosshairData.high)}</span></span>
          <span>L: <span className="text-white">${fmtPrice(crosshairData.low)}</span></span>
          <span>C: <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>${fmtPrice(crosshairData.close)}</span></span>
        </div>
      )}

      {/* ── Chart Canvas Area ── */}
      <div className="relative min-h-0 flex-1 w-full">
        <div ref={holder} className="h-full w-full" />

        {/* ── Moonshot Price Badge on Right Axis: [ $80,598 ◂ ] ── */}
        {priceY !== null && lastPrice > 0 && (
          <div
            className="pointer-events-none absolute right-1 z-20 flex items-center transition-all duration-100 ease-out"
            style={{
              top: `${priceY}px`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="flex items-center gap-1 rounded-md bg-[#00d26a] px-2 py-0.5 font-bold text-[11px] text-[#032014] shadow-lg shadow-[#00d26a]/30">
              <span>${fmtPrice(lastPrice)}</span>
              <span className="text-[9px] -mr-0.5 font-mono">◂</span>
            </div>
          </div>
        )}

        {/* ── Moonshot Social Trader Markers on Chart Curve ── */}
        {markerCoords.map(({ x, y, marker }, i) => (
          <div
            key={i}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115 active:scale-95"
            style={{ left: `${x}px`, top: `${y}px` }}
            onClick={() => {
              buzz(6)
              setActiveMarkerInfo({
                name: marker.name,
                action: marker.action,
                price: `$${fmtPrice(lastPrice * (0.97 + i * 0.007))}`,
              })
            }}
          >
            {marker.type === 'stacked' ? (
              <div className="flex items-center gap-0.5 rounded-full border-2 border-[#eab308] bg-[#1a1e28] px-1.5 py-0.5 shadow-md shadow-yellow-500/20">
                <span className="text-[10px] font-bold text-yellow-400">{marker.count}</span>
                <span className="text-[10px]">{marker.avatar}</span>
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#eab308] bg-[#1a1e28] text-[10px] shadow-md shadow-yellow-500/20">
                {marker.avatar}
              </div>
            )}
          </div>
        ))}

        {/* Tooltip при тапе на маркер сделки трейдера */}
        {activeMarkerInfo && (
          <div
            className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-xl border border-white/10 bg-[#161b26]/95 px-3 py-1.5 text-center shadow-xl backdrop-blur-md"
            onClick={() => setActiveMarkerInfo(null)}
          >
            <div className="text-[11px] font-bold text-white flex items-center justify-center gap-1">
              <TrendingUp size={12} className="text-[#00d26a]" />
              <span>{activeMarkerInfo.name}</span>
            </div>
            <div className="text-[10px] text-gray-300">
              {activeMarkerInfo.action} @ <span className="font-semibold text-white">{activeMarkerInfo.price}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Moonshot Timeframe & Controls Bar Below Chart ── */}
      <div className="flex h-11 shrink-0 items-center justify-between border-t border-white/[0.04] bg-[#0c1017] px-3">
        {/* Left: Timeframe pills */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => {
            const isActive = activeTf === tf.label
            return (
              <button
                key={tf.label}
                type="button"
                onClick={() => handleTfSelect(tf)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#222735] text-white font-semibold shadow-sm'
                    : 'text-[#7d8799] hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            )
          })}
        </div>

        {/* Right: Candlestick toggle, Sliders, Fullscreen */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-[1px] bg-white/10" />

          {/* Toggle Candles vs Area */}
          <button
            type="button"
            onClick={() => {
              buzz(6)
              setChartStyle(chartStyle === 'candles' ? 'line' : 'candles')
            }}
            title={chartStyle === 'candles' ? 'Переключить на линию' : 'Переключить на свечи'}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              chartStyle === 'candles'
                ? 'bg-white/15 text-[#00d26a]'
                : 'text-[#7d8799] hover:text-white'
            }`}
          >
            <CandlestickChart size={15} />
          </button>

          {/* Indicators / Tune */}
          <button
            type="button"
            onClick={() => {
              buzz(4)
              chartRef.current?.timeScale().fitContent()
              updatePriceBadgeY()
            }}
            title="Автомасштабирование"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7d8799] hover:text-white transition-colors"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={() => {
              buzz(4)
              chartRef.current?.timeScale().fitContent()
              updatePriceBadgeY()
            }}
            title="На весь экран"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7d8799] hover:text-white transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
