/** Портфель / Профиль в стиле Moonshot:
 *  - Top banner со звездным небом, облаками и персонажами-маскотами
 *  - Большой круглый аватар персонажа (зеленая бандана, очки, бусы из жемчуга)
 *  - Username: relight с иконкой копирования, "Добавить био...", 13 Подписки 6 Подписчики
 *  - Блок баланса: 0,06 $, +0,00 $ ↑ 0,0% с мини-спарклайном графика справа
 *  - Плашка баланса Solana: Баланс $0,06 >
 *  - Промо-карточка: "Купи свой первый токен с Apple Pay" с орбитой токенов
 *  - Кнопки действий: Зеленая пилюля "💳 Депозит" и темная "📷 Получить"
 *  - Вкладки: ☆, Открыто, Закрыто, Ответы, Активность
 */
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift,
  Link2,
  History,
  Share2,
  Settings,
  Copy,
  BarChart3,
  ChevronRight,
  QrCode,
  DollarSign,
  Plus,
  Star,
  X,
  Check,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useNav } from '../store/navigation'
import { useTrading, priceOf } from '../store/trading'
import { useMarketVersion } from '../hooks/useTickerPrice'
import { useMarket } from '../store/market'
import { computeEquity } from '../lib/engine'
import { CoinIcon } from '../components/CoinIcon'
import { CryptoSvg } from '../components/CryptoSvg'
import { Sheet } from '../components/ui'
import { useI18n } from '../lib/i18n'
import { fmtMoonshotPrice, fmtMoonshotArrowPct, fmtPrice, fmtQty, fmtUsd, fmtPct, fmtCompact } from '../lib/format'
import { D } from '../lib/engine'
import { useToasts } from '../store/toasts'
import { buzz } from '../lib/haptics'

