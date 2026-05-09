import { useCallback, useEffect, useRef, useState } from 'react'
import type { DemoVisitorProfile, DemoVisitorProfileKey } from './demoVisitorProfiles'
import { DEMO_VISITOR_PROFILES } from './demoVisitorProfiles'

type LiveMsg = {
  id: string
  sender_role: string
  content: string
  created_at?: string
}

async function parseApi<T>(r: Response): Promise<{ ok: boolean; data?: T; err?: string }> {
  let body: unknown
  try {
    body = await r.json()
  } catch {
    return { ok: false, err: '响应不是 JSON' }
  }
  const o = body as { code?: number; message?: string; data?: T }
  if (!r.ok || (o.code !== undefined && o.code !== 0))
    return { ok: false, err: o.message || `HTTP ${r.status}` }
  return { ok: true, data: o.data }
}

export function DemoOfficialSiteVisitorChat() {
  const [profileKey, setProfileKey] = useState<DemoVisitorProfileKey>('demo-mall')
  const profile = DEMO_VISITOR_PROFILES.find(p => p.key === profileKey) ?? DEMO_VISITOR_PROFILES[0]

  const [session, setSession] = useState<{
    conversationId: string
    token: string
  } | null>(null)
  const [messages, setMessages] = useState<LiveMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchHistory = useCallback(async (conversationId: string, token: string) => {
    const url = `/api/v1/chat/visitor/conversations/${encodeURIComponent(conversationId)}/?token=${encodeURIComponent(token)}`
    const r = await fetch(url, { method: 'GET', credentials: 'same-origin' })
    const parsed = await parseApi<{ messages?: LiveMsg[] }>(r)
    if (!parsed.ok || !parsed.data)
      return
    const items = parsed.data.messages ?? []
    setMessages(items)
  }, [])

  const handshake = useCallback(async (p: DemoVisitorProfile) => {
    setLoading(true)
    setError(null)
    setMessages([])
    setSession(null)
    stopPoll()
    try {
      const r = await fetch('/api/v1/chat/visitor/handshake/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: p.merchantId,
          app_id: p.appId,
          app_secret: p.appSecret,
          visitor_name: `内置演示访客 · ${p.label}`,
          channel: 'web',
          is_demo: true,
        }),
      })
      const parsed = await parseApi<{
        visitor_token?: string
        conversation?: { id?: string }
      }>(r)
      if (!parsed.ok) {
        setError(parsed.err || '握手失败')
        return
      }
      const token = parsed.data?.visitor_token || ''
      const cid = parsed.data?.conversation?.id || ''
      if (!token || !cid) {
        setError('握手返回缺少 visitor_token 或会话 id')
        return
      }
      setSession({ conversationId: cid, token })
      await fetchHistory(cid, token)
      pollRef.current = setInterval(() => {
        fetchHistory(cid, token)
      }, 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [fetchHistory, stopPoll])

  useEffect(() => {
    const p = DEMO_VISITOR_PROFILES.find(x => x.key === profileKey) ?? DEMO_VISITOR_PROFILES[0]
    handshake(p)
    return () => stopPoll()
  }, [profileKey, handshake, stopPoll])

  async function send() {
    const text = draft.trim()
    if (!text || !session) return
    setDraft('')
    setError(null)
    try {
      const r = await fetch('/api/v1/chat/visitor/messages/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: session.conversationId,
          token: session.token,
          content: text,
        }),
      })
      const parsed = await parseApi(r)
      if (!parsed.ok) {
        setError(parsed.err || '发送失败')
        return
      }
      await fetchHistory(session.conversationId, session.token)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="dos-chat" aria-label="访客客服联调">
      <div className="dos-chat-head">
        <div>
          <strong className="dos-chat-title">访客会话（真实 seed 数据）</strong>
          <p className="dos-chat-desc">切换商户将新建会话并出现在对应商户「客户咨询」列表；需本地 BFF / Chat 与 seed_demo 已就绪。</p>
        </div>
      </div>
      <div className="dos-chat-tabs" role="tablist">
        {DEMO_VISITOR_PROFILES.map(p => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={profileKey === p.key}
            className={profileKey === p.key ? 'is-active' : ''}
            onClick={() => setProfileKey(p.key)}
          >
            <span className="dos-chat-tab-label">{p.label}</span>
            <span className="dos-chat-tab-sub">{p.subtitle}</span>
          </button>
        ))}
      </div>
      <div className="dos-chat-panel">
        <div className="dos-chat-meta">
          <span>
            merchant_id <code>{profile.merchantId}</code>
          </span>
          <span className="dos-chat-meta-sep">·</span>
          <span>
            app_id <code>{profile.appId}</code>
          </span>
          {loading ? <span className="dos-chat-status">连接中…</span> : null}
          {session ? <span className="dos-chat-status dos-chat-status--ok">已握手</span> : null}
        </div>
        {error ? <div className="dos-chat-error">{error}</div> : null}
        <div className="dos-chat-msgs" aria-live="polite">
          {messages.length === 0 && !loading ? (
            <p className="dos-chat-empty">暂无消息，发送一条后将写入当前商户的真实会话。</p>
          ) : null}
          {messages.map(m => (
            <div
              key={m.id}
              className={[
                'dos-chat-bubble',
                m.sender_role === 'visitor' ? 'is-visitor' : '',
                m.sender_role === 'agent' || m.sender_role === 'bot' ? 'is-agent' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="dos-chat-role">{m.sender_role}</span>
              <p className="dos-chat-text">{m.content}</p>
            </div>
          ))}
        </div>
        <div className="dos-chat-input-row">
          <input
            type="text"
            className="dos-chat-input"
            placeholder={session ? '输入消息后发送到当前商户…' : '等待握手…'}
            value={draft}
            disabled={!session || loading}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <button type="button" className="dos-chat-send" disabled={!session || loading || !draft.trim()} onClick={() => void send()}>
            发送
          </button>
        </div>
      </div>
    </section>
  )
}
