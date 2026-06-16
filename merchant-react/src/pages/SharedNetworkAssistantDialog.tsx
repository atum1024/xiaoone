import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { getChatKit, type AgentThread } from '@xiaoone/chat-kit'
import { Icon } from '../components/Icon'
import './shared-network-assistant-dialog.css'

interface SharedNetworkAssistantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FAQS = [
  '专属业务节点适合哪些访问环境？',
  '内容训练需要准备什么资料？',
  '内容发布前怎么检查访问环境？',
]

const ACCELERATOR_TITLE = '业务访问支持'
const ACCELERATOR_SERVICE_TYPE = 'mkt-cdn'
const ACCELERATOR_MODEL_KEY = 'doubao-2.0-lite'

type DialogMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ServiceCaseSnapshot = {
  id: string
  assigned_platform_user_id?: unknown
  ai_reply_enabled?: unknown
}

const INITIAL_MESSAGES: DialogMessage[] = [
  {
    id: 'intro',
    role: 'assistant',
    content: '我是业务访问支持助手。Flash4 会先处理网络、内容训练和发布准备问题；运营端可随时接管继续服务。',
  },
]

export function SharedNetworkAssistantDialog({ open, onOpenChange }: SharedNetworkAssistantDialogProps) {
  const [messages, setMessages] = useState<DialogMessage[]>(INITIAL_MESSAGES)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [manualTakeover, setManualTakeover] = useState(false)
  const [serviceCaseId, setServiceCaseId] = useState<string>('')
  const threadRef = useRef<AgentThread | null>(null)
  const serviceCaseRef = useRef<ServiceCaseSnapshot | null>(null)
  const contextPromiseRef = useRef<Promise<AgentThread> | null>(null)
  const messageIdsRef = useRef<Set<string>>(new Set(['intro']))
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending])

  function addMessage(message: DialogMessage) {
    if (messageIdsRef.current.has(message.id)) return
    messageIdsRef.current.add(message.id)
    setMessages(current => [...current, message])
  }

  function replaceMessage(id: string, patch: Partial<DialogMessage>) {
    setMessages(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function rememberCase(serviceCase: ServiceCaseSnapshot | null | undefined) {
    if (!serviceCase) return
    serviceCaseRef.current = serviceCase
    setServiceCaseId(serviceCase.id)
    setManualTakeover(Boolean(serviceCase.assigned_platform_user_id && serviceCase.ai_reply_enabled === false))
  }

  async function refreshServiceCase(threadId: string) {
    try {
      const detail = await getChatKit().AgentThreadAPI.detail(threadId)
      rememberCase(detail.service_case)
    } catch {
      // Service case refresh is best-effort; the dialog can still continue with AI replies.
    }
  }

  async function ensureServiceContext() {
    if (threadRef.current)
      return threadRef.current
    if (contextPromiseRef.current)
      return contextPromiseRef.current

    contextPromiseRef.current = (async () => {
      const { AgentThreadAPI, ServiceCaseAPI } = getChatKit()
      const thread = await AgentThreadAPI.create({
        domain: 'support',
        title: ACCELERATOR_TITLE,
        plugin_key: ACCELERATOR_SERVICE_TYPE,
        mode_key: '',
        model_key: ACCELERATOR_MODEL_KEY,
      })
      threadRef.current = thread

      try {
        const serviceCase = await ServiceCaseAPI.create({
          thread: thread.id,
          service_type: ACCELERATOR_SERVICE_TYPE,
          title: ACCELERATOR_TITLE,
          domain: 'support',
        })
        rememberCase(serviceCase)
      } catch {
        // The first chat message also creates the support service case server-side.
      }
      return thread
    })()

    try {
      return await contextPromiseRef.current
    } finally {
      contextPromiseRef.current = null
    }
  }

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
      setSending(false)
      return
    }
    void ensureServiceContext().catch((e: any) => {
      toast({ title: '业务访问支持对话暂不可用', description: e?.message || '请稍后重试' })
    })
  }, [open])

  useEffect(() => {
    if (!open || !serviceCaseId) return
    const socket = getChatKit().createServiceCaseLiveSocket(serviceCaseId, {
      onMessage: (env) => {
        rememberCase(env.case)
        const message = env.message
        if (message.role === 'user') return
        addMessage({
          id: `case:${message.id}`,
          role: 'assistant',
          content: String(message.content || ''),
        })
      },
      onState: (env) => {
        rememberCase(env.case)
      },
      onReady: (caseData) => {
        rememberCase(caseData)
      },
    })
    socket.connect()
    return () => socket.close()
  }, [open, serviceCaseId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, sending])

  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text || sending) return
    const userMessage: DialogMessage = { id: `local-user:${Date.now()}`, role: 'user', content: text }
    addMessage(userMessage)
    setDraft('')
    setSending(true)
    const streamMessageId = `local-assistant:${Date.now()}`
    addMessage({ id: streamMessageId, role: 'assistant', content: '' })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const thread = await ensureServiceContext()
      const { streamThreadChat } = getChatKit()
      let reply = ''
      for await (const event of streamThreadChat(
        thread.id,
        text,
        [],
        ACCELERATOR_MODEL_KEY,
        '',
        null,
        700,
        controller.signal,
      )) {
        if (event.type === 'thread_meta')
          void refreshServiceCase(thread.id)
        if (event.type === 'manual_takeover') {
          const handoff = event.message || '运营人员已接管，AI 暂停自动回复。'
          setManualTakeover(true)
          reply = handoff
          replaceMessage(streamMessageId, { content: handoff })
          continue
        }
        if (event.type === 'error') {
          reply = event.message || '业务访问支持助手暂不可用，已保留在运营服务台。'
          replaceMessage(streamMessageId, { content: reply })
          continue
        }
        if (event.delta) {
          reply += event.delta
          replaceMessage(streamMessageId, { content: reply })
        }
      }
      if (!reply.trim())
        replaceMessage(streamMessageId, { content: '已提交给业务访问支持服务台，运营端可继续接管处理。' })
      void refreshServiceCase(thread.id)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      toast({ title: '业务访问支持助手暂不可用', description: e?.response?.data?.message || e?.message || '请稍后重试' })
      replaceMessage(streamMessageId, { content: '该问题暂时无法处理，已保留在业务访问支持服务台。' })
    } finally {
      setSending(false)
      abortRef.current = null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shared-network-dialog">
        <DialogHeader className="shared-network-dialog__header">
          <DialogTitle className="shared-network-dialog__title">
            <Icon name="globe" size={17} />
            业务访问支持
          </DialogTitle>
          <DialogDescription className="shared-network-dialog__scope">
            Flash4 先接待，运营端可随时接管；开通后可下载 3x-ui 配置文件。
          </DialogDescription>
        </DialogHeader>

        <div className="shared-network-dialog__faq" aria-label="业务访问支持常见问题">
          {FAQS.map(item => (
            <button key={item} type="button" onClick={() => sendMessage(item)} disabled={sending}>
              {item}
            </button>
          ))}
        </div>

        <div className={`shared-network-dialog__handoff${manualTakeover ? ' is-active' : ''}`}>
          {manualTakeover ? '运营人员已接管，Flash4 自动回复已暂停。' : '当前由 Flash4 自动回复，运营端可在服务台接管。'}
        </div>

        <div className="shared-network-dialog__messages" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.id}-${index}`} className={`shared-network-dialog__message is-${message.role}`}>
              <span>{message.content || (message.role === 'assistant' ? '正在生成回复...' : '')}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          className="shared-network-dialog__composer"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend) void sendMessage(draft)
          }}
        >
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            maxLength={4000}
            rows={3}
            placeholder="输入业务访问、专属节点、内容训练或发布准备问题"
          />
          <button type="submit" disabled={!canSend} aria-label="发送">
            <Icon name="send" size={15} />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
