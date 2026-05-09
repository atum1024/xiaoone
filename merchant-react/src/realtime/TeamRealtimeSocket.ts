import { RealtimeSocket, type RealtimePayload, type RealtimeStatus } from './RealtimeSocket'

interface TeamRealtimeEvents {
  onStatus?: (status: RealtimeStatus) => void
  onMessage?: (payload: RealtimePayload) => void
}

export class TeamRealtimeSocket {
  private socket: RealtimeSocket

  constructor(private readonly tokenReader: () => string, private readonly events: TeamRealtimeEvents = {}) {
    this.socket = new RealtimeSocket({
      url: () => this.buildUrl(),
      reconnectDelayMs: 4000,
      onStatus: status => this.events.onStatus?.(status),
      onMessage: payload => this.events.onMessage?.(payload),
    })
  }

  connect() {
    this.socket.connect()
  }

  close() {
    this.socket.close()
  }

  isOpen() {
    return this.socket.isOpen()
  }

  private buildUrl() {
    const token = this.tokenReader().trim()
    if (!token)
      return ''
    const location = window.location
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const env = import.meta as unknown as { env?: Record<string, string | undefined> }
    const explicit = (env.env?.VITE_TEAM_WS_URL || '').trim().replace(/\/$/, '')
    const base = explicit || `${wsProto}//${location.host}`
    return `${base}/ws/team/?token=${encodeURIComponent(token)}`
  }
}
