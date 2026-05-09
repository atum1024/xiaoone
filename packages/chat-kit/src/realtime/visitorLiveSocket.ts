/**
 * 访客 `ws/visitor/`：心跳、断线重连、与 merchant RealtimeSocket 一致的 lifecycle 唤醒（可选）。
 */
import { RealtimeSocket } from './RealtimeSocket'

export interface VisitorSocketHandlers {
  onOpen?: () => void
  onClose?: (code: number) => void
  onError?: (err: Event) => void
  onJson?: (data: Record<string, unknown>) => void
}

export interface VisitorLiveSocketOptions {
  /** 返回完整 ws URL（含 query） */
  url: () => string
  handlers?: VisitorSocketHandlers
}

/**
 * 薄封装：将 visitor 侧 JSON 协议交给上层解析（XiaooneChatWidget），传输层复用 RealtimeSocket。
 */
export class VisitorLiveSocket {
  private rt: RealtimeSocket

  constructor(private opts: VisitorLiveSocketOptions) {
    this.rt = new RealtimeSocket({
      url: () => opts.url(),
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
