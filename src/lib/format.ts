/** Табличные числа, форматирование цен/количеств/процентов. */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })

const NF_USD = nf(2, 2)
const NF_PCT = nf(1, 2)

export function fmtDecimalsForPrice(p: number): number {
  if (!isFinite(p) || p <= 0) return 2
  if (p >= 1000) return 2
  if (p >= 100) return 2
  if (p >= 10) return 3
  if (p >= 1) return 4
  // для p < 1: достаточно значимых цифр
  const digits = Math.ceil(-Math.log10(p)) + 3
  return Math.min(10, Math.max(4, digits))
}

export function fmtPrice(v: string | number): string {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!isFinite(n)) return '—'
  return nf(0, fmtDecimalsForPrice(n)).format(n)
}

export function fmtUsd(v: string | number, opts?: { sign?: boolean }): string {
  const n = typeof v === 'number' ? v : parseFloat(v)
  const s = NF_USD.format(isFinite(n) ? n : 0)
  return (n > 0 && opts?.sign ? '+' : '') + '$' + s
}

export function fmtNum(v: string | number, decimals = 8): string {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!isFinite(n)) return '—'
  return nf(0, decimals)
    .format(n)
    .replace(/\.?0+$/, (m) => (m.startsWith('.') ? '' : m.replace('0', '')))
}

export function fmtQty(v: string | number, step?: string): string {
  let d: number
  if (step) {
    const i = step.indexOf('.')
    d = i < 0 ? 0 : step.length - i - 1
  } else {
    const n = typeof v === 'number' ? v : parseFloat(v)
    d = n >= 1000 ? 4 : Math.min(8, Math.max(2, fmtDecimalsForPrice(n) + 2))
  }
  return nf(0, d).format(typeof v === 'number' ? v : parseFloat(v) || 0)
}

export function fmtPct(v: number, withSign = true): string {
  const s = NF_PCT.format(v)
  return (withSign && v > 0 ? '+' : '') + s + '%'
}

/** Форматирование цены в стиле Moonshot: 80 598,00 или 0,06 */
export function fmtMoonshotPrice(v: string | number): string {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!isFinite(n)) return '—'
  if (n >= 1000) {
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (n >= 1) {
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
  }
  if (n > 0) {
    const decimals = fmtDecimalsForPrice(n)
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: decimals })
  }
  return '0,00'
}

/** Процент со стрелочкой в стиле Moonshot: ↑ 3,8% или ↓ 1,2% */
export function fmtMoonshotArrowPct(pct: number): { arrow: string; text: string; isUp: boolean } {
  const isUp = pct >= 0
  const arrow = isUp ? '↑' : '↓'
  const text = `${arrow} ${Math.abs(pct).toFixed(1).replace('.', ',')}%`
  return { arrow, text, isUp }
}

/** Короткий объём: 1 234 567 → 1.23M */
export function fmtCompact(v: string | number): string {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return nf(0, 2).format(n)
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
