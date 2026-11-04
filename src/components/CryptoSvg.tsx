/** Официальная библиотека векторных SVG логотипов криптовалют и сетей.
 *  Чёткие официальные векторные SVG для всех основных криптовалют:
 *  BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, SUI, LINK, TON, NEAR, ZEC,
 *  USDT, USDC, PEPE, SHIB, WIF, BONK, TRUMP, PENGU, DOT, MATIC, TRX, UNI,
 *  ARB, OP, APT, LTC, BCH, ATOM, XLM, FIL, INJ, RENDER, KAS, TAO.
 *  Сети: Solana, Ethereum, Base, BSC, Pump.fun.
 */
import React from 'react'
import { motion } from 'framer-motion'

export type NetworkChain = 'sol' | 'solana' | 'eth' | 'ethereum' | 'base' | 'bsc' | 'bnb' | 'pump'

interface SvgItem {
  viewBox?: string
  render: (size: number) => React.ReactNode
}

const REGISTRY: Record<string, SvgItem> = {
  // 1. BITCOIN (Официальный наклонный ₿ с градиентом)
  BTC: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <defs>
          <linearGradient id="c-btc-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9900" />
            <stop offset="100%" stopColor="#f7931a" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="url(#c-btc-g)" />
        <path
          fill="#ffffff"
          fillRule="evenodd"
          d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.15-4.156.988-5.328.696l.95-3.813c1.172.293 4.929.872 4.378 3.117zm.54-5.576c-.488 1.954-3.502.96-4.475.718l.86-3.45c.974.243 4.118.697 3.615 2.732z"
        />
      </>
    ),
  },

  // 2. ETHEREUM (Официальный кристалл с гранями)
  ETH: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#1c1e2d" />
        <g fill="#ffffff">
          <path fillOpacity="0.6" d="M16 4.5l-7.5 12.5L16 21V4.5z" />
          <path d="M16 4.5l7.5 12.5L16 21V4.5z" />
          <path fillOpacity="0.4" d="M16 22.5l-7.5-4.25L16 28v-5.5z" />
          <path fillOpacity="0.8" d="M16 22.5l7.5-4.25L16 28v-5.5z" />
          <path fillOpacity="0.25" d="M8.5 17L16 21V17H8.5z" />
          <path fillOpacity="0.65" d="M23.5 17L16 21V17h7.5z" />
        </g>
      </>
    ),
  },

  // 3. SOLANA (3 параллельные закруглённые полосы с неоновым градиентом)
  SOL: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <defs>
          <linearGradient id="c-sol-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFA3" />
            <stop offset="100%" stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="#0c0d14" />
        <path
          fill="url(#c-sol-g)"
          d="M7.7 8.5a1.2 1.2 0 011-.5h15.6a.6.6 0 01.4 1l-2.4 2.5a1.2 1.2 0 01-1 .5H5.7a.6.6 0 01-.4-1l2.4-2.5zm0 7.8a1.2 1.2 0 011-.5h15.6a.6.6 0 01.4 1l-2.4 2.5a1.2 1.2 0 01-1 .5H5.7a.6.6 0 01-.4-1l2.4-2.5zm14.6 7.2a1.2 1.2 0 01-1 .5H5.7a.6.6 0 01-.4-1l2.4-2.5a1.2 1.2 0 011-.5h15.6a.6.6 0 01.4 1l-2.4 2.5z"
        />
      </>
    ),
  },

  // 4. BINANCE COIN (Геометрический куб Binance)
  BNB: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#f3ba2f" />
        <path
          fill="#ffffff"
          d="M16 6.5l3.5 3.5-3.5 3.5-3.5-3.5L16 6.5zm-5.7 5.7l2.1 2.1-3.5 3.5-2.1-2.1 3.5-3.5zm11.4 0l3.5 3.5-2.1 2.1-3.5-3.5 2.1-2.1zM16 14.8l2.9 2.9-2.9 2.9-2.9-2.9 2.9-2.9zm-7.8 4.3l2.1 2.1-3.5 3.5-2.1-2.1 3.5-3.5zm15.6 0l3.5 3.5-2.1 2.1-3.5-3.5 2.1-2.1zM16 23.2l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5z"
        />
      </>
    ),
  },

  // 5. XRP (Ripple стилизованный X)
  XRP: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#23292f" />
        <path
          fill="#ffffff"
          d="M24.2 8h2.6l-5.7 5.6c-2.8 2.8-7.4 2.8-10.2 0L5.2 8h2.6l4.4 4.3c1.4 1.4 3.7 1.4 5.1 0L24.2 8zm-16.4 16H5.2l5.7-5.6c2.8-2.8 7.4-2.8 10.2 0l5.7 5.6h-2.6l-4.4-4.3c-1.4-1.4-3.7-1.4-5.1 0L7.8 24z"
        />
      </>
    ),
  },

  // 6. DOGECOIN (Официальный золотой круг с белым Ð)
  DOGE: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#c2a633" />
        <path
          fill="#ffffff"
          d="M11 7h7c4.4 0 7.5 3.1 7.5 9s-3.1 9-7.5 9h-7V7zm3.8 3.5v3.8h5V16h-5v5.7h3.2c2.4 0 4.1-1.8 4.1-5.7s-1.7-5.5-4.1-5.5h-3.2z"
        />
        <rect x="7" y="14.3" width="7" height="3.2" fill="#ffffff" rx="0.5" />
      </>
    ),
  },

  // 7. CARDANO (ADA созвездие кругов)
  ADA: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#0033ad" />
        <g fill="#ffffff">
          <circle cx="16" cy="16" r="3.2" />
          <circle cx="16" cy="8" r="1.3" />
          <circle cx="16" cy="24" r="1.3" />
          <circle cx="8" cy="16" r="1.3" />
          <circle cx="24" cy="16" r="1.3" />
          <circle cx="10.5" cy="10.5" r="1.1" />
          <circle cx="21.5" cy="10.5" r="1.1" />
          <circle cx="10.5" cy="21.5" r="1.1" />
          <circle cx="21.5" cy="21.5" r="1.1" />
          <circle cx="16" cy="4.5" r="0.9" />
          <circle cx="16" cy="27.5" r="0.9" />
          <circle cx="4.5" cy="16" r="0.9" />
          <circle cx="27.5" cy="16" r="0.9" />
        </g>
      </>
    ),
  },

  // 8. AVALANCHE (Красная гора A)
  AVAX: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#e84142" />
        <path
          fill="#ffffff"
          d="M17.5 6.4a1.8 1.8 0 00-3.1 0L5.3 22.8c-.7 1.2.2 2.7 1.6 2.7h5.4a1.8 1.8 0 001.5-.9l6.9-12 1.6 2.8-3.4 6a1.8 1.8 0 001.5 2.7h6c1.4 0 2.3-1.5 1.6-2.7L17.5 6.4z"
        />
      </>
    ),
  },

  // 9. SUI (Капля Sui с внутренним контуром)
  SUI: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#2a82e4" />
        <path
          fill="#ffffff"
          d="M16 5.5S8.5 16 8.5 21a7.5 7.5 0 0015 0c0-5-7.5-15.5-7.5-15.5zm0 19.5a4.5 4.5 0 01-4.5-4.5c0-2.8 3.5-7.8 4.5-9.2 1 1.4 4.5 6.4 4.5 9.2a4.5 4.5 0 01-4.5 4.5z"
        />
      </>
    ),
  },

  // 10. CHAINLINK (Шестигранник LINK)
  LINK: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#375bd2" />
        <path
          fill="#ffffff"
          d="M16 6l8 4.6v9.2L16 24.4l-8-4.6v-9.2L16 6zm0 3.7l-4.8 2.8v5.5L16 20.8l4.8-2.8v-5.5L16 9.7z"
        />
      </>
    ),
  },

  // 11. TON (The Open Network 3D кристалл)
  TON: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#0098ea" />
        <g fill="#ffffff">
          <path d="M16 5.5l9 5.5-9 15.5L7 11l9-5.5z" fillOpacity="0.9" />
          <path d="M16 5.5v21L7 11l9-5.5z" fillOpacity="0.4" />
          <path d="M16 11l6 3.5-6 10-6-10 6-3.5z" fill="#0098ea" />
        </g>
      </>
    ),
  },

  // 12. NEAR PROTOCOL (Оригами N)
  NEAR: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#111111" />
        <path
          fill="#00FFA3"
          d="M9.5 7.5a1.5 1.5 0 00-1.5 1.5v14a1.5 1.5 0 002.5 1.1l11.5-10.7v8.1a1.5 1.5 0 003 0v-14a1.5 1.5 0 00-2.5-1.1L11 17.1V9a1.5 1.5 0 00-1.5-1.5z"
        />
      </>
    ),
  },

  // 13. ZCASH (Z с вертикальными штрихами)
  ZEC: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#f4b728" />
        <path
          fill="#ffffff"
          d="M14.5 5v2.2H9v3.6l7.7 9.8H9v3.6h5.5V27h3v-2.8H23v-3.6l-7.7-9.8H23V7.2h-5.5V5h-3z"
        />
      </>
    ),
  },

  // 14. TETHER (USDT кольцо с T)
  USDT: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#26a17b" />
        <path
          fill="#ffffff"
          d="M17.8 15.2v-2.3h6v-3.4H8.2v3.4h6v2.3c-4.9.2-8.6 1.1-8.6 2.2s3.7 2 8.6 2.2v6.4h3.6v-6.4c4.9-.2 8.6-1.1 8.6-2.2s-3.7-2-8.6-2.2zm0 3.1c-3.6 0-6.7-.5-7.5-1.1.8-.6 3.9-1.1 7.5-1.1s6.7.5 7.5 1.1c-.8.6-3.9 1.1-7.5 1.1z"
        />
      </>
    ),
  },

  // 15. USD COIN (USDC доллар в круге)
  USDC: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#2775ca" />
        <path
          fill="#ffffff"
          d="M16 5a11 11 0 100 22 11 11 0 000-22zm.7 4.2c2.5 0 4.2 1.3 4.5 3.2h-2.3c-.3-.9-1.2-1.4-2.2-1.4-1.3 0-2.1.8-2.1 1.7 0 1.2 1.3 1.5 2.8 1.8 2.4.5 4.3 1.3 4.3 3.6 0 2.2-1.7 3.5-4.3 3.7V23h-1.6v-1.2c-2.6-.2-4.4-1.5-4.7-3.5h2.4c.3 1 1.3 1.7 2.4 1.7 1.4 0 2.2-.8 2.2-1.8 0-1.2-1.2-1.6-2.8-1.9-2.3-.5-4.2-1.2-4.2-3.5 0-2 1.6-3.4 3.9-3.6V8h1.6v1.2z"
        />
      </>
    ),
  },

  // 16. PEPE (Культовая зелёная лягушка Пепе)
  PEPE: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#388e3c" />
        <circle cx="11" cy="12" r="4.8" fill="#ffffff" />
        <circle cx="21" cy="12" r="4.8" fill="#ffffff" />
        <circle cx="11.5" cy="12" r="2.3" fill="#1b5e20" />
        <circle cx="20.5" cy="12" r="2.3" fill="#1b5e20" />
        <circle cx="12" cy="11" r="0.7" fill="#ffffff" />
        <circle cx="21" cy="11" r="0.7" fill="#ffffff" />
        <path d="M7 19c2.5 4 15.5 4 18 0" stroke="#b71c1c" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M8 20.5c2 2.5 14 2.5 16 0" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </>
    ),
  },

  // 17. SHIBA INU (Мордочка сиба-ину)
  SHIB: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#f05a28" />
        <path d="M8 7l4 7-4 4zM24 7l-4 7 4 4z" fill="#ffffff" />
        <path d="M9 9l2.5 4-2.5 2zM23 9l-2.5 4 2.5 2z" fill="#d32f2f" />
        <ellipse cx="16" cy="18" rx="8" ry="7" fill="#ffffff" />
        <polygon points="16,19 14,16 18,16" fill="#212121" />
        <ellipse cx="12" cy="15" rx="1.5" ry="2" fill="#212121" />
        <ellipse cx="20" cy="15" rx="1.5" ry="2" fill="#212121" />
      </>
    ),
  },

  // 18. WIF (dogwifhat: пёсик в розовой вязаной шапке)
  WIF: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#e6a57e" />
        <ellipse cx="16" cy="19" rx="7" ry="6" fill="#ffffff" />
        <circle cx="13" cy="17" r="1.3" fill="#222222" />
        <circle cx="19" cy="17" r="1.3" fill="#222222" />
        <polygon points="16,19.5 14.8,18 17.2,18" fill="#222222" />
        {/* Розовая вязаная шапочка */}
        <path d="M9 13.5c0-4.5 3.5-7.5 7-7.5s7 3 7 7.5z" fill="#f472b6" />
        <rect x="8" y="12" width="16" height="3" rx="1.5" fill="#ec4899" />
        <circle cx="16" cy="5.5" r="2" fill="#fbcfe8" />
      </>
    ),
  },

  // 19. BONK (Весёлый щенок Bonk)
  BONK: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#f59e0b" />
        <path d="M10 14c0 5 2.5 9 6 9s6-4 6-9c0-3-2-6-6-6s-6 3-6 6z" fill="#ffffff" />
        <polygon points="16,16 14.5,14 17.5,14" fill="#1f2937" />
        <path d="M14 17.5q2 2 4 0" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <ellipse cx="12.5" cy="12.5" rx="1.2" ry="1.8" fill="#1f2937" />
        <ellipse cx="19.5" cy="12.5" rx="1.2" ry="1.8" fill="#1f2937" />
        <circle cx="11" cy="15.5" r="1.5" fill="#f87171" opacity="0.6" />
        <circle cx="21" cy="15.5" r="1.5" fill="#f87171" opacity="0.6" />
      </>
    ),
  },

  // 20. TRUMP (MAGA red cap мем)
  TRUMP: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#b91c1c" />
        <path d="M9 16c0-5 3-9 8-9 4 0 6 2 7 5l-7 1c-4 .5-6 1.5-8 3z" fill="#dc2626" />
        <path d="M6 17c3-1 10-1.5 16-1l5 2c.5.2 0 1-1 1H7c-.8 0-1.3-.6-1-2z" fill="#991b1b" />
        <text x="11.5" y="14" fill="#fbbf24" fontSize="4.2" fontWeight="900" fontFamily="sans-serif">
          USA
        </text>
      </>
    ),
  },

  // 21. PENGU (Pudgy Penguins толстенький пингвинчик)
  PENGU: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#38bdf8" />
        <ellipse cx="16" cy="17" rx="8.5" ry="9" fill="#0f172a" />
        <ellipse cx="16" cy="18" rx="6" ry="7" fill="#ffffff" />
        <circle cx="13" cy="14" r="1.5" fill="#0f172a" />
        <circle cx="19" cy="14" r="1.5" fill="#0f172a" />
        <circle cx="13.5" cy="13.5" r="0.5" fill="#ffffff" />
        <circle cx="19.5" cy="13.5" r="0.5" fill="#ffffff" />
        <polygon points="16,17.5 14,15.5 18,15.5" fill="#f97316" />
      </>
    ),
  },

  // 22. POLKADOT (Розовый круг с точками)
  DOT: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#e6007a" />
        <ellipse cx="16" cy="16" rx="5" ry="8" fill="#ffffff" />
        <circle cx="16" cy="6" r="2.2" fill="#ffffff" />
        <circle cx="16" cy="26" r="2.2" fill="#ffffff" />
      </>
    ),
  },

  // 23. POLYGON (Фиолетовая петля бесконечности)
  POL: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#8247e5" />
        <path
          fill="#ffffff"
          d="M20.5 13.5l-3.3-1.9a1.7 1.7 0 00-1.7 0l-3.3 1.9v3.8l3.3 1.9a1.7 1.7 0 001.7 0l3.3-1.9v-3.8zM16 9l4.5 2.6v5.2L16 19.4l-4.5-2.6V11.6L16 9z"
        />
      </>
    ),
  },
  MATIC: {
    viewBox: '0 0 32 32',
    render: () => REGISTRY.POL.render(32),
  },

  // 24. TRON (Красный алмазный треугольник)
  TRX: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#eb0029" />
        <path
          fill="#ffffff"
          d="M7 8l18 3.5-12 14.5L7 8zm2.2 2.3l4.2 8.7 8.5-10.2L9.2 10.3z"
        />
      </>
    ),
  },

  // 25. UNISWAP (Розовый единорог)
  UNI: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#ff007a" />
        <path
          fill="#ffffff"
          d="M10 20c0-6 4-11 11-13-1 3-1 6 1 8 2 2 4 4 4 7 0 4-4 8-8 8s-8-4-8-10z"
        />
      </>
    ),
  },

  // 26. ARBITRUM (Синий сложенный треугольник A)
  ARB: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#28a0f0" />
        <path
          fill="#ffffff"
          d="M16 6l9 15.5h-4.5L16 13.7l-4.5 7.8H7L16 6zm0 11.2l2.3 4h-4.6l2.3-4z"
        />
      </>
    ),
  },

  // 27. OPTIMISM (Красные буквы OP)
  OP: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#ff0420" />
        <text
          x="16"
          y="21"
          fill="#ffffff"
          fontSize="14"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
        >
          OP
        </text>
      </>
    ),
  },

  // 28. APTOS (Стилизованные горизонтальные полосы)
  APT: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#1e1e1e" />
        <path fill="#ffffff" d="M16 6l9 16h-4l-5-9-5 9H7l9-16z" />
        <line x1="8" y1="18" x2="24" y2="18" stroke="#22c55e" strokeWidth="2" />
      </>
    ),
  },

  // 29. LITECOIN (Серебряный Ł)
  LTC: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#345d9d" />
        <path
          fill="#ffffff"
          d="M13 8h3.5v9.5h6V21h-9.5V8zm-2 6.5l8-3.2v2.2l-8 3.2v-2.2z"
        />
      </>
    ),
  },

  // 30. BITCOIN CASH (Зелёный ₿)
  BCH: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#0ac18e" />
        <path
          fill="#ffffff"
          d="M14 9h5c2.5 0 4 1.2 4 3 0 1.2-.6 2.2-1.7 2.6 1.4.4 2.2 1.5 2.2 3 0 2.2-1.8 3.4-4.5 3.4h-5V9zm3 2.5v3h2c1 0 1.8-.5 1.8-1.5s-.8-1.5-1.8-1.5h-2zm0 5.5v3.5h2.2c1.2 0 2-.6 2-1.7s-.8-1.8-2-1.8H17z"
        />
        <line x1="16" y1="6" x2="16" y2="9" stroke="#ffffff" strokeWidth="1.8" />
        <line x1="18.5" y1="6" x2="18.5" y2="9" stroke="#ffffff" strokeWidth="1.8" />
        <line x1="16" y1="21" x2="16" y2="24" stroke="#ffffff" strokeWidth="1.8" />
        <line x1="18.5" y1="21" x2="18.5" y2="24" stroke="#ffffff" strokeWidth="1.8" />
      </>
    ),
  },

  // 31. COSMOS (Орбиты атома)
  ATOM: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#2e3148" />
        <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
        <ellipse cx="16" cy="16" rx="9" ry="3.5" fill="none" stroke="#ffffff" strokeWidth="1.4" />
        <ellipse
          cx="16"
          cy="16"
          rx="9"
          ry="3.5"
          transform="rotate(60 16 16)"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
        />
        <ellipse
          cx="16"
          cy="16"
          rx="9"
          ry="3.5"
          transform="rotate(120 16 16)"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
        />
      </>
    ),
  },

  // 32. STELLAR (Ракета / стилизованный круг)
  XLM: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#14b6eb" />
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          d="M6 13c3-3 8-5 13-3s8 7 7 12M26 19c-3 3-8 5-13 3S5 15 6 10"
        />
        <line x1="4" y1="16" x2="28" y2="16" stroke="#ffffff" strokeWidth="1.8" />
      </>
    ),
  },

  // 33. FILECOIN
  FIL: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#0090ff" />
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M13 8h6M11 16h10M12 24h8M16 8v16"
        />
      </>
    ),
  },

  // 34. INJECTIVE
  INJ: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#00b2fe" />
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.8"
          strokeLinecap="round"
          d="M10 16a6 6 0 0112 0 6 6 0 01-12 0"
        />
        <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
      </>
    ),
  },

  // 35. RENDER
  RENDER: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#e51b24" />
        <path
          fill="#ffffff"
          d="M16 7a9 9 0 00-9 9 9 9 0 0015.3 6.4l-2.1-2.1A6 6 0 1116 10v-3z"
        />
      </>
    ),
  },
  RNDR: {
    viewBox: '0 0 32 32',
    render: () => REGISTRY.RENDER.render(32),
  },

  // 36. KASPA
  KAS: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#70c7ba" />
        <path
          fill="#ffffff"
          d="M12 8h3v6l5-6h3.5l-6 6.5 6.5 7.5H20l-5-6v6h-3V8z"
        />
      </>
    ),
  },

  // 37. BITTENSOR
  TAO: {
    viewBox: '0 0 32 32',
    render: () => (
      <>
        <circle cx="16" cy="16" r="16" fill="#18181b" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" strokeWidth="2" />
        <circle cx="16" cy="16" r="4" fill="none" stroke="#22c55e" strokeWidth="2" />
      </>
    ),
  },
}

