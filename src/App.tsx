/** Корень приложения: провайдер i18n, вкладки с переходами, оверлей символа, nav, тосты. */
import React, { Component } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { I18nProvider } from './lib/i18n'
import { useSettings } from './store/settings'
import { useNav } from './store/navigation'
import { BottomNav } from './components/BottomNav'
import { Toasts } from './components/Toasts'
import { InstallHint } from './components/InstallHint'
import { MarketPage } from './pages/MarketPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { SymbolScreen } from './pages/SymbolScreen'

/** Ошибка рендера: не убиваем приложение целиком, показываем карточку. */
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-[15px] font-semibold">Something broke</div>
          <div className="max-w-[320px] text-[12px] text-muted" style={{ wordBreak: 'break-word' }}>
            {this.state.error.message}
          </div>
          <button
            className="btn-solid btn-ghost mt-2 w-40"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCw size={16} /> Reload view
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const PAGE_SPRING = { type: 'spring' as const, stiffness: 420, damping: 36 }

function Shell() {
  const tab = useNav((s) => s.tab)
  const symbolOpen = useNav((s) => s.symbolOpen)
  const closeSymbol = useNav((s) => s.closeSymbol)
  const reduced = useReducedMotion() ?? false

  const page = (() => {
    switch (tab) {
      case 'market':
        return <MarketPage />
      case 'trade':
        return <SymbolScreen overlay={false} />
      case 'portfolio':
        return <PortfolioPage />
      case 'history':
        return <HistoryPage />
      case 'settings':
        return <SettingsPage />
    }
  })()

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col overflow-hidden bg-base text-ink"
      style={{ height: '100dvh', touchAction: 'pan-y' }}
    >
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col pb-24"
          >
            {page}
          </motion.div>
        </AnimatePresence>

        {/* Оверлей монеты поверх вкладок */}
        <AnimatePresence>
          {symbolOpen && (
            <motion.div
              key="symbol-overlay"
              className="absolute inset-0 z-50 bg-base"
              initial={reduced ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: '100%' }}
              transition={PAGE_SPRING}
            >
              <SymbolScreen overlay onBack={closeSymbol} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
      <Toasts />
      <InstallHint />
    </div>
  )
}

export default function App() {
  const lang = useSettings((s) => s.lang)
  const setLang = useSettings((s) => s.setLang)
  return (
    <ErrorBoundary>
      <I18nProvider lang={lang} setLang={setLang}>
        <Shell />
      </I18nProvider>
    </ErrorBoundary>
  )
}
