/** Экспорт/импорт всех данных (JSON): счёт, настройки, избранное. */
import { useSettings } from './settings'
import { useTrading, initialAccount } from './trading'
import { useMarket } from './market'
import { saveKV, deleteKV } from '../lib/storage'
import type { AccountSnapshot } from '../lib/engine/types'

interface BackupShape {
  app: 'paper-trading'
  version: number
  exportedAt: string
  settings: Record<string, unknown>
  account: unknown
  favorites: unknown
  dexTokens: unknown
  aliases: unknown
}

export function exportFileName(): string {
  const d = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `paper-trading-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

export function exportAll(): string {
  const settings = useSettings.getState()
  const trading = useTrading.getState()
  const market = useMarket.getState()
  const data: BackupShape = {
    app: 'paper-trading',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      theme: settings.theme,
      lang: settings.lang,
      feePct: settings.feePct,
      leverageEnabled: settings.leverageEnabled,
      sounds: settings.sounds,
      dexEnabled: settings.dexEnabled,
    },
    account: trading.snap,
    favorites: market.favorites,
    dexTokens: market.dexTokens,
    aliases: market.aliases,
  }
  return JSON.stringify(data, null, 2)
}

function isBackup(x: unknown): x is BackupShape {
  return (
    !!x &&
    typeof x === 'object' &&
    (x as BackupShape).app === 'paper-trading' &&
    ((x as BackupShape).account !== undefined || (x as BackupShape).settings !== undefined)
  )
}

/** Импортирует бэкап в сторы + IndexedDB. Возвращает true при успехе. */
export async function importAll(raw: string): Promise<boolean> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return false
  }
  if (!isBackup(parsed)) return false

  const s = useSettings.getState()
  if (parsed.settings) {
    s.setTheme((parsed.settings.theme as never) ?? s.theme)
    s.setLang((parsed.settings.lang as never) ?? s.lang)
    if (typeof parsed.settings.feePct === 'number') s.setFeePct(parsed.settings.feePct)
    if (typeof parsed.settings.leverageEnabled === 'boolean') s.setLeverageEnabled(parsed.settings.leverageEnabled)
    if (typeof parsed.settings.sounds === 'boolean') s.setSounds(parsed.settings.sounds)
    if (typeof parsed.settings.dexEnabled === 'boolean') s.setDexEnabled(parsed.settings.dexEnabled)
  }
  if (parsed.account && typeof parsed.account === 'object') {
    const acc = parsed.account as { version?: number; cash?: string }
    if (acc.version === 1 && typeof acc.cash === 'string') {
      await saveKV('account-v1', parsed.account)
      useTrading.setState({ snap: parsed.account as AccountSnapshot, ready: true })
    } else if (typeof acc.cash === 'string') {
      // устаревшая версия — просто сброс
      await deleteKV('account-v1')
    }
  }
  if (Array.isArray(parsed.favorites)) {
    useMarket.setState({ favorites: parsed.favorites as string[] })
  }
  if (Array.isArray(parsed.dexTokens)) {
    const dts = parsed.dexTokens as Array<{ chainId?: string; pairAddress?: string }>
    const aliases: Record<string, unknown> = {}
    for (const t of dts) {
      if (t.chainId && t.pairAddress) {
        aliases[`${t.chainId}:${t.pairAddress}`] = t
      }
    }
    useMarket.setState({ dexTokens: dts as never, aliases: aliases as never })
  }
  return true
}

export function freshAccount(startBalance: string) {
  return initialAccount(startBalance)
}