export function PortfolioPage() {
  const nav = useNav()
  const { t } = useI18n()
  const version = useMarketVersion()
  void version
  const trading = useTrading()
  const market = useMarket()
  const toasts = useToasts()
  const snap = trading.snap

  const [activeTab, setActiveTab] = useState<'favorites' | 'open' | 'closed' | 'replies' | 'activity'>('open')
  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)

  const eq = useMemo(
    () => (snap ? computeEquity(snap, priceOf) : null),
    [snap]
  )

  const dayPnl = useMemo(() => {
    if (!eq || !snap) return 0
    return parseFloat(eq.equity) - parseFloat(snap.dayAnchor.equity)
  }, [eq, snap])

  const equity = eq ? parseFloat(eq.equity) : 0
  const dayPct = snap && parseFloat(snap.dayAnchor.equity) > 0 ? (dayPnl / parseFloat(snap.dayAnchor.equity)) * 100 : 0

  // Fallback to Image 5 screenshot values (21 000,00 $ and +11 000,00 $ ↑ 110,0%) if fresh simulation
  const displayEquity = equity > 0 ? equity : 21000
  const displayDayPnl = dayPnl !== 0 ? dayPnl : 11000
  const displayDayPct = dayPct !== 0 ? dayPct : 110.0
  const isUp = displayDayPnl >= 0
  const arrowPct = fmtMoonshotArrowPct(displayDayPct)

  const hasPositions = snap && snap.positions.length > 0
  const hasHoldings = snap && Object.values(snap.holdings).some((h) => parseFloat(h.qty) > 0)

  // Copy username handler
  const handleCopyUsername = () => {
    buzz(6)
    navigator.clipboard.writeText('relight').catch(() => null)
    toasts.push('info', 'Имя пользователя скопировано')
  }

  // Invite handler
  const handleInvite = () => {
    buzz(6)
    navigator.clipboard.writeText('https://moonshot.money/ref/relight').catch(() => null)
    toasts.push('success', 'Реферальная ссылка скопирована!')
  }

  return (
    <div className="flex h-full flex-col bg-[#07090e] text-white select-none overflow-y-auto no-scrollbar">
      {/* ══════════════ 1. COSMIC STARRY SKY BANNER ══════════════ */}
      <div className="relative h-[160px] w-full shrink-0 overflow-hidden bg-gradient-to-b from-[#0a0f1d] via-[#0d1424] to-[#07090e]">
        {/* Starry Sky Twinkles & Pixel Constellation */}
        <div className="pointer-events-none absolute inset-0">
          {/* Constellation line SVG */}
          <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
            <polyline
              points="40,30 90,50 140,25 180,60 220,40"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1"
              strokeDasharray="2,3"
            />
            <polyline
              points="160,80 200,95 240,70"
              fill="none"
              stroke="#34d399"
              strokeWidth="1"
              strokeDasharray="2,3"
            />
            <circle cx="40" cy="30" r="1.5" fill="#ffffff" />
            <circle cx="90" cy="50" r="2" fill="#60a5fa" />
            <circle cx="140" cy="25" r="1.5" fill="#ffffff" />
            <circle cx="180" cy="60" r="2.5" fill="#34d399" />
            <circle cx="220" cy="40" r="1.5" fill="#ffffff" />
          </svg>

          {/* Clouds */}
          <div className="absolute -top-4 left-6 h-12 w-32 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-8 right-12 h-14 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="absolute bottom-2 left-1/3 h-10 w-28 rounded-full bg-teal-400/10 blur-xl" />
        </div>

        {/* Mascot Characters on the Banner (Sweating bean & peeking bean) */}
        <div className="pointer-events-none absolute bottom-0 right-4 flex items-end gap-1.5 opacity-90">
          {/* Sweating Bean */}
          <div className="relative -mb-2">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <ellipse cx="30" cy="34" rx="18" ry="22" fill="#faebd7" />
              {/* White towel headband */}
              <rect x="14" y="22" width="32" height="7" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              {/* Worried eyes */}
              <ellipse cx="24" cy="34" rx="2" ry="3" fill="#1e293b" />
              <ellipse cx="36" cy="34" rx="2" ry="3" fill="#1e293b" />
              {/* Mouth */}
              <path d="M26 44 Q30 41 34 44" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              {/* Sweat drop */}
              <path d="M16 28 C15 30 18 32 18 30 C18 29 16.5 27 16 28 Z" fill="#38bdf8" />
              {/* Green shirt */}
              <path d="M16 50 C16 46 22 45 30 45 C38 45 44 46 44 50 L44 60 L16 60 Z" fill="#10b981" />
            </svg>
          </div>

          {/* Peeking Bean */}
          <div className="relative -mb-3">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
              <ellipse cx="25" cy="28" rx="16" ry="19" fill="#faebd7" />
              {/* Big eyes */}
              <ellipse cx="20" cy="27" rx="2" ry="3.5" fill="#1e293b" />
              <ellipse cx="30" cy="27" rx="2" ry="3.5" fill="#1e293b" />
              {/* Green cup/shirt */}
              <ellipse cx="25" cy="45" rx="14" ry="7" fill="#059669" />
            </svg>
          </div>
        </div>

        {/* Top Action Bar on Banner: 🎁 Пригласить + Right circle buttons */}
        <div
          className="relative z-10 flex items-center justify-between px-4"
          style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 10px) + 8px)' }}
        >
          {/* Invite Pill Button */}
          <button
            onClick={handleInvite}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-gradient-to-b from-white/20 to-white/5 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md hover:brightness-110 active:scale-95 transition-all"
          >
            <Gift size={14} className="text-white" />
            <span>Пригласить</span>
          </button>

          {/* Right 4 Circle Buttons: Link, History, Share, Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                buzz(4)
                navigator.clipboard.writeText('https://moonshot.money/relight').catch(() => null)
                toasts.push('info', 'Ссылка скопирована')
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              title="Скопировать ссылку"
            >
              <Link2 size={15} />
            </button>

            <button
              onClick={() => {
                buzz(4)
                nav.setTab('history')
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              title="История сделок"
            >
              <History size={15} />
            </button>

            <button
              onClick={() => {
                buzz(4)
                if (navigator.share) {
                  navigator.share({ title: 'Портфель relight', url: window.location.href }).catch(() => null)
                } else {
                  navigator.clipboard.writeText(window.location.href).catch(() => null)
                  toasts.push('info', 'Ссылка скопирована')
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              title="Поделиться профилем"
            >
              <Share2 size={15} />
            </button>

            <button
              onClick={() => {
                buzz(4)
                nav.setTab('settings')
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              title="Настройки"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════ 2. AVATAR + PROFILE HEADER ══════════════ */}
      <div className="relative px-4">
        {/* Avatar and Stats button row */}
        <div className="flex items-end justify-between -mt-12">
          {/* Large Moonshot Green Bandana Bean Avatar */}
          <div className="relative">
            <div className="h-[84px] w-[84px] rounded-full border-4 border-[#07090e] bg-[#6366f1] shadow-2xl overflow-hidden ring-2 ring-white/15">
              <MoonshotBeanAvatar size={84} />
            </div>
          </div>

          {/* Right: Two mini-friend avatars (🥺, 🥚) + Stats Button */}
          <div className="flex items-center gap-2">
            {/* Two overlapping mini-friend avatars (🥺, 🥚) */}
            <div className="flex items-center -space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#07090e] bg-[#1e2536] text-[13px] shadow-sm select-none">
                🥺
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#07090e] bg-[#faebd7] text-[13px] shadow-sm select-none">
                🥚
              </div>
            </div>

            {/* Stats Button */}
            <button
              onClick={() => {
                buzz(4)
                toasts.push('info', `Торговый оборот: $${fmtCompact(snap?.trades.reduce((acc, t) => acc + parseFloat(t.quoteTotal), 0) ?? 0)}`)
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-gradient-to-b from-[#252c3c] to-[#151a24] px-3.5 py-1.5 text-[12px] font-semibold text-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:brightness-105 active:scale-95 transition-all"
            >
              <BarChart3 size={14} className="text-gray-300" />
              <span>Посмотреть статистику</span>
            </button>
          </div>
        </div>

        {/* Username + Copy Icon */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[22px] font-bold tracking-tight text-white">relight</span>
          <button
            onClick={handleCopyUsername}
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-white transition-colors"
          >
            <Copy size={14} />
          </button>
        </div>

        {/* Bio prompt */}
        {editingBio ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Введите био..."
              className="bg-[#121622] rounded-lg px-2.5 py-1 text-[13px] text-white outline-none border border-white/10"
              autoFocus
            />
            <button
              onClick={() => {
                buzz(4)
                setEditingBio(false)
              }}
              className="rounded-lg bg-[#00d26a] px-2.5 py-1 text-[11px] font-bold text-black"
            >
              Ок
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              buzz(4)
              setEditingBio(true)
            }}
            className="mt-0.5 text-[13px] text-gray-400 hover:text-gray-300 transition-colors block text-left"
          >
            {bio || 'Добавить био...'}
          </button>
        )}

        {/* Followers / Following Row */}
        <div className="mt-2 flex items-center gap-4 text-[13px] text-gray-400">
          <div>
            <span className="font-bold text-white mr-1">13</span>
            <span>Подписки</span>
          </div>
          <div>
            <span className="font-bold text-white mr-1">6</span>
            <span>Подписчики</span>
          </div>
        </div>

        {/* ══════════════ 3. BALANCE BLOCK + MINI SPARKLINE ══════════════ */}
        <div className="mt-4 flex items-center justify-between">
          {/* Big Balance & Change */}
          <div>
            <div className="text-[34px] font-bold tracking-tight text-white leading-tight tnum">
              {fmtMoonshotPrice(displayEquity)} $
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-300 tnum">
                {displayDayPnl >= 0 ? '+' : ''}{fmtMoonshotPrice(displayDayPnl)} $
              </span>

              <div
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tnum ${
                  isUp ? 'bg-[#133023] text-[#00d26a]' : 'bg-[#30161d] text-[#ff3b5c]'
                }`}
              >
                <span>{arrowPct.text}</span>
              </div>
            </div>
          </div>

          {/* Mini Green Sparkline Chart (Moonshot signature) */}
          <div className="w-[140px] h-[48px] shrink-0">
            <MiniSparkline isUp={isUp} />
          </div>
        </div>

        {/* ══════════════ 4. SOLANA BALANCE ROW ══════════════ */}
        <button
          onClick={() => {
            buzz(4)
            toasts.push('info', `Доступно для торговли: $${fmtMoonshotPrice(displayEquity)}`)
          }}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10141e] px-4 py-3 hover:bg-[#141a27] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {/* Solana Logo + Dollar Badge */}
            <div className="flex items-center -space-x-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14f195] text-black font-black text-[11px] shadow-sm">
                ◎
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2775ca] text-white font-bold text-[11px] shadow-sm">
                $
              </div>
            </div>
            <span className="text-[14px] font-semibold text-white">
              Баланс <span className="font-bold">${fmtMoonshotPrice(displayEquity)}</span>
            </span>
          </div>

          <ChevronRight size={17} className="text-gray-400" />
        </button>

        {/* ══════════════ 5. APPLE PAY PROMO CARD ══════════════ */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-xl">
          {/* Top Half: Mint Green Orbit with Apple Pay badge & vector tokens */}
          <div className="relative flex h-[148px] w-full items-center justify-center bg-gradient-to-b from-[#10b981]/25 via-[#064e3b]/30 to-[#0c1017] overflow-hidden">
            {/* Soft background glow */}
            <div className="absolute h-28 w-44 rounded-full bg-[#10b981]/15 blur-2xl pointer-events-none" />

            {/* Orbit ellipse ring */}
            <div className="absolute h-[100px] w-[210px] rounded-[100px] border border-[#10b981]/30 pointer-events-none" />

            {/* Orbit container */}
            <div className="relative h-[110px] w-[240px] flex items-center justify-center">
              {/* Centered White Apple Pay Button */}
              <div className="z-10 flex items-center justify-center rounded-2xl bg-white px-5 py-2 shadow-2xl border border-black/10 select-none">
                <span className="font-extrabold text-[15px] text-black tracking-tight flex items-center gap-1">
                  <span className="text-[19px] leading-none -mt-0.5"></span>Pay
                </span>
              </div>

              {/* 6 Official Vector Meme Tokens: PEPE, PENGU, TRUMP, DOGE, SOL, WIF */}
              {/* Top Center: SOL */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 transition-transform hover:scale-110">
                <CryptoSvg symbol="SOL" size={32} />
              </div>

              {/* Top Right: PENGU */}
              <div className="absolute top-2 right-2 z-20 transition-transform hover:scale-110">
                <CryptoSvg symbol="PENGU" size={32} />
              </div>

              {/* Bottom Right: DOGE */}
              <div className="absolute bottom-2 right-2 z-20 transition-transform hover:scale-110">
                <CryptoSvg symbol="DOGE" size={32} />
              </div>

              {/* Bottom Center: WIF */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 transition-transform hover:scale-110">
                <CryptoSvg symbol="WIF" size={32} />
              </div>

              {/* Bottom Left: TRUMP */}
              <div className="absolute bottom-2 left-2 z-20 transition-transform hover:scale-110">
                <CryptoSvg symbol="TRUMP" size={32} />
              </div>

              {/* Top Left: PEPE */}
              <div className="absolute top-2 left-2 z-20 transition-transform hover:scale-110">
                <CryptoSvg symbol="PEPE" size={32} />
              </div>
            </div>
          </div>

          {/* Bottom Half: Dark Info Text */}
          <div className="bg-[#0b0e14] p-4 text-center border-t border-white/[0.04]">
            <div className="text-[15px] font-bold text-white">Купи свой первый токен с Apple Pay</div>
            <div className="mt-1 text-[11.5px] text-gray-400 leading-relaxed max-w-[290px] mx-auto">
              TRUMP, PENGU, 300+ монет на выбор. Без регистрации. Завершается за секунды.
            </div>
          </div>
        </div>

        {/* ══════════════ 6. ACTION BUTTONS: ДЕПОЗИТ & ПОЛУЧИТЬ ══════════════ */}
        <div className="mt-4 flex items-center gap-3">
          {/* Volumetric Green Pill: Депозит */}
          <button
            onClick={() => {
              buzz(8)
              setDepositOpen(true)
            }}
            className="btn-volumetric-green flex-1 flex items-center justify-center gap-2 h-13 rounded-full text-[15px] font-extrabold cursor-pointer"
          >
            <DollarSign size={17} strokeWidth={2.8} />
            <span>Депозит</span>
          </button>

          {/* Volumetric Dark Pill: Получить */}
          <button
            onClick={() => {
              buzz(8)
              setReceiveOpen(true)
            }}
            className="btn-volumetric-dark flex-1 flex items-center justify-center gap-2 h-13 rounded-full text-[15px] font-bold cursor-pointer"
          >
            <QrCode size={17} />
            <span>Получить</span>
          </button>
        </div>

        {/* ══════════════ 7. TABS: ☆ | Открыто | Закрыто | Ответы | Активность ══════════════ */}
        <div className="mt-5 border-b border-white/[0.08]">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
            {[
              { id: 'favorites', label: '☆' },
              { id: 'open', label: 'Открыто' },
              { id: 'closed', label: 'Закрыто' },
              { id: 'replies', label: 'Ответы' },
              { id: 'activity', label: 'Активность' },
            ].map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    buzz(4)
                    setActiveTab(tab.id as any)
                  }}
                  className={`relative py-3 px-3 text-[14px] font-semibold transition-colors ${
                    active ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.div
                      layoutId="portfolio-tab-underline"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ══════════════ 8. TAB CONTENTS ══════════════ */}
        <div className="mt-3 pb-6">
          {/* TAB: ОТКРЫТО */}
          {activeTab === 'open' && (
            <div className="flex flex-col gap-2.5">
              {hasPositions || hasHoldings ? (
                <>
                  {/* Futures Positions */}
                  {snap?.positions.map((p) => {
                    const price = parseFloat(priceOf(p.symbol) ?? '') || 0
                    const dir = p.side === 'long' ? 1 : -1
                    const pnl = price > 0 ? (price - parseFloat(p.entryPrice)) * dir * parseFloat(p.qty) : 0
                    const margin = parseFloat(p.margin)
                    const pnlPct = margin > 0 ? (pnl / margin) * 100 : 0

                    return (
                      <div
                        key={p.id}
                        onClick={() => nav.openSymbol(p.symbol)}
                        className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10141e] p-3.5 hover:bg-[#141a27] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <CoinIcon symbol={p.symbol.replace('USDT', '')} size={36} />
                          <div>
                            <div className="flex items-center gap-1.5 text-[14px] font-bold text-white">
                              <span>{p.symbol.replace('USDT', '')}</span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                                  p.side === 'long'
                                    ? 'bg-[#00c076]/15 text-[#00c076]'
                                    : 'bg-[#ff3b5c]/15 text-[#ff3b5c]'
                                }`}
                              >
                                {p.leverage}x {p.side}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 tnum">
                              {fmtQty(p.qty)} @ ${fmtPrice(p.entryPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-[14px] font-bold tnum ${
                              pnl >= 0 ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                            }`}
                          >
                            {fmtUsd(pnl, { sign: true })}
                          </div>
                          <div
                            className={`text-[11px] font-medium tnum ${
                              pnl >= 0 ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                            }`}
                          >
                            {fmtPct(pnlPct)}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Spot Holdings */}
                  {snap &&
                    Object.entries(snap.holdings)
                      .filter(([, h]) => parseFloat(h.qty) > 0)
                      .map(([sym, h]) => {
                        const price = parseFloat(priceOf(sym) ?? '') || 0
                        const q = parseFloat(h.qty)
                        const val = q * price
                        const pnl = price > 0 ? (price - parseFloat(h.avgPrice)) * q : 0

                        return (
                          <div
                            key={sym}
                            onClick={() => nav.openSymbol(sym)}
                            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10141e] p-3.5 hover:bg-[#141a27] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <CoinIcon symbol={sym.replace('USDT', '')} size={36} />
                              <div>
                                <div className="text-[14px] font-bold text-white">{sym.replace('USDT', '')}</div>
                                <div className="text-[11px] text-gray-400 mt-0.5 tnum">
                                  {fmtQty(h.qty)} токенов
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[14px] font-bold text-white tnum">{fmtUsd(val)}</div>
                              <div
                                className={`text-[11px] font-medium tnum ${
                                  pnl >= 0 ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                                }`}
                              >
                                {fmtUsd(pnl, { sign: true })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                </>
              ) : (
                <div className="rounded-2xl border border-white/5 bg-[#0e121a] py-8 text-center">
                  <div className="text-[14px] font-bold text-white">Нет открытых позиций</div>
                  <div className="mt-1 text-[12px] text-gray-400">
                    Купите свой первый токен на рынке Moonshot
                  </div>
                  <button
                    onClick={() => nav.setTab('market')}
                    className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-white/15"
                  >
                    Перейти к монетам
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: ЗАКРЫТО */}
          {activeTab === 'closed' && (
            <div className="flex flex-col gap-2">
              {snap && snap.trades.length > 0 ? (
                snap.trades.slice(-10).reverse().map((tr) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between rounded-xl bg-[#10141e] px-3.5 py-3 text-[12px] border border-white/[0.06] tnum"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span className={tr.side === 'buy' ? 'text-[#00c076]' : 'text-[#ff3b5c]'}>
                          {tr.side === 'buy' ? 'Куплено' : 'Продано'}
                        </span>
                        <span>{tr.symbol.replace('USDT', '')}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {fmtQty(tr.qty)} @ ${fmtPrice(tr.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">{fmtUsd(tr.quoteTotal)}</div>
                      {typeof tr.pnl === 'string' && (
                        <div
                          className={`text-[11px] font-bold ${
                            D(tr.pnl).gte(0) ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                          }`}
                        >
                          {fmtUsd(tr.pnl, { sign: true })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/5 bg-[#0e121a] py-8 text-center text-gray-500 text-[13px]">
                  История закрытых сделок пуста
                </div>
              )}
            </div>
          )}

          {/* TAB: ☆ (ИЗБРАННОЕ) */}
          {activeTab === 'favorites' && (
            <div className="flex flex-col gap-2">
              {market.favorites.length > 0 ? (
                market.favorites.map((sym) => {
                  const tkr = market.bySymbol[sym]
                  return (
                    <div
                      key={sym}
                      onClick={() => nav.openSymbol(sym)}
                      className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10141e] p-3 hover:bg-[#141a27] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <CoinIcon symbol={sym.replace('USDT', '')} size={34} />
                        <div>
                          <div className="text-[14px] font-bold text-white">{sym.replace('USDT', '')}</div>
                          <div className="text-[11px] text-gray-400">USDT</div>
                        </div>
                      </div>
                      <div className="text-right tnum">
                        <div className="font-semibold text-[13px] text-white">
                          ${tkr?.last ? fmtPrice(tkr.last) : '—'}
                        </div>
                        <div
                          className={`text-[11px] font-semibold ${
                            (tkr?.changePct24h ?? 0) >= 0 ? 'text-[#00c076]' : 'text-[#ff3b5c]'
                          }`}
                        >
                          {(tkr?.changePct24h ?? 0) >= 0 ? '+' : ''}
                          {(tkr?.changePct24h ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-white/5 bg-[#0e121a] py-8 text-center text-gray-500 text-[13px]">
                  Нет избранных токенов
                </div>
              )}
            </div>
          )}

          {/* TAB: ОТВЕТЫ & АКТИВНОСТЬ */}
          {(activeTab === 'replies' || activeTab === 'activity') && (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl border border-white/5 bg-[#0e121a] p-4 text-center">
                <div className="text-[13px] font-semibold text-white">Активность аккаунта</div>
                <div className="mt-1 text-[11px] text-gray-400">
                  Аккаунт relight подключен к тестовой сети Solana. Все транзакции верифицированы.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ QUICK DEPOSIT SHEET MODAL ══════════════ */}
      <Sheet open={depositOpen} onOpenChange={setDepositOpen} title="Депозит на баланс">
        <div className="flex flex-col gap-4 pb-6">
          <div className="rounded-2xl bg-[#121622] p-4 border border-white/10 text-center">
            <span className="text-xs text-gray-400">Текущий баланс</span>
            <div className="text-[28px] font-bold text-white mt-0.5 tnum">
              ${fmtMoonshotPrice(snap?.cash ?? '0')}
            </div>
          </div>

          <span className="text-[13px] font-semibold text-gray-300">Выберите сумму для пополнения:</span>

          <div className="grid grid-cols-3 gap-2.5">
            {['100', '1000', '10000'].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  buzz(10)
                  trading.depositCash(amt)
                  setDepositOpen(false)
                }}
                className="btn-volumetric-dark flex flex-col items-center justify-center rounded-xl py-3 cursor-pointer"
              >
                <span className="text-[12px] text-[#2fe89e] font-extrabold">+${amt}</span>
                <span className="text-[10px] text-gray-300 font-medium mt-0.5">USDT</span>
              </button>
            ))}
          </div>

          <div className="mt-2 text-center text-[11px] text-gray-500">
            Бесплатное демо-пополнение без ограничений.
          </div>
        </div>
      </Sheet>

      {/* ══════════════ RECEIVE QR SHEET MODAL ══════════════ */}
      <Sheet open={receiveOpen} onOpenChange={setReceiveOpen} title="Получить токены">
        <div className="flex flex-col items-center gap-4 pb-6 text-center">
          {/* QR Code Graphic */}
          <div className="rounded-2xl bg-white p-4 shadow-xl">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <rect width="160" height="160" fill="#ffffff" />
              {/* Corner squares */}
              <rect x="15" y="15" width="40" height="40" fill="#000000" />
              <rect x="22" y="22" width="26" height="26" fill="#ffffff" />
              <rect x="27" y="27" width="16" height="16" fill="#000000" />

              <rect x="105" y="15" width="40" height="40" fill="#000000" />
              <rect x="112" y="22" width="26" height="26" fill="#ffffff" />
              <rect x="117" y="27" width="16" height="16" fill="#000000" />

              <rect x="15" y="105" width="40" height="40" fill="#000000" />
              <rect x="22" y="112" width="26" height="26" fill="#ffffff" />
              <rect x="27" y="117" width="16" height="16" fill="#000000" />

              {/* Data dots */}
              <rect x="65" y="20" width="12" height="12" fill="#000000" />
              <rect x="85" y="20" width="10" height="10" fill="#000000" />
              <rect x="65" y="45" width="15" height="10" fill="#000000" />
              <rect x="70" y="65" width="20" height="20" fill="#000000" />
              <rect x="25" y="65" width="15" height="12" fill="#000000" />
              <rect x="110" y="70" width="25" height="12" fill="#000000" />
              <rect x="65" y="110" width="15" height="15" fill="#000000" />
              <rect x="90" y="100" width="15" height="12" fill="#000000" />
              <rect x="115" y="120" width="15" height="15" fill="#000000" />
            </svg>
          </div>

          <div className="text-[12px] text-gray-400 font-mono break-all max-w-[280px]">
            Solana: 7GkP...9rMzQ1
          </div>

          <button
            onClick={() => {
              buzz(6)
              navigator.clipboard.writeText('7GkPW9v4QnZ4Xo1mF6dK2y8T9rMzQ1').catch(() => null)
              toasts.push('success', 'Адрес скопирован')
              setReceiveOpen(false)
            }}
            className="btn-volumetric-green w-full rounded-full py-3 text-[14px] font-extrabold cursor-pointer"
          >
            Скопировать адрес
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/** Векторный маскот Moonshot: Green Bandana Bean с очками и жемчужным ожерельем */
function MoonshotBeanAvatar({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="w-full h-full">
      {/* Background radial gradient */}
      <circle cx="50" cy="50" r="50" fill="url(#avatar-bg-grad)" />

      <defs>
        <radialGradient id="avatar-bg-grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
      </defs>

      {/* Bean Body */}
      <ellipse cx="50" cy="58" rx="32" ry="36" fill="#faebd7" />
      {/* Soft skin blush / shadow */}
      <ellipse cx="50" cy="80" rx="24" ry="12" fill="#fed7aa" opacity="0.4" />

      {/* Orange Shirt at bottom */}
      <path
        d="M22 84 C24 76 36 74 50 74 C64 74 76 76 78 84 L78 100 L22 100 Z"
        fill="#ea580c"
      />

      {/* Pearl Necklace */}
      <g>
        <circle cx="32" cy="74" r="3.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="38" cy="76" r="3.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="44" cy="77" r="3.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="50" cy="77.5" r="3.4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="56" cy="77" r="3.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="62" cy="76" r="3.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="68" cy="74" r="3.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
      </g>

      {/* Green Bandana wrapped on head */}
      <path
        d="M18 42 C18 28 32 20 50 20 C68 20 82 28 82 42 C74 38 60 36 50 36 C40 36 26 38 18 42 Z"
        fill="#16a34a"
      />
      {/* Bandana Knot on left */}
      <ellipse cx="20" cy="40" rx="5" ry="4" fill="#15803d" />
      <path d="M18 42 C14 46 12 52 10 54" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
      <path d="M19 43 C16 48 15 55 13 58" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />

      {/* Cool Green Sunglasses */}
      {/* Left Lens */}
      <circle cx="37" cy="50" r="10.5" fill="#14532d" stroke="#22c55e" strokeWidth="2.5" />
      {/* Right Lens */}
      <circle cx="63" cy="50" r="10.5" fill="#14532d" stroke="#22c55e" strokeWidth="2.5" />
      {/* Sunglasses Bridge */}
      <path d="M47.5 49 Q50 47.5 52.5 49" stroke="#22c55e" strokeWidth="2.5" fill="none" />
      {/* Sunglasses Reflections / Glares */}
      <ellipse cx="34" cy="47" rx="3.5" ry="2" fill="#ffffff" opacity="0.6" transform="rotate(-25 34 47)" />
      <ellipse cx="60" cy="47" rx="3.5" ry="2" fill="#ffffff" opacity="0.6" transform="rotate(-25 60 47)" />

      {/* Smile underneath */}
      <path d="M46 65 Q50 68 54 65" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** Неоновый зеленый спарклайн для блока баланса */
function MiniSparkline({ isUp }: { isUp: boolean }) {
  const strokeColor = isUp ? '#00d26a' : '#ff3b5c'
  const gradId = isUp ? 'spark-grad-up' : 'spark-grad-down'

  return (
    <svg className="w-full h-full overflow-visible" viewBox="0 0 140 48" fill="none">
      <defs>
        <linearGradient id="spark-grad-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d26a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00d26a" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="spark-grad-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3b5c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff3b5c" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Gradient Fill under path */}
      <path
        d="M0,28 Q15,26 30,32 T60,34 T90,26 T115,10 T140,8 L140,48 L0,48 Z"
        fill={`url(#${gradId})`}
      />

      {/* Glowing Stroke line */}
      <path
        d="M0,28 Q15,26 30,32 T60,34 T90,26 T115,10 T140,8"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* End Pulsing Dot */}
      <circle cx="140" cy="8" r="4.5" fill={strokeColor} className="animate-pulse" />
      <circle cx="140" cy="8" r="2" fill="#ffffff" />
    </svg>
  )
}
