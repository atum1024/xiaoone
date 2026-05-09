export type RealtimeStatus = 'connecting' | 'open' | 'closed'
export type RealtimePayload = Record<string, unknown>

interface RealtimeSocketOptions {
  url: string | (() => string)
  heartbeatMs?: number
  pongTimeoutMs?: number
  reconnectDelayMs?: number
  onStatus?: (status: RealtimeStatus) => void
  onOpen?: () => void
  onClose?: (code: number) => void
  onError?: (event: Event) => void
  onMessage?: (payload: RealtimePayload) => void
}

export class RealtimeSocket {
  private socket: WebSocket | null = null
  private heartbeatTimer: number | null = null
  private pongTimer: number | null = null
  private reconnectTimer: number | null = null
  private closedByClient = true

  constructor(private readonly options: RealtimeSocketOptions) {}

  connect() {
    this.closedByClient = false
    this.clearReconnect()
    this.cleanupSocket(false)

    const url = typeof this.options.url === 'function' ? this.options.url() : this.options.url
    if (!url) {
      this.closedByClient = true
      this.options.onStatus?.('closed')
      return
    }

    this.options.onStatus?.('connecting')
    const socket = new WebSocket(url)
    this.socket = socket

    socket.onopen = () => {
      this.options.onStatus?.('open')
      this.startHeartbeat()
      this.options.onOpen?.()
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as RealtimePayload
        if (payload.type === 'pong') {
          this.clearPongTimer()
          return
        }
        this.clearPongTimer()
        this.options.onMessage?.(payload)
      }
      catch {
        // ignore malformed realtime payload
      }
    }

    socket.onerror = (event) => {
      this.options.onError?.(event)
      this.options.onStatus?.('closed')
    }

    socket.onclose = (event) => {
      if (this.socket === socket)
        this.socket = null
      this.stopHeartbeat()
      this.options.onStatus?.('closed')
      this.options.onClose?.(event.code)
      if (!this.closedByClient)
        this.scheduleReconnect()
    }
  }

  close() {
    this.closedByClient = true
    this.clearReconnect()
    this.cleanupSocket(true)
    this.options.onStatus?.('closed')
  }

  restart() {
    this.close()
    this.connect()
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
    const heartbeatMs = this.options.heartbeatMs ?? 20000
    this.heartbeatTimer = window.setInterval(() => this.ping(), heartbeatMs)
    this.ping()
  }

  private ping() {
    if (!this.send({ type: 'ping', ts: Date.now() }))
      return
    this.clearPongTimer()
    this.pongTimer = window.setTimeout(() => {
      this.cleanupSocket(true)
      if (!this.closedByClient)
        this.scheduleReconnect(0)
    }, this.options.pongTimeoutMs ?? 15000)
  }

  private scheduleReconnect(delayMs = this.options.reconnectDelayMs ?? 2500) {
    if (this.reconnectTimer != null)
      return
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (!this.closedByClient)
        this.connect()
    }, delayMs)
  }

  private cleanupSocket(closeSocket: boolean) {
    this.stopHeartbeat()
    const socket = this.socket
    this.socket = null
    if (!socket)
      return
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    if (closeSocket) {
      try {
        socket.close(1000, 'client close')
      }
      catch {}
    }
    else {
      try {
        socket.close()
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
