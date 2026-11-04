/** Короткие синтезированные звуки через WebAudio (без файлов, работает офлайн). */
import type { SoundName } from './sound-types'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const C =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  c: AudioContext,
  freq: number,
  at: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'sine'
) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(vol, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(at)
  o.stop(at + dur + 0.02)
}

export function playSound(name: SoundName): void {
  const c = getCtx()
  if (!c) return
  const t = c.currentTime + 0.02
  switch (name) {
    case 'buy':
      tone(c, 660, t, 0.12, 0.08)
      tone(c, 880, t + 0.09, 0.16, 0.08)
      break
    case 'sell':
      tone(c, 740, t, 0.12, 0.08)
      tone(c, 520, t + 0.09, 0.16, 0.08)
      break
    case 'fill':
      tone(c, 1180, t, 0.09, 0.06, 'triangle')
      break
    case 'error':
      tone(c, 180, t, 0.18, 0.1, 'sawtooth')
      break
    case 'notify':
      tone(c, 980, t, 0.07, 0.05, 'triangle')
      tone(c, 1320, t + 0.06, 0.09, 0.05, 'triangle')
      break
    case 'profit':
      tone(c, 523, t, 0.1, 0.09)
      tone(c, 659, t + 0.08, 0.1, 0.09)
      tone(c, 784, t + 0.16, 0.22, 0.09)
      break
  }
}
