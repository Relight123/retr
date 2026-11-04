/** Метаданные монет: иконки/названия CoinGecko (+ буква-заглушка). */
import { useEffect, useState } from 'react'
import { loadCoinIndex, cachedCoinMeta, type CoinMeta } from '../api/coingecko'

const notify = new Set<() => void>()
let bumped = 0

export function coinIndexBump(): void {
  bumped++
  notify.forEach((fn) => fn())
}

export function useCoinIndexVersion(): number {
  return useSyncExternalStoreShim()
}

function useSyncExternalStoreShim(): number {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((v) => v + 1)
    notify.add(fn)
    return () => {
      notify.delete(fn)
    }
  }, [])
  return bumped
}

/** Тонкая обёртка: берёт мету из кэша, при пустом кэше дергает загрузку. */
export function useCoinMeta(symbol: string): CoinMeta | null {
  useCoinIndexVersion()
  useEffect(() => {
    if (!cachedCoinMeta(symbol)) void loadCoinIndex().then(() => coinIndexBump())
  }, [symbol])
  return cachedCoinMeta(symbol)
}
