import { RealtimeSocket, type RealtimePayload, type RealtimeStatus } from './RealtimeSocket'

interface AgentRealtimeEvents {
  onStatus?: (status: RealtimeStatus) => void
  onReady?: () => void
  onMessage?: (payload: RealtimePayload) => void
  onState?: (payload: RealtimePayload) => void
  onMessageUpdated?: (payload: RealtimePayload) => void
  onAck?: (payload: RealtimePayload) => void
  onNack?: (payload: RealtimePayload) => void
  onUnknown?: (payload: RealtimePayload) => void
}

export class AgentRealtimeSocket {
  private socket: RealtimeSocket

  constructor(private readonly tokenReader: () => string, private readonly events: AgentRealtimeEvents = {}) {
    this.socket = new RealtimeSocket({
      url: () => this.buildUrl(),
      onStatus: status => this.events.onStatus?.(status),
      onMessage: payload => this.onPayload(payload),
    })
  }

  connect() {
    this.socket.connect()
  }

  close() {
    this.socket.close()
  }

  restart() {
    this.socket.restart()
  }

  isOpen() {
    return this.socket.isOpen()
  }

  joinConversation(id: string) {
    this.socket.send({ type: 'agent.join', conversation: id })
  }

  leaveConversation(id: string) {
    this.socket.send({ type: 'agent.leave', conversation: id })
  }

  sendMessage(id: string, content: string) {
    const clientMessageId = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
    this.socket.send({
      type: 'agent.send',
      conversation: id,
      content,
      client_message_id: clientMessageId,
    })
    return clientMessageId
  }

  private onPayload(payload: RealtimePayload) {
    const type = String(payload.type || '')
    if (type === 'ready') {
      this.events.onReady?.()
      return
    }
    if (type === 'message') {
      this.events.onMessage?.(payload)
      return
    }
    if (type === 'state') {
      this.events.onState?.(payload)
      return
    }
    if (type === 'message_updated') {
      this.events.onMessageUpdated?.(payload)
      return
    }
    if (type === 'message_ack') {
      this.events.onAck?.(payload)
      return
    }
    if (type === 'message_nack') {
      this.events.onNack?.(payload)
      return
    }
    this.events.onUnknown?.(payload)
  }

  private buildUrl() {
    const token = this.tokenReader().trim()
    if (!token)
      return ''
    const location = window.location
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const env = import.meta as unknown as { env?: Record<string, string | undefined> }
    const explicit = (env.env?.VITE_AGENT_WS_URL || '').trim().replace(/\/$/, '')
    const base = explicit || `${wsProto}//${location.host}`
    return `${base}/ws/agent/?token=${encodeURIComponent(token)}`
  }
}