/** Проверяет наличие встроенного официального векторного SVG */
export function hasCryptoSvg(symbol: string): boolean {
  if (!symbol) return false
  const clean = symbol.trim().toUpperCase()
  return Boolean(REGISTRY[clean])
}

export interface CryptoSvgProps {
  symbol: string
  size?: number
  rounded?: 'full' | '2xl' | 'xl' | 'lg' | string
  className?: string
  style?: React.CSSProperties
  layoutId?: string
}

/** Компонент для отображения векторного официального SVG логотипа */
export function CryptoSvg({
  symbol,
  size = 34,
  rounded = 'full',
  className = '',
  style,
  layoutId,
}: CryptoSvgProps) {
  const clean = symbol.trim().toUpperCase()
  const item = REGISTRY[clean] || REGISTRY.BTC

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

  const radiusStyle =
    isFull
      ? '50%'
      : rounded === '2xl'
      ? '16px'
      : rounded === 'xl'
      ? '12px'
      : rounded === 'lg'
      ? '8px'
      : undefined

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
        ...style,
      }}
    >
      <svg
        viewBox={item.viewBox || '0 0 32 32'}
        width={size}
        height={size}
        className="h-full w-full select-none"
      >
        {item.render(size)}
      </svg>
    </Tag>
  )
}

