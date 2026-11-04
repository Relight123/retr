/** Инициализация сторов при старте: тема, рынок, торговый счёт. */
import { useSettings } from '../store/settings'
import { applyTheme, resolveTheme, watchSystemTheme } from './theme'
import { useMarket } from '../store/market'
import { useTrading } from '../store/trading'
import { loadCoinIndex } from '../api/coingecko'

let started = false

export function initStores(): void {
  if (started) return
  started = true
  const settings = useSettings.getState()
  applyTheme(settings.theme, false)
  watchSystemTheme(() => {
    if (useSettings.getState().theme === 'system') {
      applyTheme('system', true)
    }
  })
  void loadCoinIndex().catch(() => undefined)
  void useMarket.getState().loadTickers()
  void useTrading.getState().init()
  // тема по умолчанию при смене настройки
  useSettings.subscribe((s, prev) => {
    if (s.theme !== prev.theme) applyTheme(s.theme, true)
    if (s.theme === 'system' && resolveTheme('system') !== resolveTheme(prev.theme)) {
      applyTheme(s.theme, true)
    }
  })
}
