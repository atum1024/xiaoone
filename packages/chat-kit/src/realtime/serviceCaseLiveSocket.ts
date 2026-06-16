import { RealtimeSocket } from './RealtimeSocket'
import { buildChatWsUrl } from './wsUrl'

export interface ServiceCaseMessage {
  id: string | number
  role: string
  content: string
  created_at: string
  [key: string]: unknown
}

export interface ServiceCaseMeta {
  id: string
  domain: string
  merchant_id: number
  requester_user_id: number
  status: string
  title: string
  [key: string]: unknown
}

export interface ServiceCaseSocketHandlers {
  onReady?: (caseData: ServiceCaseMeta | undefined) => void
  onTransportStatus?: (status: 'connecting' | 'open' | 'closed' | 'auth-failed') => void
  onMessage?: (env: { case: ServiceCaseMeta; message: ServiceCaseMessage }) => void
  onState?: (env: { case: ServiceCaseMeta }) => void
  onClose?: (code: number) => void
}

/**
 * 用户服务台（ServiceCase）实时 WebSocket 客户端。
 *
 * 连接 chat 服务的 /ws/service-case/?token=<JWT>&case=<case_id>，
 * 复用 RealtimeSocket（心跳 / 自动重连 / visibility wake 全部继承）。
 * 消息写入仍走 agent REST API；本 socket 负责接收服务端 broadcast 推送。
 */
export class ServiceCaseLiveSocket {
  private socket: RealtimeSocket | null = null

  constructor(
    private tokenSource: string | (() => string | null),
    private caseId: string,
    private handlers: ServiceCaseSocketHandlers = {},
  ) {}

  connect() {
    this.socket = new RealtimeSocket({
      url: () => this.buildUrl(),
      onStatus: status => this.handlers.onTransportStatus?.(status),
      onClose: code => this.handlers.onClose?.(code),
      onMessage: (data) => {
        if (data.type === 'ready') {
          this.handlers.onReady?.(data.case as ServiceCaseMeta | undefined)
        }
        else if (data.type === 'message') {
          this.handlers.onMessage?.(data.data as { case: ServiceCaseMeta; message: ServiceCaseMessage })
        }
        else if (data.type === 'state') {
          this.handlers.onState?.(data.data as { case: ServiceCaseMeta })
        }
      },
    })
    this.socket.connect()
  }

  restart() {
    this.socket?.restart()
  }

  close() {
    this.socket?.close()
    this.socket = null
  }

  private buildUrl(): string {
    const token = typeof this.tokenSource === 'function' ? this.tokenSource() : this.tokenSource
    if (!token || !this.caseId)
      return ''
    const loc = window.location
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:'
    const explicit = (import.meta as unknown as { env?: { VITE_AGENT_WS_URL?: string } }).env?.VITE_AGENT_WS_URL
    return buildChatWsUrl({
      explicit,
      fallbackOrigin: `${proto}//${loc.host}`,
      path: '/ws/service-case/',
      params: {
        token,
        case: this.caseId,
      },
    })
  }
}
