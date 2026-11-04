/** Тема: системная/тёмная/светлая, кроссфейд через View Transitions API. */

export type ThemePref = 'system' | 'dark' | 'light'

const mql = window.matchMedia('(prefers-color-scheme: dark)')

export function resolveTheme(pref: ThemePref): 'dark' | 'light' {
  if (pref !== 'system') return pref
  return mql.matches ? 'dark' : 'light'
}

function metaThemeColor(color: string) {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = 'theme-color'
    document.head.appendChild(tag)
  }
  tag.content = color
}

/** Переключение темы с плавным кроссфейдом (View Transitions API, если поддерживается). */
export function applyTheme(pref: ThemePref, animate = true): void {
  const resolved = resolveTheme(pref)
  const html = document.documentElement
  const apply = () => {
    html.dataset.theme = resolved
    metaThemeColor(resolved === 'dark' ? '#0B0E14' : '#F4F6FB')
  }
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !animate
  const vt = (document as { startViewTransition?: (cb: () => void) => void })
    .startViewTransition
  if (vt && !reduced) {
    vt.call(document, () => apply())
  } else {
    apply()
  }
}

/** Подписка на смену системной темы (для pref='system'). */
export function watchSystemTheme(cb: () => void): () => void {
  const handler = () => cb()
  mql.addEventListener?.('change', handler)
  return () => mql.removeEventListener?.('change', handler)
}
