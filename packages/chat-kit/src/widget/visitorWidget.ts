import { VisitorLiveSocket } from '../realtime/visitorLiveSocket'

export interface XiaooneKefuWidgetOptions {
  appId: string
  apiKey: string
  apiBaseUrl?: string
  wsBaseUrl?: string
  mount?: HTMLElement | string
  visitorName?: string
  visitorKey?: string
  visitorEmail?: string
  locale?: string
  channel?: 'web' | 'official_site' | 'telegram' | 'whatsapp' | 'wecom'
  subject?: string
  title?: string
  placeholder?: string
  onError?: (message: string, detail?: unknown) => void
}

interface WidgetSession {
  conversationId: string
  visitorToken: string
}

type WidgetMessage = {
  role: 'visitor' | 'agent' | 'bot' | 'system'
  content: string
}

type WidgetQuickReply = {
  label: string
  text: string
  store_id?: string
}

const DEFAULT_TITLE = '在线客服'
const DEFAULT_PLACEHOLDER = '请输入您要咨询的问题'

function normalizeBaseUrl(baseUrl?: string) {
  if (baseUrl)
    return baseUrl.replace(/\/$/, '')
  if (typeof window === 'undefined')
    return ''
  return window.location.origin
}

function wsBaseFromApi(baseUrl: string, explicit?: string) {
  const source = explicit || baseUrl
  const url = new URL(source || window.location.origin, window.location.origin)
  if (url.protocol === 'https:')
    url.protocol = 'wss:'
  else if (url.protocol === 'http:')
    url.protocol = 'ws:'
  url.pathname = '/ws/visitor/'
  url.search = ''
  return url.toString().replace(/\?$/, '')
}

function getMountNode(mount?: HTMLElement | string) {
  if (mount instanceof HTMLElement)
    return mount
  if (typeof mount === 'string') {
    const node = document.querySelector(mount)
    if (node instanceof HTMLElement)
      return node
  }
  return document.body
}

