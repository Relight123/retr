/** Названия и иконки монет: встроенный статический индекс 130+ топ монет + CoinGecko public API + кэш в localStorage 24ч.
 *  Мгновенно отображает логотипы и названия даже при оффлайне или rate limit от CoinGecko. */
import { fetchJson } from './ws'

export interface CoinMeta {
  symbol: string
  name: string
  image: string
}

export const POPULAR_COINS: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  BNB: 'BNB',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  AVAX: 'Avalanche',
  SUI: 'Sui',
  LINK: 'Chainlink',
  NEAR: 'NEAR Protocol',
  PEPE: 'Pepe',
  SHIB: 'Shiba Inu',
  DOT: 'Polkadot',
  LTC: 'Litecoin',
  MATIC: 'Polygon',
  POL: 'Polygon',
  TRX: 'TRON',
  UNI: 'Uniswap',
  APT: 'Aptos',
  OP: 'Optimism',
  ARB: 'Arbitrum',
  TIA: 'Celestia',
  RENDER: 'Render',
  RNDR: 'Render',
  FET: 'Artificial Superintelligence Alliance',
  INJ: 'Injective',
  KAS: 'Kaspa',
  TAO: 'Bittensor',
  TON: 'Toncoin',
  WIF: 'dogwifhat',
  BONK: 'Bonk',
  FLOKI: 'Floki',
  NOT: 'Notcoin',
  BCH: 'Bitcoin Cash',
  XLM: 'Stellar',
  ATOM: 'Cosmos',
  FIL: 'Filecoin',
  ICP: 'Internet Computer',
  ETC: 'Ethereum Classic',
  HBAR: 'Hedera',
  STX: 'Stacks',
  IMX: 'Immutable',
  GRT: 'The Graph',
  RUNE: 'THORChain',
  AAVE: 'Aave',
  MKR: 'Maker',
  LDO: 'Lido DAO',
  SEI: 'Sei',
  ALGO: 'Algorand',
  QNT: 'Quant',
  FTM: 'Fantom',
  S: 'Sonic',
  FLOW: 'Flow',
  EOS: 'EOS',
  SAND: 'The Sandbox',
  MANA: 'Decentraland',
  AXS: 'Axie Infinity',
  THETA: 'Theta Network',
  CHZ: 'Chiliz',
  EGLD: 'MultiversX',
  DYDX: 'dYdX',
  GALA: 'Gala',
  CRV: 'Curve DAO Token',
  SNX: 'Synthetix',
  KAVA: 'Kava',
  MINA: 'Mina',
  WLD: 'Worldcoin',
  STRK: 'Starknet',
  JUP: 'Jupiter',
  PYTH: 'Pyth Network',
  ENA: 'Ethena',
  ONDO: 'Ondo',
  BLUR: 'Blur',
  PENDLE: 'Pendle',
  ORDI: 'Ordinals',
  SATS: 'SATS',
  MEME: 'Memecoin',
  BOME: 'BOOK OF MEME',
  MEW: 'cat in a dogs world',
  POPCAT: 'Popcat',
  NEIRO: 'First Neiro on Ethereum',
  APE: 'ApeCoin',
  AR: 'Arweave',
  JASMY: 'JasmyCoin',
  BEAM: 'Beam',
  RON: 'Ronin',
  ZRO: 'LayerZero',
  IO: 'io.net',
  ZK: 'ZKsync',
  ENS: 'Ethereum Name Service',
  DOGS: 'Dogs',
  HMSTR: 'Hamster Kombat',
  CATI: 'Catizen',
  XMR: 'Monero',
  VET: 'VeChain',
  BSV: 'Bitcoin SV',
  NEO: 'Neo',
  IOTA: 'IOTA',
  XTZ: 'Tezos',
  ZEC: 'Zcash',
  DASH: 'Dash',
  '1INCH': '1inch',
  COMP: 'Compound',
  SUSHI: 'SushiSwap',
  DYM: 'Dymension',
  MANTA: 'Manta Network',
  ALT: 'AltLayer',
  PIXEL: 'Pixels',
  PORTAL: 'Portal',
  AEVO: 'Aevo',
  ETHFI: 'ether.fi',
  REZ: 'Renzo',
  BB: 'BounceBit',
  TURBO: 'Turbo',
  BRETT: 'Brett',
  MOG: 'Mog Coin',
  GOAT: 'Goatseus Maximus',
  MOODENG: 'Moo Deng',
  ACT: 'Act I : The AI Prophecy',
  PNUT: 'Peanut the Squirrel',
  DRIFT: 'Drift',
  COW: 'CoW Protocol',
  USUAL: 'Usual',
  MOVE: 'Movement',
  RAY: 'Raydium',
  JTO: 'Jito',
  W: 'Wormhole',
  KSM: 'Kusama',
  GNO: 'Gnosis',
  CFX: 'Conflux',
  KLAY: 'Klaytn',
  CAKE: 'PancakeSwap',
  WOO: 'WOO Network',
  GMX: 'GMX',
  ASTR: 'Astar',
  ZIL: 'Zilliqa',
  ENJ: 'Enjin Coin',
  BAT: 'Basic Attention Token',
  QTUM: 'Qtum',
  ONE: 'Harmony',
  HOT: 'Holo',
  CHR: 'Chromia',
  ANKR: 'Ankr',
  LUNC: 'Terra Classic',
  USTC: 'TerraClassicUSD',
  LUNA: 'Terra',
  TWT: 'Trust Wallet Token',
  SAFE: 'Safe',
  KAIA: 'Kaia',
  EIGEN: 'EigenLayer',
  // 1000-multipliers
  '1000SATS': '1000SATS',
  '1000PEPE': '1000Pepe',
  '1000BONK': '1000Bonk',
  '1000FLOKI': '1000Floki',
  '1000SHIB': '1000Shiba Inu',
  '1000LUNC': '1000Terra Classic',
  '1000RATS': '1000Rats',
  '1000CAT': '1000Cat',
  '1000X': '1000X',
  // Stablecoins
  USDT: 'Tether USD',
  USDC: 'USD Coin',
  FDUSD: 'First Digital USD',
  DAI: 'Dai',
  TUSD: 'TrueUSD',
  USDE: 'Ethena USDe',
  BUSD: 'Binance USD',
}

