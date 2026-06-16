import type { LiveConversation, LiveMessage } from '../types/live'
import { RealtimeSocket } from './RealtimeSocket'
import { buildChatWsUrl } from './wsUrl'

/** 商户客服 WebSocket 客户端（接管会话用） */
export class AgentLiveSocket {
  private socket: RealtimeSocket | null = null
  constructor(private tokenSource: string | (() => string | null), private listeners: {
    onReady?: () => void
    /** 传输层状态（含自动重连）；与协议层 `ready` 不同。 */
    onTransportStatus?: (status: 'connecting' | 'open' | 'closed' | 'auth-failed') => void
    onMessage?: (env: { conversation: LiveConversation; message: LiveMessage }) => void
    onMessageUpdated?: (env: { conversation: LiveConversation; message: LiveMessage }) => void
    onState?: (env: { conversation: LiveConversation }) => void
    onAck?: (env: { client_message_id: string; data?: { conversation: LiveConversation; message: LiveMessage } }) => void
    onNack?: (env: { client_message_id: string; error?: string }) => void
    onMerchantEvent?: (event: string, data: any) => void
    onClose?: (code: number) => void
  } = {}, private options: { trackPresence?: boolean } = {}) {}

  connect() {
    this.socket = new RealtimeSocket({
      url: () => this.buildUrl(),
      onStatus: status => this.listeners.onTransportStatus?.(status),
      onClose: code => this.listeners.onClose?.(code),
      onMessage: (data) => {
        if (data.type === 'message') this.listeners.onMessage?.(data.data)
        else if (data.type === 'message_updated') this.listeners.onMessageUpdated?.(data.data)
        else if (data.type === 'state') this.listeners.onState?.(data.data)
        else if (data.type === 'ready') this.listeners.onReady?.()
        else if (data.type === 'message_ack') this.listeners.onAck?.(data as any)
        else if (data.type === 'message_nack') this.listeners.onNack?.(data as any)
        else this.listeners.onMerchantEvent?.(data.type, data.data)
      },
    })
    this.socket.connect()
  }

  restart() {
    this.socket?.restart()
  }

  joinConversation(id: string) { this.send({ type: 'agent.join', conversation: id }) }
  leaveConversation(id: string) { this.send({ type: 'agent.leave', conversation: id }) }
  sendMessage(id: string, content: string, attachmentId?: string) {
    const clientMessageId = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const payload: Record<string, string> = {
      type: 'agent.send',
      conversation: id,
      content,
      client_message_id: clientMessageId,
    }
    if (attachmentId)
      payload.attachment_id = attachmentId
    this.send(payload)
    return clientMessageId
  }
  takeover(id: string) { this.send({ type: 'agent.takeover', conversation: id }) }
  closeConversation(id: string) { this.send({ type: 'agent.close', conversation: id }) }

  close() {
    this.socket?.close()
    this.socket = null
  }

  private send(payload: any) {
    this.socket?.send(payload)
  }

  private buildUrl(): string {
    const token = typeof this.tokenSource === 'function' ? this.tokenSource() : this.tokenSource
    if (!token) return ''
    const loc = window.location
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:'
    const explicit = (import.meta as unknown as { env?: { VITE_AGENT_WS_URL?: string } }).env?.VITE_AGENT_WS_URL
    return buildChatWsUrl({
      explicit,
      fallbackOrigin: `${proto}//${loc.host}`,
      path: '/ws/agent/',
      params: {
        token,
        presence: this.options.trackPresence === false ? '0' : undefined,
      },
    })
  }
}