function getOrCreateVisitorKey(appId: string) {
  const key = `xiaoone.kefu.visitor.${appId}`
  try {
    const existing = window.localStorage.getItem(key)
    if (existing)
      return existing
    const next = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
    window.localStorage.setItem(key, next)
    return next
  }
  catch {
    return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function readErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object')
    return fallback
  const record = body as Record<string, any>
  const code = String(record?.code || record?.data?.error || '').trim()
  const workspaceMessages: Record<string, string> = {
    workspace_suspended: '工作区已冻结或试用已到期，请续费会员后继续使用客服。',
    workspace_provisioning: '工作区正在开通或恢复中，请稍后再试。',
    workspace_failed: '工作区开通失败，请联系商户处理。',
    workspace_deleted: '工作区已注销，客服功能不可用。',
  }
  if (code && workspaceMessages[code])
    return workspaceMessages[code]
  return String(record?.data?.message || record?.message || record?.detail || fallback)
}

function injectWidgetStyle() {
  if (document.getElementById('xiaoone-kefu-widget-style'))
    return
  const style = document.createElement('style')
  style.id = 'xiaoone-kefu-widget-style'
  style.textContent = `
.x1-kefu-widget{position:fixed;right:24px;bottom:24px;z-index:2147483000;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
.x1-kefu-widget.is-left{right:auto;left:24px}
.x1-kefu-widget__bubble{width:56px;height:56px;border:0;border-radius:999px;background:var(--x1-kefu-primary,#6366f1);color:#fff;box-shadow:0 18px 40px rgba(15,23,42,.24);cursor:pointer;font-size:24px}
.x1-kefu-widget__panel{position:absolute;right:0;bottom:72px;width:min(360px,calc(100vw - 32px));height:min(520px,calc(100vh - 120px));display:none;grid-template-rows:auto auto 1fr auto;border:1px solid rgba(148,163,184,.35);border-radius:16px;background:#fff;box-shadow:0 24px 60px rgba(15,23,42,.22);overflow:hidden}
.x1-kefu-widget.is-left .x1-kefu-widget__panel{left:0;right:auto}
.x1-kefu-widget.is-open .x1-kefu-widget__panel{display:grid}
.x1-kefu-widget.is-dark .x1-kefu-widget__panel{background:#111827;color:#f8fafc;border-color:rgba(255,255,255,.12)}
.x1-kefu-widget__head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(148,163,184,.25);font-weight:700}
.x1-kefu-widget__status{font-size:12px;font-weight:500;color:#64748b}
.x1-kefu-widget.is-dark .x1-kefu-widget__status{color:#94a3b8}
.x1-kefu-widget__close{border:0;background:transparent;color:inherit;cursor:pointer;font-size:18px}
.x1-kefu-widget__quick{display:none;gap:8px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.22);background:#fff}
.x1-kefu-widget__quick.has-items{display:flex}
.x1-kefu-widget.is-dark .x1-kefu-widget__quick{background:#111827;border-color:rgba(255,255,255,.12)}
.x1-kefu-widget__quick-btn{border:1px solid rgba(99,102,241,.28);border-radius:999px;background:rgba(99,102,241,.08);color:var(--x1-kefu-primary,#6366f1);padding:6px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.x1-kefu-widget.is-dark .x1-kefu-widget__quick-btn{background:rgba(99,102,241,.18);border-color:rgba(129,140,248,.36);color:#c7d2fe}
.x1-kefu-widget__messages{padding:14px;overflow:auto;background:#f8fafc}
.x1-kefu-widget.is-dark .x1-kefu-widget__messages{background:#020617}
.x1-kefu-widget__msg{max-width:82%;margin:0 0 10px;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid rgba(148,163,184,.25)}
.x1-kefu-widget.is-dark .x1-kefu-widget__msg{background:#1f2937;border-color:rgba(255,255,255,.1)}
.x1-kefu-widget__msg.is-mine{margin-left:auto;background:var(--x1-kefu-primary,#6366f1);color:#fff;border-color:transparent}
.x1-kefu-widget__form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(148,163,184,.25)}
.x1-kefu-widget__input{flex:1;min-width:0;border:1px solid rgba(148,163,184,.45);border-radius:10px;padding:10px 12px;font:inherit;outline:none;background:#fff;color:#0f172a}
.x1-kefu-widget.is-dark .x1-kefu-widget__input{background:#111827;color:#f8fafc;border-color:rgba(255,255,255,.16)}
.x1-kefu-widget__send{border:0;border-radius:10px;padding:0 14px;background:var(--x1-kefu-primary,#6366f1);color:#fff;font-weight:700;cursor:pointer}
`
  document.head.appendChild(style)
}

export function mountXiaooneKefuWidget(options: XiaooneKefuWidgetOptions) {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    throw new Error('Xiaoone kefu widget can only run in a browser.')
  if (!options.appId || !options.apiKey)
    throw new Error('appId and apiKey are required.')

  injectWidgetStyle()

  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl)
  const root = document.createElement('div')
  const primaryColor = '#6366f1'
  root.className = 'x1-kefu-widget'
  root.style.setProperty('--x1-kefu-primary', primaryColor)
  root.innerHTML = `
    <div class="x1-kefu-widget__panel" role="dialog" aria-label="${escapeHtml(options.title || DEFAULT_TITLE)}">
      <div class="x1-kefu-widget__head">
        <span><span data-x1-title>${escapeHtml(options.title || DEFAULT_TITLE)}</span><br><span class="x1-kefu-widget__status" data-x1-status>未连接</span></span>
        <button class="x1-kefu-widget__close" type="button" aria-label="关闭">x</button>
      </div>
      <div class="x1-kefu-widget__quick" data-x1-quick-replies></div>
      <div class="x1-kefu-widget__messages" data-x1-messages></div>
      <form class="x1-kefu-widget__form">
        <input class="x1-kefu-widget__input" data-x1-input autocomplete="off" placeholder="${escapeHtml(options.placeholder || DEFAULT_PLACEHOLDER)}">
        <button class="x1-kefu-widget__send" type="submit">发送</button>
      </form>
    </div>
    <button class="x1-kefu-widget__bubble" type="button" aria-label="${escapeHtml(options.title || DEFAULT_TITLE)}">...</button>
  `
  getMountNode(options.mount).appendChild(root)

  const messagesNode = root.querySelector('[data-x1-messages]') as HTMLElement
  const statusNode = root.querySelector('[data-x1-status]') as HTMLElement
  const titleNode = root.querySelector('[data-x1-title]') as HTMLElement
  const quickRepliesNode = root.querySelector('[data-x1-quick-replies]') as HTMLElement
  const inputNode = root.querySelector('[data-x1-input]') as HTMLInputElement
  const formNode = root.querySelector('form') as HTMLFormElement
  const bubbleNode = root.querySelector('.x1-kefu-widget__bubble') as HTMLButtonElement
  const closeNode = root.querySelector('.x1-kefu-widget__close') as HTMLButtonElement

  let socket: VisitorLiveSocket | null = null
  let session: WidgetSession | null = null
  let sessionPromise: Promise<WidgetSession> | null = null
  let destroyed = false
  let quickRepliesLoaded = false

  function setStatus(value: string) {
    statusNode.textContent = value
  }

  function renderMessage(message: WidgetMessage) {
    const node = document.createElement('div')
    node.className = `x1-kefu-widget__msg${message.role === 'visitor' ? ' is-mine' : ''}`
    node.textContent = message.content
    messagesNode.appendChild(node)
    messagesNode.scrollTop = messagesNode.scrollHeight
  }

  function applyAppearance(appearance?: Record<string, string>) {
    if (!appearance)
      return
    const color = /^#[0-9a-f]{6}$/i.test(appearance.primary_color || '') ? appearance.primary_color : primaryColor
    root.style.setProperty('--x1-kefu-primary', color)
    root.classList.toggle('is-left', appearance.bubble_position === 'bottom-left')
    root.classList.toggle('is-dark', appearance.theme === 'dark')
    if (appearance.status_waiting_label)
      titleNode.textContent = appearance.status_waiting_label
    if (appearance.welcome_message)
      renderMessage({ role: 'bot', content: appearance.welcome_message })
  }

  function renderQuickReplies(items: WidgetQuickReply[]) {
    quickRepliesNode.innerHTML = ''
    const usable = items.filter(item => (item.text || '').trim()).slice(0, 10)
    quickRepliesNode.classList.toggle('has-items', usable.length > 0)
    for (const item of usable) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'x1-kefu-widget__quick-btn'
      button.textContent = item.label || item.text
      button.title = item.text
      button.addEventListener('click', () => {
        void sendMessage(item.text).catch((err) => {
          const message = err instanceof Error ? err.message : '消息发送失败'
          setStatus(message)
          options.onError?.(message, err)
        })
      })
      quickRepliesNode.appendChild(button)
    }
  }

  async function requestJson(path: string, payload?: Record<string, unknown>) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok)
      throw new Error(readErrorMessage(body, '客服服务暂时不可用'))
    return body?.data || body
  }

  async function loadQuickReplies() {
    if (quickRepliesLoaded || destroyed)
      return
    quickRepliesLoaded = true
    try {
      const data = await requestJson('/api/v1/kefu/visitor/quick-replies/', {
        app_id: options.appId,
        api_key: options.apiKey,
        limit: 10,
      })
      const items = Array.isArray(data?.items) ? data.items : []
      renderQuickReplies(items)
    }
    catch (err) {
      quickRepliesLoaded = false
      options.onError?.('快捷问题加载失败', err)
    }
  }

  async function ensureSession() {
    if (session)
      return session
    if (sessionPromise)
      return sessionPromise
    sessionPromise = (async () => {
      setStatus('连接中')
      const data = await requestJson('/api/v1/chat/visitor/handshake/', {
        app_id: options.appId,
        api_key: options.apiKey,
        visitor_name: options.visitorName || '',
        visitor_key: options.visitorKey || getOrCreateVisitorKey(options.appId),
        visitor_email: options.visitorEmail || '',
        locale: options.locale || navigator.language || 'zh-CN',
        channel: options.channel || 'official_site',
        subject: options.subject || '',
      })
      session = {
        conversationId: data.conversation.id,
        visitorToken: data.visitor_token,
      }
      setStatus('已连接')
      applyAppearance(data.sdk_appearance)
      void loadQuickReplies()
      connectSocket()
      return session
    })()
    try {
      return await sessionPromise
    }
    finally {
      sessionPromise = null
    }
  }

  function connectSocket() {
    if (!session)
      return
    socket?.close()
    const wsBaseUrl = wsBaseFromApi(apiBaseUrl, options.wsBaseUrl)
    socket = new VisitorLiveSocket({
      url: () => {
        const url = new URL(wsBaseUrl)
        url.searchParams.set('conversation', session!.conversationId)
        url.searchParams.set('token', session!.visitorToken)
        return url.toString()
      },
      handlers: {
        onJson: (payload) => {
          if (payload.type === 'message') {
            const data = payload.data as any
            const msg = data?.message || data
            if (msg?.sender_role === 'visitor') return
            if (msg?.content || msg?.visitor_content)
              renderMessage({
                role: msg.sender_role || 'bot',
                content: String(msg.visitor_content || msg.content),
              })
          }
          if (payload.type === 'state') {
            const state = (payload.data as any)?.conversation?.state
            if (state === 'active') setStatus('人工客服已接入')
            else if (state === 'closed') setStatus('会话已归档')
          }
        },
        onClose: () => setStatus('实时通道重连中'),
        onOpen: () => setStatus('已连接'),
      },
    })
    socket.connect()
  }

  async function sendMessage(content: string) {
    const current = await ensureSession()
    const clientMessageId = `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`
    renderMessage({ role: 'visitor', content })
    if (socket?.isOpen()) {
      socket.send({
        type: 'visitor.send',
        content,
        client_message_id: clientMessageId,
      })
      return
    }
    const data = await requestJson('/api/v1/chat/visitor/messages/', {
      conversation: current.conversationId,
      token: current.visitorToken,
      content,
      client_message_id: clientMessageId,
    })
    const messages = Array.isArray(data.messages) ? data.messages : [data.auto_reply, data.message, data].filter(Boolean)
    for (const item of messages) {
      if (item?.sender_role !== 'visitor' && (item?.content || item?.visitor_content))
        renderMessage({
          role: item.sender_role || 'bot',
          content: String(item.visitor_content || item.content),
        })
    }
  }

  bubbleNode.addEventListener('click', () => {
    root.classList.toggle('is-open')
    if (root.classList.contains('is-open'))
      void ensureSession().catch((err) => {
        const message = err instanceof Error ? err.message : '客服服务暂时不可用'
        setStatus(message)
        options.onError?.(message, err)
      })
  })
  closeNode.addEventListener('click', () => root.classList.remove('is-open'))
  formNode.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = inputNode.value.trim()
    if (!text)
      return
    inputNode.value = ''
    void sendMessage(text).catch((err) => {
      const message = err instanceof Error ? err.message : '消息发送失败'
      setStatus(message)
      options.onError?.(message, err)
    })
  })

  return {
    open: () => {
      if (!destroyed) {
        root.classList.add('is-open')
        void ensureSession()
      }
    },
    close: () => root.classList.remove('is-open'),
    destroy: () => {
      destroyed = true
      socket?.close()
      root.remove()
    },
  }
}
