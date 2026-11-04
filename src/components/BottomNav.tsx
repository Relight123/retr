import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  BarChart3,
  ArrowLeftRight,
  Wallet,
  History,
  Settings,
} from 'lucide-react'
import type { Tab } from '../store/navigation'
import { useNav } from '../store/navigation'
import { useI18n } from '../lib/i18n'
import { buzz } from '../lib/haptics'

const spring = { type: 'spring' as const, stiffness: 380, damping: 30 }

const items: Array<{ tab: Tab; Icon: typeof BarChart3; key: string }> = [
  { tab: 'market', Icon: BarChart3, key: 'nav.market' },
  { tab: 'trade', Icon: ArrowLeftRight, key: 'nav.trade' },
  { tab: 'portfolio', Icon: Wallet, key: 'nav.portfolio' },
  { tab: 'history', Icon: History, key: 'nav.history' },
  { tab: 'settings', Icon: Settings, key: 'nav.settings' },
]

export function BottomNav() {
  const { t } = useI18n()
  const { tab, setTab } = useNav()

  return (
    <nav
      className="glass-strong sticky bottom-0 z-40 border-t border-line pt-safe"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        backdropFilter: 'blur(24px) saturate(1.6)',
      }}
    >
      <LayoutGroup id="nav-ind">
        <div className="grid grid-cols-5">
          {items.map(({ tab: t_, Icon, key }) => {
            const active = tab === t_
            return (
              <motion.button
                key={t_}
                onClick={() => {
                  if (!active) {
                    buzz(6)
                    setTab(t_)
                  }
                }}
                className="relative flex h-14 flex-col items-center justify-center gap-[3px] pt-2 pb-1"
                style={{ minHeight: 56 }}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: active ? 1 : 0.95 }}
                transition={spring}
              >
                {active && (
                  <motion.span
                    layoutId="nav-ind__pill"
                    className="absolute inset-x-1 -top-0.5 bottom-0 rounded-xl"
                    style={{
                      background: 'rgba(91,123,254,0.1)',
                      border: '1px solid rgba(91,123,254,0.15)',
                    }}
                    transition={spring}
                  />
                )}
                <motion.span
                  className={active ? 'text-accent' : 'text-faint'}
                  animate={{
                    scale: active ? 1 : 0.92,
                  }}
                  style={active ? {
                    filter: 'drop-shadow(0 0 6px rgba(91,123,254,0.45))',
                  } : undefined}
                  transition={spring}
                >
                  <Icon size={23} strokeWidth={active ? 2.2 : 1.7} />
                </motion.span>
                <span
                  className={`relative z-10 text-[10px] leading-none tracking-wide ${
                    active ? 'text-accent font-semibold' : 'text-faint'
                  }`}
                >
                  {t(key)}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-ind__dot"
                    className="absolute -top-px h-[3px] w-6 rounded-full"
                    style={{ background: 'var(--accent)' }}
                    transition={spring}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
