/** Автопереподключение WebSocket с exponential backoff + jitter. */
export type WsStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

const MAX_DELAY = 30_000
const BASE_DELAY = 1_500

export interface ReconnectingWsOpts {
  /** URL может вычисляться динамически (новые подписки) */
  url: () => string
  onOpen?: (ws: WebSocket, attempt: number) => void
  onMessage: (raw: string) => void
  onStatus?: (s: WsStatus) => void
  /** служебный ping серверу (Bybit требует ping каждые 20с) */
  ping?: {
    everyMs: number
    payload: () => string
  }
  /** если после open нет НИ ОДНОГО кадра N мс — сокет «полумёртвый», рвём и переподключаемся */
  noDataWatchdogMs?: number
}

export class ReconnectingWs {
  private ws: WebSocket | null = null
  private attempt = 0
  private disposed = false
  private timer: number | null = null
  private pingTimer: number | null = null
  private opts: ReconnectingWsOpts
  /** полёты, отправленные пока сокет ещё CONNECTING */
  private earlySends: string[] = []
  /** время последнего входящего кадра; 0 — не было */
  private lastRecvAt = 0
  private watchdogTimer: number | null = null

  constructor(opts: ReconnectingWsOpts) {
    this.opts = opts
  }

  connect(): void {
    if (this.disposed || this.ws) return
    this.status('connecting')
    let ws: WebSocket
    try {
      ws = new WebSocket(this.opts.url())
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws
    try {
      ws.onopen = () => {
        this.attempt = 0
        this.status('open')
        // доставляем всё, что накопилось до открытия (SUBSCRIBE не теряется)
        const queued = this.earlySends
        this.earlySends = []
        for (const p of queued) {
          try {
            ws.send(p)
          } catch {
            /* соединение умерло — see reconnect */
          }
        }
        this.opts.onOpen?.(ws, this.attempt)
        this.startPing()
        this.armWatchdog()
      }
      ws.onmessage = (ev) => {
        this.lastRecvAt = Date.now()
        if (typeof ev.data === 'string') {
          try {
            this.opts.onMessage(ev.data)
          } catch (e) {
            console.warn('[ws] handler error', e)
          }
        }
      }
      ws.onerror = () => {
        // onclose придёт следом
      }
      ws.onclose = () => {
        this.ws = null
        this.stopPing()
        this.disarmWatchdog()
        if (!this.disposed) {
          this.status('reconnecting')
          this.scheduleReconnect()
        }
      }
    } catch {
      this.ws = null
      this.scheduleReconnect()
    }
  }

  send(payload: string): void {
    const raw = this.ws
    if (!raw) {
      // между попытками (onclose → следующий connect): копим до onopen,
      // иначе SUBSCRIBE, отправленный в окне reconnect, теряется навсегда
      if (!this.disposed && this.earlySends.length < 32) this.earlySends.push(payload)
      return
    }
    try {
      if (raw.readyState === 0) {
        // CONNECTING: копим; flush произойдёт в onopen
        if (this.earlySends.length < 32) this.earlySends.push(payload)
        return
      }
      raw.send(payload)
    } catch {
      /* соединение умерло — пересоберётся */
    }
  }

  private status(s: WsStatus): void {
    this.opts.onStatus?.(s)
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.timer) return
    const delay = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, this.attempt++)) + Math.random() * 800
    this.timer = window.setTimeout(() => {
      this.timer = null
      this.connect()
    }, delay)
  }

  private startPing(): void {
    if (!this.opts.ping) return
    this.stopPing()
    this.pingTimer = window.setInterval(() => {
      this.send(this.opts.ping!.payload())
    }, this.opts.ping.everyMs)
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  /** Watchdog: сокет открыт поверх TCP, но сервер молчит (half-dead) — рвём соединение. */
  private armWatchdog(): void {
    this.disarmWatchdog()
    const ms = this.opts.noDataWatchdogMs
    if (!ms) return
    this.lastRecvAt = Date.now()
    this.watchdogTimer = window.setTimeout(() => {
      this.watchdogTimer = null
      const raw = this.ws
      if (!raw || this.disposed) return
      if (Date.now() - this.lastRecvAt < ms) return // трафик есть — живой
      try {
        raw.close(4000)
      } catch {
        /* если close не удался — reconnect перезапустится сам */
      }
    }, ms + 500)
  }

  private disarmWatchdog(): void {
    if (this.watchdogTimer !== null) {
      window.clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  destroy(): void {
    this.disposed = true
    this.stopPing()
    this.disarmWatchdog()
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    try {
      this.ws?.close()
    } catch {
      /* no-op */
    }
    this.ws = null
  }
}

/** Хелпер: REST fetch с таймаутом (AbortController). */
export async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}
