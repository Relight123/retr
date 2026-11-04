/** Платформенные адаптации для iOS Safari / PWA */

export function isStandalone(): boolean {
  return (
    navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/** Safari (не standalone): показываем подсказку «Поделиться → На экран “Домой”» */
export function needsInstallHint(): boolean {
  return isIos() && !isStandalone()
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      const granted = await navigator.storage.persist()
      if (!granted) console.warn('[storage] persist denied')
    }
  } catch {
    /* молча */
  }
}

/** Отключаем pinch-зум страницы и зум по двойному тапу (iOS Safari). */
export function installIosGesturesGuards(): void {
  document.addEventListener(
    'gesturestart',
    (e) => e.preventDefault(),
    { passive: false } as AddEventListenerOptions
  )
  document.addEventListener(
    'gesturechange',
    (e) => e.preventDefault(),
    { passive: false } as AddEventListenerOptions
  )
  document.addEventListener('dblclick', (e) => e.preventDefault())
}
