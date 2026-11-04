/** Безопасная вибрация (iOS navigator.vibrate отсутствует — не бросаем). */
export function buzz(ms = 10): void {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(ms)
  } catch {
    /* no-op */
  }
}
