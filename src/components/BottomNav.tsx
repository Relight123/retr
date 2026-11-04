import { motion, LayoutGroup } from 'framer-motion'
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
      className="sticky bottom-0 z-40 border-t border-white/[0.06] bg-surface/85 pt-safe select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <LayoutGroup id="nav-ind">
        <div className="grid grid-cols-5">
          {items.map(({ tab: t_, Icon, key }) => {
            const active = tab === t_
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
                className="relative flex h-14 flex-col items-center justify-center gap-1 pt-1 pb-1 outline-none"
                style={{ minHeight: 56 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator-dot"
                    className="absolute top-0 h-[2px] w-6 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span
                  className={`transition-colors duration-150 ${
                    active ? 'text-accent' : 'text-faint'
                  }`}
                >
                  <Icon size={21} strokeWidth={1.75} />
                </span>
                <span
                  className={`text-[10px] tracking-tight transition-colors duration-150 ${
                    active ? 'text-accent font-medium' : 'text-faint'
                  }`}
                >
                  {t(key)}
                </span>
              </motion.button>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
