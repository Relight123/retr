/** Хуки цен через useSyncExternalStore: дёшево, без виртуального DOM-дребезжания. */
import { useSyncExternalStore } from 'react'
import { useMarket } from '../store/market'
import type { Ticker } from '../api/types'

/** Версия данных рынка (для общих перерисовок). */
export function useMarketVersion(): number {
  return useSyncExternalStore(
    (cb) => useMarket.subscribe(cb),
    () => useMarket.getState().version
  )
}

/** Последний тик + изменение 24ч по символу. Возвращает Ticker-объект стора. */
export function useTicker(symbol: string): Ticker | null {
  const snapKey = useSyncExternalStore(
    (cb) => useMarket.subscribe(cb),
    () => {
      const t = useMarket.getState().bySymbol[symbol]
      return t ? `${t.last}|${t.changePct24h.toFixed(2)}` : ''
    }
  )
  void snapKey
  return useMarket.getState().bySymbol[symbol] ?? null
}