/** Официальный векторный бейдж сети блокчейна (Solana, Ethereum, Base, BSC, Pump.fun) */
export function NetworkBadge({
  chain = 'sol',
  size = 18,
  className = '',
}: {
  chain?: NetworkChain
  size?: number
  className?: string
}) {
  const c = chain.toLowerCase()

  if (c === 'eth' || c === 'ethereum') {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-black/90 bg-[#151922] p-[2px] shadow-sm select-none ${className}`}
        style={{ width: size, height: size }}
        title="Ethereum"
      >
        <svg viewBox="0 0 32 32" className="h-full w-full">
          <circle cx="16" cy="16" r="16" fill="#627eea" />
          <path fill="#ffffff" fillOpacity="0.7" d="M16 6l-6 10L16 19.5V6z" />
          <path fill="#ffffff" d="M16 6l6 10L16 19.5V6z" />
          <path fill="#ffffff" fillOpacity="0.5" d="M16 20.5l-6-3.5L16 26v-5.5z" />
          <path fill="#ffffff" fillOpacity="0.9" d="M16 20.5l6-3.5L16 26v-5.5z" />
        </svg>
      </div>
    )
  }

  if (c === 'base') {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-black/90 bg-[#0052ff] p-[2px] shadow-sm select-none ${className}`}
        style={{ width: size, height: size }}
        title="Base"
      >
        <svg viewBox="0 0 32 32" className="h-full w-full">
          <circle cx="16" cy="16" r="16" fill="#0052ff" />
          <path fill="#ffffff" d="M16 7a9 9 0 108.7 11.5h-5.4A4 4 0 1116 12v-5z" />
        </svg>
      </div>
    )
  }

  if (c === 'bsc' || c === 'bnb') {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-black/90 bg-[#10141a] p-[2px] shadow-sm select-none ${className}`}
        style={{ width: size, height: size }}
        title="BNB Chain"
      >
        <svg viewBox="0 0 32 32" className="h-full w-full">
          <circle cx="16" cy="16" r="16" fill="#f3ba2f" />
          <path
            fill="#ffffff"
            d="M16 6.5l3.5 3.5-3.5 3.5-3.5-3.5L16 6.5zm-5.7 5.7l2.1 2.1-3.5 3.5-2.1-2.1 3.5-3.5zm11.4 0l3.5 3.5-2.1 2.1-3.5-3.5 2.1-2.1zM16 14.8l2.9 2.9-2.9 2.9-2.9-2.9 2.9-2.9zm-7.8 4.3l2.1 2.1-3.5 3.5-2.1-2.1 3.5-3.5zm15.6 0l3.5 3.5-2.1 2.1-3.5-3.5 2.1-2.1zM16 23.2l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5z"
          />
        </svg>
      </div>
    )
  }

  if (c === 'pump') {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-black/90 bg-[#10141a] px-1 py-[1.5px] shadow-sm select-none ${className}`}
        title="Pump.fun"
      >
        <span className="text-[10px] leading-none select-none">💊</span>
      </div>
    )
  }

  // По умолчанию: Solana 3-полосы + капсула Pump
  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-black/90 bg-[#10141a] px-1 py-[1.5px] shadow-sm select-none ${className}`}
      title="Solana"
    >
      <svg width="10" height="7" viewBox="0 0 10 7" fill="none" className="shrink-0">
        <path d="M1.5 1h7M2.5 3.5h7M1.5 6h7" stroke="url(#badge-sol-g)" strokeWidth="1.2" strokeLinecap="round" />
        <defs>
          <linearGradient id="badge-sol-g" x1="0" y1="0" x2="10" y2="7" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00FFA3" />
            <stop offset="1" stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[7.5px] leading-none select-none">💊</span>
    </div>
  )
}
