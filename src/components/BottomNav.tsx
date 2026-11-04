import { motion, LayoutGroup, AnimatePresence } from 'framer-motion'
import {
  Zap,
  ArrowLeftRight,
  Trophy,
  Wallet,
  Search,
} from 'lucide-react'
import type { Tab } from '../store/navigation'
import { useNav } from '../store/navigation'
import { useI18n } from '../lib/i18n'
import { buzz } from '../lib/haptics'

const items: Array<{
  tab: Tab
  Icon: typeof Zap
  key: string
  defaultLabel: string
  isSearch?: boolean
}> = [
  { tab: 'market', Icon: Zap, key: 'nav.market', defaultLabel: 'Монеты' },
  { tab: 'trade', Icon: ArrowLeftRight, key: 'nav.trade', defaultLabel: 'Трейдинг' },
  { tab: 'history', Icon: Trophy, key: 'nav.history', defaultLabel: 'Лидерборд' },
  { tab: 'portfolio', Icon: Wallet, key: 'nav.portfolio', defaultLabel: 'Портфель' },
  { tab: 'settings', Icon: Search, key: 'nav.settings', defaultLabel: 'Поиск', isSearch: true },
]

export function BottomNav() {
  const { t } = useI18n()
  const { tab, setTab, symbolOpen } = useNav()

  return (
    <AnimatePresence>
      {!symbolOpen && (
        <motion.nav
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="fixed bottom-4 inset-x-0 mx-auto w-[92%] max-w-sm z-50 pointer-events-auto select-none"
          style={{
            bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          }}
        >
          <div
            className="flex items-center justify-between rounded-full bg-[#161a22]/90 backdrop-blur-2xl border border-white/10 px-3 py-2 shadow-2xl"
            style={{
              WebkitBackdropFilter: 'blur(24px)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <LayoutGroup id="moonshot-dock">
              {items.map(({ tab: t_, Icon, key, defaultLabel, isSearch }) => {
                const active = tab === t_
                const label = t(key) || defaultLabel

                if (isSearch) {
                  return (
                    <motion.button
                      key={t_}
                      type="button"
                      onClick={() => {
                        if (!active) {
                          buzz(6)
                          setTab(t_)
                        }
                      }}
                      aria-label={label}
                      title={label}
                      className={`relative flex h-11 w-11 items-center justify-center rounded-full outline-none transition-all duration-200 ${
                        active
                          ? 'bg-white text-[#090b10] shadow-[0_0_16px_rgba(255,255,255,0.28)] border border-transparent'
                          : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white border border-white/10'
                      }`}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    >
                      <Icon size={19} strokeWidth={2.2} />
                    </motion.button>
                  )
                }

                return (
                  <motion.button
                    key={t_}
                    type="button"
                    onClick={() => {
                      if (!active) {
                        buzz(6)
                        setTab(t_)
                      }
                    }}
                    aria-label={label}
                    title={label}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full outline-none"
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  >
                    {active && (
                      <motion.div
                        layoutId="dock-active-capsule"
                        className="absolute inset-0 rounded-full bg-white/[0.12] border border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.06)]"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors duration-150 ${
                        active ? 'text-white' : 'text-[#8b95a8] hover:text-white/80'
                      }`}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                  </motion.button>
                )
              })}
            </LayoutGroup>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