export const CUSTOM_COIN_IMAGES: Record<string, string> = {
  ORDI: 'https://cryptologos.cc/logos/ordi-ordi-logo.png',
  BLUR: 'https://assets.coingecko.com/coins/images/28453/large/blur.png',
  SATS: 'https://assets.coincap.io/assets/icons/btc@2x.png',
  '1000SATS': 'https://assets.coincap.io/assets/icons/btc@2x.png',
  S: 'https://assets.coincap.io/assets/icons/ftm@2x.png',
}

export function cleanCoinSymbol(symbol: string): string {
  if (!symbol) return ''
  let s = symbol.trim().toUpperCase()
  if (s.includes('/')) s = s.split('/')[0]
  if (s.includes('-')) s = s.split('-')[0]
  if (s.includes('_')) s = s.split('_')[0]
  if (s.endsWith('USDT')) s = s.slice(0, -4)
  else if (s.endsWith('USDC')) s = s.slice(0, -4)
  else if (s.endsWith('FDUSD')) s = s.slice(0, -5)
  else if (s.endsWith('BUSD')) s = s.slice(0, -4)
  return s
}

export function getBaseSymbol(symbol: string): string {
  let s = cleanCoinSymbol(symbol)
  if (s.startsWith('1000') && s.length > 4) {
    s = s.slice(4)
  }
  return s
}

