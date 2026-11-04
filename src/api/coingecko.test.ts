import { describe, it, expect } from 'vitest'
import {
  cleanCoinSymbol,
  getBaseSymbol,
  cachedCoinMeta,
  getCoinDefaultImage,
  getCoinFallbackSvg,
  POPULAR_COINS,
} from './coingecko'

describe('coingecko coin metadata & static cache', () => {
  it('cleanCoinSymbol cleans various pairs and suffixes', () => {
    expect(cleanCoinSymbol('BTCUSDT')).toBe('BTC')
    expect(cleanCoinSymbol('ETHUSDC')).toBe('ETH')
    expect(cleanCoinSymbol('SOL/USDT')).toBe('SOL')
    expect(cleanCoinSymbol('DOGE-USDT')).toBe('DOGE')
    expect(cleanCoinSymbol('1000PEPEUSDT')).toBe('1000PEPE')
    expect(cleanCoinSymbol('BTC')).toBe('BTC')
  })

  it('getBaseSymbol strips 1000 multiplier prefix', () => {
    expect(getBaseSymbol('1000PEPE')).toBe('PEPE')
    expect(getBaseSymbol('1000BONK')).toBe('BONK')
    expect(getBaseSymbol('1000SHIB')).toBe('SHIB')
    expect(getBaseSymbol('BTC')).toBe('BTC')
  })

  it('POPULAR_COINS contains 60+ popular coins', () => {
    const count = Object.keys(POPULAR_COINS).length
    expect(count).toBeGreaterThanOrEqual(60)

    const required = [
      'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX',
      'SUI', 'LINK', 'NEAR', 'PEPE', 'SHIB', 'DOT', 'LTC', 'MATIC',
      'TRX', 'UNI', 'APT', 'OP', 'ARB', 'TIA', 'RENDER', 'FET',
      'INJ', 'KAS', 'TAO', 'TON', 'WIF', 'BONK', 'FLOKI', 'NOT',
    ]

    for (const sym of required) {
      expect(POPULAR_COINS[sym], `Missing ${sym}`).toBeDefined()
    }
  })

  it('cachedCoinMeta returns proper meta immediately without network request', () => {
    const btc = cachedCoinMeta('BTC')
    expect(btc).not.toBeNull()
    expect(btc?.name).toBe('Bitcoin')
    expect(btc?.image).toContain('btc')

    const ethUsdt = cachedCoinMeta('ETHUSDT')
    expect(ethUsdt).not.toBeNull()
    expect(ethUsdt?.name).toBe('Ethereum')
    expect(ethUsdt?.image).toContain('eth')

    const sol = cachedCoinMeta('SOLUSDT')
    expect(sol?.name).toBe('Solana')

    const ton = cachedCoinMeta('TON')
    expect(ton?.name).toBe('Toncoin')

    const sui = cachedCoinMeta('SUI')
    expect(sui?.name).toBe('Sui')

    const not = cachedCoinMeta('NOT')
    expect(not?.name).toBe('Notcoin')

    const pepe1000 = cachedCoinMeta('1000PEPEUSDT')
    expect(pepe1000?.name).toBe('1000Pepe')
    expect(pepe1000?.image).toContain('pepe')
  })

  it('getCoinDefaultImage returns valid CDN URLs', () => {
    expect(getCoinDefaultImage('BTC')).toBe('https://assets.coincap.io/assets/icons/btc@2x.png')
    expect(getCoinDefaultImage('ETHUSDT')).toBe('https://assets.coincap.io/assets/icons/eth@2x.png')
    expect(getCoinDefaultImage('1000PEPEUSDT')).toBe('https://assets.coincap.io/assets/icons/pepe@2x.png')
  })

  it('getCoinFallbackSvg returns valid jsDelivr SVG URLs', () => {
    expect(getCoinFallbackSvg('BTC')).toBe('https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/btc.svg')
    expect(getCoinFallbackSvg('SOL')).toBe('https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/sol.svg')
  })
})
