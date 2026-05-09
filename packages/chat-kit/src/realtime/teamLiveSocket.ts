/**
 * 商户 / 平台租户 `ws/team/`：与 VisitorLiveSocket 对称的薄封装，统一走 RealtimeSocket（心跳、重连、visibility/online）。
 */
import { RealtimeSocket } from './RealtimeSocket'

export interface TeamSocketHandlers {
  onOpen?: () => void
  onClose?: (code: number) => void
  onError?: (err: Event) => void
  /** 已解析的 JSON 业务帧（含 type / conversation_id / message 等） */
  onJson?: (data: Record<string, unknown>) => void
}

export interface TeamLiveSocketOptions {
  /** 返回完整 ws URL（含 token query） */
  url: () => string
  handlers?: TeamSocketHandlers
  reconnectDelayMs?: number
}

export class TeamLiveSocket {
  private rt: RealtimeSocket

  constructor(private opts: TeamLiveSocketOptions) {
    this.rt = new RealtimeSocket({
      url: () => opts.url(),
      reconnectDelayMs: opts.reconnectDelayMs,
      onOpen: () => opts.handlers?.onOpen?.(),
      onClose: code => opts.handlers?.onClose?.(code),
      onError: ev => opts.handlers?.onError?.(ev),
      onMessage: (payload) => {
        opts.handlers?.onJson?.(payload as Record<string, unknown>)
      },
    })
  }

  connect() {
    this.rt.connect()
  }

  send(payload: Record<string, unknown>) {
    return this.rt.send(payload)
  }

  close() {
    this.rt.close()
  }

  isOpen() {
    return this.rt.isOpen()
  }
}