export function getCoinDefaultImage(symbol: string): string {
  const clean = cleanCoinSymbol(symbol)
  if (CUSTOM_COIN_IMAGES[clean]) return CUSTOM_COIN_IMAGES[clean]
  const base = getBaseSymbol(symbol).toLowerCase()
  return `https://assets.coincap.io/assets/icons/${base}@2x.png`
}

export function getCoinFallbackSvg(symbol: string): string {
  const base = getBaseSymbol(symbol).toLowerCase()
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${base}.svg`
}

function buildStaticIndex(): Record<string, CoinMeta> {
  const map: Record<string, CoinMeta> = {}
  for (const [sym, name] of Object.entries(POPULAR_COINS)) {
    map[sym] = {
      symbol: sym,
      name,
      image: getCoinDefaultImage(sym),
    }
  }
  return map
}

const STATIC_COINS = buildStaticIndex()

const CACHE_KEY = 'cg-coin-index-v2'
const TTL = 24 * 60 * 60_000

interface CacheShape {
  at: number
  coins: Record<string, CoinMeta>
}

let cache: Record<string, CoinMeta> = { ...STATIC_COINS }
let inflight: Promise<Record<string, CoinMeta>> | null = null

function readCache(): Record<string, CoinMeta> {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as CacheShape | null
    if (raw && raw.coins && Date.now() - raw.at < TTL) {
      const merged: Record<string, CoinMeta> = { ...STATIC_COINS }
      for (const [sym, meta] of Object.entries(raw.coins)) {
        if (!merged[sym]) {
          merged[sym] = meta
        } else {
          merged[sym] = {
            symbol: sym,
            name: meta.name || merged[sym].name,
            image: meta.image || merged[sym].image,
          }
        }
      }
      cache = merged
      return cache
    }
  } catch {
    /* ignore localStorage error */
  }
  return cache
}

function writeCache(coins: Record<string, CoinMeta>): void {
  cache = { ...STATIC_COINS, ...coins }
  try {
    const v: CacheShape = { at: Date.now(), coins: cache }
    localStorage.setItem(CACHE_KEY, JSON.stringify(v))
  } catch {
    /* переполнение квоты — не критично */
  }
}

async function loadIndex(): Promise<Record<string, CoinMeta>> {
  const coins: Record<string, CoinMeta> = { ...readCache() }
  try {
    for (const page of [1, 2]) {
      const res = await fetchJson<Array<{ symbol: string; name: string; image: string }>>(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
        9000
      )
      if (Array.isArray(res)) {
        for (const c of res) {
          const sym = (c.symbol ?? '').toUpperCase()
          if (sym) {
            coins[sym] = {
              symbol: sym,
              name: c.name || coins[sym]?.name || sym,
              image: c.image || coins[sym]?.image || getCoinDefaultImage(sym),
            }
          }
        }
      }
    }
    if (Object.keys(coins).length > 0) writeCache(coins)
  } catch {
    /* fallback: сохраняем статический индекс */
  }
  return coins
}

/** Единовременный индекс монет. Статический список доступен мгновенно; при успехе обогащается CoinGecko. */
export function loadCoinIndex(force = false): Promise<Record<string, CoinMeta>> {
  const local = readCache()
  if (!force && Object.keys(local).length > Object.keys(STATIC_COINS).length) {
    return Promise.resolve(local)
  }
  if (!inflight) {
    inflight = loadIndex().finally(() => {
      inflight = null
    })
  }
  return inflight.then((coins) => (Object.keys(coins).length > 0 ? coins : local))
}

export function cachedCoinMeta(symbol: string): CoinMeta | null {
  if (!symbol) return null
  const idx = readCache()
  const clean = cleanCoinSymbol(symbol)

  if (idx[clean]) return idx[clean]

  const upper = symbol.trim().toUpperCase()
  if (idx[upper]) return idx[upper]

  const unscaled = getBaseSymbol(clean)
  if (idx[unscaled]) {
    return {
      symbol: clean,
      name: idx[unscaled].name,
      image: idx[unscaled].image,
    }
  }

  return null
}
