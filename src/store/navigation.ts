/** Навигация: 5 вкладок + стек символа-экрана + выбранный инструмент. */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Tab = 'market' | 'trade' | 'portfolio' | 'history' | 'settings'
export type ChartStyle = 'candles' | 'line'

interface NavState {
  tab: Tab
  symbolOpen: boolean
  activeSymbol: string
  interval: string
  chartStyle: ChartStyle
  prevTab: Tab
  setTab: (t: Tab) => void
  openSymbol: (s: string) => void
  closeSymbol: () => void
  setActiveSymbol: (s: string) => void
  setInterval: (i: string) => void
  setChartStyle: (c: ChartStyle) => void
}

export const useNav = create<NavState>()(
  persist(
    (set) => ({
      tab: 'market',
      symbolOpen: false,
      activeSymbol: 'BTCUSDT',
      interval: '1m',
      chartStyle: 'candles',
      prevTab: 'market',
      setTab: (t) => set((s) => ({ prevTab: s.tab, tab: t, symbolOpen: false })),
      openSymbol: (activeSymbol) => set({ activeSymbol, symbolOpen: true }),
      closeSymbol: () => set({ symbolOpen: false }),
      setActiveSymbol: (activeSymbol) => set({ activeSymbol }),
      setInterval: (interval) => set({ interval }),
      setChartStyle: (chartStyle) => set({ chartStyle }),
    }),
    {
      name: 'pt-nav-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ activeSymbol: s.activeSymbol, interval: s.interval, chartStyle: s.chartStyle }),
    }
  )
)
