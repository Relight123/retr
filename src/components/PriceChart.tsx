/** График (TradingView Lightweight Charts v4): свечи/линия + объём, live-update, OHLC-легенда, лог-шкала. */
import { useEffect, useRef, useState, useCallback } from 'react'
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
import type { Kline } from '../api/types'
import { onChartKline } from '../store/market'
import { useNav } from '../store/navigation'
import { fmtDecimalsForPrice, fmtPrice, fmtCompact } from '../lib/format'

/** Modern colors matching Axiom / Hyperliquid */
const UP_COLOR = '#00d26a'
const DOWN_COLOR = '#ff3b5c'
const VOL_UP_COLOR = 'rgba(0, 210, 106, 0.25)'
const VOL_DOWN_COLOR = 'rgba(255, 59, 92, 0.25)'

const RANGES = ['1d', '1w', '1m', '1y', 'All'] as const
type RangeKey = (typeof RANGES)[number]

/** Offset to make lightweight-charts display local device time instead of UTC */
const tzOffsetMs = -new Date().getTimezoneOffset() * 60 * 1000

function toLocalTs(epochMs: number): UTCTimestamp {
  return Math.floor((epochMs + tzOffsetMs) / 1000) as UTCTimestamp
}

/** Formats current local device time with UTC offset indicator (e.g. 20:49:12 UTC+3) */
function formatDeviceTime(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const offsetMin = -d.getTimezoneOffset()
  const offsetHours = offsetMin / 60
  const sign = offsetHours >= 0 ? '+' : ''
  const offsetStr = Number.isInteger(offsetHours)
    ? `${sign}${offsetHours}`
    : `${sign}${Math.floor(offsetHours)}:${Math.abs(offsetMin % 60).toString().padStart(2, '0')}`
  return `${hh}:${mm}:${ss} UTC${offsetStr}`
}

/** Crosshair OHLCV data shown on hover */
interface CrosshairData {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function PriceChart({ symbol, klines }: { symbol: string; klines: Kline[] }) {
  const holder = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const chartStyle = useNav((s) => s.chartStyle)
  const interval = useNav((s) => s.interval)
  const styleRef = useRef(chartStyle)
  styleRef.current = chartStyle

  const [percentScale, setPercentScale] = useState(false)
  const [logScale, setLogScale] = useState(false)
  const [autoActive, setAutoActive] = useState(true)
  const [activeRange, setActiveRange] = useState<RangeKey | null>('All')
  const [deviceTime, setDeviceTime] = useState(formatDeviceTime)
  const [lastBar, setLastBar] = useState<Kline | null>(klines[klines.length - 1] ?? null)
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null)

  // Live device clock timer (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceTime(formatDeviceTime())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Создание & ресайз графика
  useEffect(() => {
    const el = holder.current
    if (!el) return
    const isDark = document.documentElement.dataset.theme !== 'light'
    const chart = createChart(el, {
      localization: {
        locale: typeof navigator !== 'undefined' ? (navigator.language || 'ru-RU') : 'ru-RU',
        dateFormat: 'yyyy-MM-dd',
      },
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#9AA3B8' : '#5C6478',
        fontFamily: "'Inter Variable', Inter, system-ui, -apple-system, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.1, bottom: 0.24 },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
        barSpacing: 7,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e222d' : '#e0e3eb',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#1e222d' : '#e0e3eb',
        },
      },
      autoSize: false,
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
      handleScroll: { vertTouchDrag: false },
    })
    chartRef.current = chart

