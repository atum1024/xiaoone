export type RealtimePayload = Record<string, any>

export interface RealtimeSocketOptions {
  url: string | (() => string)
  heartbeatMs?: number
  pongTimeoutMs?: number
  reconnectDelayMs?: number
  onOpen?: () => void
  onClose?: (code: number) => void
  onError?: (ev: Event) => void
  onMessage?: (payload: RealtimePayload) => void
  onStatus?: (status: 'connecting' | 'open' | 'closed' | 'auth-failed') => void
}

export class RealtimeSocket {
  private socket: WebSocket | null = null
  private heartbeatTimer: number | null = null
  private pongTimer: number | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempt = 0
  private closed = true
  /** 后台标签页会节流 setInterval，心跳发不出去 → 反代空闲断连；用可见性 / 在线事件补救。 */
  private lifecycleWakeBound = false
  private onVisibilityChange: (() => void) | null = null
  private onWindowOnline: (() => void) | null = null

  constructor(private opts: RealtimeSocketOptions) {}

  private bindLifecycleWake() {
    if (this.lifecycleWakeBound || typeof document === 'undefined')
      return
    this.lifecycleWakeBound = true
    this.onVisibilityChange = () => {
      if (document.hidden || this.closed)
        return
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.ping()
        return
      }
      if (this.socket == null || this.socket.readyState === WebSocket.CLOSED)
        this.scheduleReconnect(0)
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.onWindowOnline = () => {
      if (!this.closed)
        this.scheduleReconnect(0)
    }
    window.addEventListener('online', this.onWindowOnline)
  }

  private unbindLifecycleWake() {
    if (!this.lifecycleWakeBound)
      return
    this.lifecycleWakeBound = false
    if (this.onVisibilityChange && typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    if (this.onWindowOnline)
      window.removeEventListener('online', this.onWindowOnline)
    this.onVisibilityChange = null
    this.onWindowOnline = null
  }

  connect() {
    this.closed = false
    this.clearReconnect()
    this.cleanupSocket(false)
    const url = typeof this.opts.url === 'function' ? this.opts.url() : this.opts.url
    if (!url) {
      this.closed = true
      return
    }
    this.opts.onStatus?.('connecting')
    const ws = new WebSocket(url)
    this.socket = ws
    ws.onopen = () => {
      this.reconnectAttempt = 0
      this.bindLifecycleWake()
      this.opts.onStatus?.('open')
      this.startHeartbeat()
      this.opts.onOpen?.()
    }
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data as string)
        if (payload?.type === 'error' && payload?.code === 'agent_auth_failed') {
          this.closed = true
          this.clearReconnect()
          this.stopHeartbeat()
          this.opts.onStatus?.('auth-failed')
          this.opts.onMessage?.(payload)
          this.cleanupSocket(true)
          return
        }
        if (payload?.type === 'pong') {
          this.clearPongTimer()
          return
        }
        // 任意服务端 JSON 业务帧都说明连接存活，避免只认 pong 时在消息已到达但 pong 稍晚时误杀连接
        this.clearPongTimer()
        this.opts.onMessage?.(payload)
      }
      catch {
        /* ignore malformed realtime payload */
      }
    }
    ws.onerror = (ev) => {
      this.opts.onError?.(ev)
      this.opts.onStatus?.('closed')
    }
    ws.onclose = (ev) => {
      if (this.socket === ws)
        this.socket = null
      this.stopHeartbeat()
      this.opts.onStatus?.('closed')
      this.opts.onClose?.(ev.code)
      if (!this.closed)
        this.scheduleReconnect()
    }
  }

  restart() {
    this.close()
    this.connect()
  }

  close() {
    this.closed = true
    this.clearReconnect()
    this.unbindLifecycleWake()
    this.cleanupSocket(true)
    this.opts.onStatus?.('closed')
  }

  send(payload: RealtimePayload): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN)
      return false
    this.socket.send(JSON.stringify(payload))
    return true
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    // 默认 20s：常见反代 read_timeout 60s 内至少 2～3 次机会；后台标签仍可能被节流，依赖 visibility + 业务帧清 pong 计时
    const heartbeatMs = this.opts.heartbeatMs ?? 20000
    this.heartbeatTimer = window.setInterval(() => this.ping(), heartbeatMs)
    this.ping()
  }

  private ping() {
    if (!this.send({ type: 'ping', ts: Date.now() }))
      return
    this.clearPongTimer()
    this.pongTimer = window.setTimeout(() => {
      this.cleanupSocket(true)
      if (!this.closed)
        this.scheduleReconnect(0)
    }, this.opts.pongTimeoutMs ?? 15000)
  }

  private scheduleReconnect(delayMs?: number) {
    if (this.reconnectTimer != null) return
    const baseDelay = this.opts.reconnectDelayMs ?? 2500
    const backoffDelay = Math.min(baseDelay * (2 ** this.reconnectAttempt), 20000)
    const effectiveDelay = delayMs ?? backoffDelay
    this.reconnectAttempt += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (!this.closed)
        this.connect()
    }, effectiveDelay)
  }

  private cleanupSocket(closeSocket: boolean) {
    this.stopHeartbeat()
    const ws = this.socket
    this.socket = null
    if (!ws) return
    ws.onopen = null
    ws.onmessage = null
    ws.onerror = null
    ws.onclose = null
    if (closeSocket) {
      try {
        ws.close(1000, 'client close')
      }
      catch {}
    }
    else {
      try {
        ws.close()
      }
      catch {}
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer != null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.clearPongTimer()
  }

  private clearPongTimer() {
    if (this.pongTimer != null) {
      window.clearTimeout(this.pongTimer)
      this.pongTimer = null
    }
  }

  private clearReconnect() {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
