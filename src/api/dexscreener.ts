/** Полулегальный по умолчанию выключенный раздел: DEX-токены через DexScreener.
 *  Только просмотр цены и торговля в симуляторе (нет свечей/стакана —
 *  цена поллится REST'ом каждые ~3с, пока пара открыта). */
import { fetchJson } from './ws'

export interface DexPair {
  pairAddress: string
  chainId: string
  base: string
  baseName: string
  quote: string
  priceUsd: string
  changePct24h: number
  volume24h: number
  liquidityUsd: number
  logo?: string
}

interface RawPair {
  chainId: string
  pairAddress: string
  baseToken: { address: string; name: string; symbol: string }
  quoteToken: { symbol: string }
  priceUsd?: string
  priceChange?: { h24?: number; h1?: number }
  volume?: { h24?: number }
  liquidity?: { usd?: number }
  info?: { imageUrl?: string }
}

export async function dexSearch(query: string): Promise<DexPair[]> {
  const q = encodeURIComponent(query.trim())
  if (!q) return []
  const res = await fetchJson<{ pairs?: RawPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${q}`,
    9000
  )
  const pairs = (res.pairs ?? [])
    .filter((p) => p.priceUsd && parseFloat(p.priceUsd) > 0)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
  const out: DexPair[] = []
  for (const p of pairs.slice(0, 12)) {
    if (out.some((x) => `${x.chainId}:${x.base}` === `${p.chainId}:${p.baseToken.symbol}`)) continue
    out.push(mapPair(p))
  }
  return out
}

export async function dexPairById(chainId: string, pairAddress: string): Promise<DexPair | null> {
  // DexScreener отдаёт данные и по паре, и по адресу токена
  const res = await fetchJson<{ pairs?: RawPair[] | null }>(
    `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`,
    9000
  )
  const p = (res.pairs ?? [])[0]
  return p ? mapPair(p) : null
}

export async function dexTokenPrice(tokenAddress: string): Promise<DexPair | null> {
  const res = await fetchJson<{ pairs?: RawPair[] | null }>(
    `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
    9000
  )
  const best = (res.pairs ?? [])
    .filter((p) => p.priceUsd)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
  return best ? mapPair(best) : null
}

function mapPair(p: RawPair): DexPair {
  return {
    pairAddress: p.pairAddress,
    chainId: p.chainId,
    base: p.baseToken.symbol,
    baseName: p.baseToken.name,
    quote: p.quoteToken.symbol,
    priceUsd: String(p.priceUsd),
    changePct24h: p.priceChange?.h24 ?? 0,
    volume24h: p.volume?.h24 ?? 0,
    liquidityUsd: p.liquidity?.usd ?? 0,
    logo: p.info?.imageUrl,
  }
}

/** Идентификатор символа-инструмента в симуляторе. */
export function dexSymbolId(pair: DexPair): string {
  return `${pair.chainId}:${pair.pairAddress}`
}

export function dexShortSymbol(pair: DexPair): string {
  return `${pair.base}/${pair.quote}`
}