    // Crosshair move subscription for floating OHLCV
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData?.size) {
        setCrosshairData(null)
        return
      }
      const mainSeries = mainRef.current
      if (!mainSeries) return
      const data = param.seriesData.get(mainSeries) as any
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

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) chart.resize(w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    return () => {
      chart.unsubscribeCrosshairMove(() => {})
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      mainRef.current = null
      volRef.current = null
    }
  }, [])

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
      const series = main as ISeriesApi<'Line'>
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
  }, [klines])

  // Series тип зависит от chartStyle
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

    const main =
      chartStyle === 'candles'
        ? chart.addCandlestickSeries({
            upColor: UP_COLOR,
            downColor: DOWN_COLOR,
            wickUpColor: UP_COLOR,
            wickDownColor: DOWN_COLOR,
            borderVisible: false,
            priceFormat: { type: 'price', precision, minMove },
            priceLineVisible: true,
            priceLineWidth: 1,
            priceLineStyle: LineStyle.Dashed,
            lastValueVisible: true,
          })
        : chart.addLineSeries({
            color: '#5b7bfe',
            lineWidth: 2,
            priceFormat: { type: 'price', precision, minMove },
            priceLineVisible: true,
            priceLineWidth: 1,
            priceLineStyle: LineStyle.Dashed,
            priceLineColor: '#5b7bfe',
            lastValueVisible: true,
          })
    mainRef.current = main

    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      priceLineVisible: false,
      lastValueVisible: false,
    })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volRef.current = vol

    setData()

    // Watermark with trading pair name
    chart.applyOptions({
      watermark: {
        visible: true,
        text: symbol.replace('USDT', '') + '/USDT',
        fontSize: 36,
        fontFamily: "'Inter Variable', -apple-system, system-ui, sans-serif",
        color: 'rgba(255, 255, 255, 0.025)',
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartStyle, symbol, klines.length === 0])

  // Обновление данных при смене klines
  useEffect(() => {
    setLastBar(klines[klines.length - 1] ?? null)
    setData()
  }, [klines, setData])

  // Подписка на живые тики
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
        ;(main as ISeriesApi<'Line'>).update({ time, value: c })
      }

      vol.update({
        time,
        value: v,
        color: up ? VOL_UP_COLOR : VOL_DOWN_COLOR,
      })
    })
    return off
  }, [symbol, interval])

  // Масштабирование: Normal / Logarithmic / Percentage
  useEffect(() => {
    if (!chartRef.current) return
    let mode = PriceScaleMode.Normal
    if (percentScale) {
      mode = PriceScaleMode.Percentage
    } else if (logScale) {
      mode = PriceScaleMode.Logarithmic
    }
    chartRef.current.applyOptions({
      rightPriceScale: { mode },
    })
  }, [percentScale, logScale])

  // Тема перерисовка
  useEffect(() => {
    const sub = (theme: string) => {
      const isDark = theme !== 'light'
      chartRef.current?.applyOptions({
        layout: { textColor: isDark ? '#9AA3B8' : '#5C6478' },
        grid: {
          vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)' },
          horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)' },
        },
        crosshair: {
          vertLine: {
            color: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
            labelBackgroundColor: isDark ? '#1e222d' : '#e0e3eb',
          },
          horzLine: {
            color: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
            labelBackgroundColor: isDark ? '#1e222d' : '#e0e3eb',
          },
        },
        watermark: {
          color: isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.03)',
        },
      })
    }
    sub(document.documentElement.dataset.theme ?? 'dark')
    const mo = new MutationObserver(() => sub(document.documentElement.dataset.theme ?? 'dark'))
    mo.observe(document.documentElement, { attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  // Range button handlers
  const handleRangeClick = (range: RangeKey) => {
    setActiveRange(range)
    const chart = chartRef.current
    if (!chart || klines.length === 0) return

    if (range === 'All') {
      chart.timeScale().fitContent()
      return
    }

    const last = klines[klines.length - 1]
    const first = klines[0]
    if (!last || !first) return

    const to = toLocalTs(last.time)
    const firstTs = toLocalTs(first.time)
    let deltaSec = 86400

    switch (range) {
      case '1d':
        deltaSec = 86400
        break
      case '1w':
        deltaSec = 7 * 86400
        break
      case '1m':
        deltaSec = 30 * 86400
        break
      case '1y':
        deltaSec = 365 * 86400
        break
    }

    const from = Math.max(firstTs, to - deltaSec) as UTCTimestamp
    chart.timeScale().setVisibleRange({ from, to })
  }

  const handleAutoClick = () => {
    const chart = chartRef.current
    if (!chart) return
    chart.priceScale('right').applyOptions({ autoScale: true })
    chart.timeScale().fitContent()
    setAutoActive(true)
    setActiveRange('All')
  }

  const handlePercentClick = () => {
    setPercentScale((prev) => {
      const next = !prev
      if (next) setLogScale(false)
      return next
    })
  }

  const handleLogClick = () => {
    setLogScale((prev) => {
      const next = !prev
      if (next) setPercentScale(false)
      return next
    })
  }

  // Active or hovered bar data for floating OHLCV legend
  const displayBar = crosshairData ?? (lastBar ? {
    open: parseFloat(lastBar.open),
    high: parseFloat(lastBar.high),
    low: parseFloat(lastBar.low),
    close: parseFloat(lastBar.close),
    volume: parseFloat(lastBar.volume),
  } : null)

  const isUp = displayBar ? displayBar.close >= displayBar.open : true
  const change = displayBar ? displayBar.close - displayBar.open : 0
  const changePct = displayBar && displayBar.open > 0 ? (change / displayBar.open) * 100 : 0

  return (
    <div className="relative flex h-full w-full flex-col select-none overflow-hidden">
      {/* Floating / live OHLCV info bar on top of chart */}
      {displayBar && (
        <div className="pointer-events-none absolute left-2 top-1 z-10 flex flex-col text-[10px] leading-tight font-medium tnum">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-white/90">
                {symbol.replace('USDT', '')}/USDT
              </span>
              <span className="text-faint">•</span>
              <span className="text-faint">{interval}</span>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full ml-0.5"
                style={{ backgroundColor: isUp ? UP_COLOR : DOWN_COLOR }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-faint">O</span>
              <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>{fmtPrice(displayBar.open)}</span>
              <span className="text-faint">H</span>
              <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>{fmtPrice(displayBar.high)}</span>
              <span className="text-faint">L</span>
              <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>{fmtPrice(displayBar.low)}</span>
              <span className="text-faint">C</span>
              <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>{fmtPrice(displayBar.close)}</span>
              <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }} className="font-semibold">
                {change >= 0 ? '+' : ''}{fmtPrice(change)} ({change >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9.5px]">
            <span className="text-faint">Vol</span>
            <span style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}>
              {fmtCompact(displayBar.volume)}
            </span>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="relative min-h-0 flex-1 w-full">
        <div ref={holder} className="h-full w-full" />
      </div>

      {/* Bottom Terminal Toolbar */}
      <div className="flex h-[26px] shrink-0 items-center justify-between border-t border-white/[0.04] bg-[#0b0e14]/40 px-2 text-[10px]">
        {/* Left: Range buttons */}
        <div className="flex items-center gap-1">
          {RANGES.map((r) => {
            const isActive = activeRange === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRangeClick(r)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-muted hover:text-white/80 active:bg-white/5'
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>

        {/* Center / Right: Live device clock + %, log, auto */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-faint tnum">
            {deviceTime}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePercentClick}
              title="Toggle percentage scale"
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                percentScale
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-white/80 active:bg-white/5'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={handleLogClick}
              title="Toggle logarithmic scale"
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                logScale
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-white/80 active:bg-white/5'
              }`}
            >
              log
            </button>
            <button
              type="button"
              onClick={handleAutoClick}
              title="Fit content / Auto scale"
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                autoActive
                  ? 'text-primary font-bold'
                  : 'text-muted hover:text-white/80 active:bg-white/5'
              }`}
            >
              auto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
