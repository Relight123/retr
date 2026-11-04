/** Иконка монеты: надёжная fallback-цепочка:
 *  1) src (если передан явно)
 *  2) meta?.image (CoinGecko / кэш)
 *  3) CoinCap CDN: https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png
 *  4) jsDelivr SVG: https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${base.toLowerCase()}.svg
 *  5) Стильная буква-заглушка с детерминированным градиентом.
 *  Круглый аватар с тонкой рамкой 1px rgba(255,255,255,0.12), тенью 0 2px 6px rgba(0,0,0,0.3)
 *  и плавным fade-in при загрузке.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useCoinMeta } from '../hooks/useCoinMeta'
import { cleanCoinSymbol, getBaseSymbol } from '../api/coingecko'
import { hash32 } from '../lib/util'

const HUES = [
  ['#f7931a', '#fdb913'], // Bitcoin gold
  ['#627eea', '#8c9eff'], // Ethereum blue
  ['#00d26a', '#00ffa3'], // Green
  ['#ff3b5c', '#ff7eb3'], // Red-pink
  ['#5b7bfe', '#8c9eff'], // Blue
  ['#00d1b2', '#00ffd5'], // Teal
  ['#a259ff', '#d080ff'], // Purple
  ['#ff9500', '#ffcc00'], // Orange-yellow
]

export function CoinIcon({
  symbol,
  size = 34,
  src,
  layoutId,
  className = '',
  style,
  rounded = 'full',
}: {
  symbol: string
  size?: number
  src?: string | null
  layoutId?: string
  className?: string
  style?: React.CSSProperties
  rounded?: 'full' | '2xl' | 'xl' | 'lg' | string
}) {
  // Strip USDT suffix for meta lookup and base ticker
  const base = cleanCoinSymbol(symbol) || symbol
  const meta = useCoinMeta(base)
  const baseForIcon = getBaseSymbol(base)

  // Candidate image sources in order:
  // 1) src (if passed explicitly)
  // 2) meta?.image (from metadata)
  // 3) CoinCap CDN: https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png
  // 4) jsDelivr SVG: https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${base.toLowerCase()}.svg
  const candidates = useMemo(() => {
    const rawKey = base.toLowerCase()
    const iconKey = baseForIcon.toLowerCase()

    const list: (string | null | undefined)[] = [
      src,
      meta?.image,
      `https://assets.coincap.io/assets/icons/${rawKey}@2x.png`,
      `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${rawKey}.svg`,
    ]

    // If 1000-multiplier prefix or alias exists, also try iconKey
    if (iconKey !== rawKey) {
      list.push(`https://assets.coincap.io/assets/icons/${iconKey}@2x.png`)
      list.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${iconKey}.svg`)
    }

    const seen = new Set<string>()
    const result: string[] = []
    for (const url of list) {
      if (url && typeof url === 'string') {
        const trimmed = url.trim()
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed)
          result.push(trimmed)
        }
      }
    }
    return result
  }, [src, meta?.image, base, baseForIcon])

  const [imgIndex, setImgIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  // Reset image index when symbol, src, or primary candidate changes
  const primaryCandidate = candidates[0] ?? ''
  const symbolKey = `${symbol}:${src ?? ''}:${primaryCandidate}`
  const [prevKey, setPrevKey] = useState(symbolKey)
  if (symbolKey !== prevKey) {
    setPrevKey(symbolKey)
    setImgIndex(0)
    setLoaded(false)
  }

  const currentUrl = imgIndex < candidates.length ? candidates[imgIndex] : null

  const handleError = () => {
    setLoaded(false)
    setImgIndex((idx) => idx + 1)
  }

  const handleLoad = () => {
    setLoaded(true)
  }

  const colors = HUES[hash32(baseForIcon || symbol) % HUES.length]
  const letter = (baseForIcon || base || symbol).slice(0, 1).toUpperCase() || '?'

  const isFull = rounded === 'full'
  const radiusClass =
    rounded === '2xl'
      ? 'rounded-2xl'
      : rounded === 'xl'
      ? 'rounded-xl'
      : rounded === 'lg'
      ? 'rounded-lg'
      : isFull
      ? 'rounded-full'
      : rounded

  const radiusStyle = isFull ? '50%' : rounded === '2xl' ? '16px' : rounded === 'xl' ? '12px' : rounded === 'lg' ? '8px' : undefined

  const Tag = layoutId ? motion.span : 'span'

  return (
    <Tag
      {...(layoutId ? { layoutId } : {})}
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden ${radiusClass} ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: radiusStyle,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        background: currentUrl
          ? 'rgba(255, 255, 255, 0.04)'
          : `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        fontSize: size * 0.44,
        fontWeight: 700,
        color: '#ffffff',
        ...style,
      }}
    >
      {currentUrl ? (
        <>
          {/* Shimmer pulse while loading */}
          {!loaded && (
            <span
              className={`absolute inset-0 animate-pulse pointer-events-none ${radiusClass}`}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
              }}
            />
          )}
          <img
            key={currentUrl}
            src={currentUrl}
            alt={symbol}
            width={size}
            height={size}
            loading="lazy"
            draggable={false}
            onLoad={handleLoad}
            onError={handleError}
            className={`h-full w-full object-cover ${radiusClass}`}
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'scale(1)' : 'scale(0.92)',
              transition: 'opacity 0.25s ease-in-out, transform 0.25s ease-out',
            }}
          />
        </>
      ) : (
        <span
          className="select-none tracking-tight font-bold"
          style={{
            fontSize: size * 0.44,
            lineHeight: 1,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
          }}
        >
          {letter}
        </span>
      )}
    </Tag>
  )
}
