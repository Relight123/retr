/** Выбор провайдера: Binance → Bybit → offline. Sticky после выбора. */
import type { DataProvider, ProviderStatus } from './types'
import { binanceProvider } from './binance'
import { bybitProvider } from './bybit'
import { withTimeout } from './ws'

type Listener = (s: ProviderStatus) => void

let active: DataProvider | null = null
let inflight: Promise<DataProvider> | null = null
const listeners = new Set<Listener>()

function emit(state: ProviderStatus['state'], id: string): void {
  listeners.forEach((fn) => fn({ id, state }))
}

export function onProviderStatus(fn: Listener): () => void {
  listeners.add(fn)
  if (active) fn({ id: active.id, state: 'live' })
  else fn({ id: 'connecting', state: 'connecting' })
  return () => listeners.delete(fn)
}

export function currentProvider(): DataProvider | null {
  return active
}

/** Пробует основной (Binance), затем запасной (Bybit). Бросает OfflineError, если оба недоступны. */
export async function ensureProvider(): Promise<DataProvider> {
  if (active) return active
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const tickers = await withTimeout(binanceProvider.fetchTickers(), 9000)
      if (tickers.length === 0) throw new Error('empty')
      active = binanceProvider
      emit('live', binanceProvider.id)
      return active
    } catch {
      emit('failed', binanceProvider.id)
    }
    try {
      const tickers = await withTimeout(bybitProvider.fetchTickers(), 9000)
      if (tickers.length === 0) throw new Error('empty')
      active = bybitProvider
      emit('live', bybitProvider.id)
      return active
    } catch {
      emit('failed', bybitProvider.id)
    }
    emit('offline', 'offline')
    throw new Error('OFFLINE')
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export class OfflineError extends Error {
  constructor() {
    super('OFFLINE')
  }
}
