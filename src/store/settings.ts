/** Настройки (localStorage, zustand persist). */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ThemePref } from '../lib/theme'
import type { Lang } from '../lib/i18n'

export interface SettingsState {
  theme: ThemePref
  lang: Lang
  feePct: number
  leverageEnabled: boolean
  sounds: boolean
  dexEnabled: boolean
  installHintTs: number
  firstLaunchedAt: number
  setTheme: (t: ThemePref) => void
  setLang: (l: Lang) => void
  setFeePct: (v: number) => void
  setLeverageEnabled: (v: boolean) => void
  setSounds: (v: boolean) => void
  setDexEnabled: (v: boolean) => void
  dismissInstallHint: () => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      lang: 'ru',
      feePct: 0.1,
      leverageEnabled: false,
      sounds: true,
      dexEnabled: false,
      installHintTs: 0,
      firstLaunchedAt: Date.now(),
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      setFeePct: (feePct) => set({ feePct: Math.min(5, Math.max(0, feePct || 0)) }),
      setLeverageEnabled: (leverageEnabled) => set({ leverageEnabled }),
      setSounds: (sounds) => set({ sounds }),
      setDexEnabled: (dexEnabled) => set({ dexEnabled }),
      dismissInstallHint: () => set({ installHintTs: Date.now() }),
    }),
    {
      name: 'pt-settings-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        lang: s.lang,
        feePct: s.feePct,
        leverageEnabled: s.leverageEnabled,
        sounds: s.sounds,
        dexEnabled: s.dexEnabled,
        installHintTs: s.installHintTs,
        firstLaunchedAt: s.firstLaunchedAt,
      }),
    }
  )
)
