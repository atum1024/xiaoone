import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useTeamChatRuntime } from './TeamChatContext'
import { useStore } from 'zustand'
import { TeamChatMessage, TeamChatAttachment, TeamConversation } from '@xiaoone/chat-kit'
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Input } from '@xiaoone/react-ui'

export function TeamChatThread({ convId }: { convId: string }) {
  const runtime = useTeamChatRuntime()
  const store = useStore(runtime.storeApi)
  const prefs = runtime.prefs
  const identity = runtime.identity
  const myUserId = identity.id || 0
  const myName = identity.name || identity.email?.split('@')[0] || '我'

  const [messages, setMessages] = useState<TeamChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFilePreview, setPendingFilePreview] = useState('')
  const [pendingTextCmid, setPendingTextCmid] = useState('')
  const [pendingFileCmid, setPendingFileCmid] = useState('')

  const [imageObjectUrls, setImageObjectUrls] = useState<Record<string, string>>({})
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null)
  const [downloadFile, setDownloadFile] = useState<TeamChatAttachment | null>(null)
  const [textFile, setTextFile] = useState<TeamChatAttachment | null>(null)
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)
  
  const [summaryDialogVisible, setSummaryDialogVisible] = useState(false)
  const [summarySearch, setSummarySearch] = useState('')
  const [summaryStartId, setSummaryStartId] = useState('')
  const [summaryEndId, setSummaryEndId] = useState('')
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const messageScroller = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const pollTimerRef = useRef<number | null>(null)

  const conversation = useMemo(() => store.conversations.find(c => c.id === convId) || null, [store.conversations, convId])

  const teamMuteMenuLabel = conversation && prefs.teamConvIsMuted(conversation.id) ? '取消免打扰' : '免打扰'
  const isGroupAdmin = conversation?.kind === 'group' && (conversation.admin_user_id || conversation.created_by_user_id) === myUserId
  const otherMembers = useMemo(() => conversation?.members.filter(m => m.user_id !== myUserId) || [], [conversation, myUserId])
  
  const headerSubtitle = useMemo(() => {
    if (!conversation) return ''
    if (conversation.kind === 'dm') return otherMembers[0]?.user_name || '私聊'
    return `${conversation.members.length} 人 · ${otherMembers.map(m => m.user_name).slice(0, 4).join(' / ')}${otherMembers.length > 4 ? ' …' : ''}`
  }, [conversation, otherMembers])

  const summaryMessages = useMemo(() => messages.filter(m => m.kind !== 'system'), [messages])

  const summaryMessageText = (msg: TeamChatMessage) => {
    if (msg.kind === 'text') return msg.content || ''
    if (msg.attachment) return msg.attachment.name || (msg.kind === 'image' ? '图片' : '文件')
    return msg.content || msg.kind
  }

  const filteredSummaryMessages = useMemo(() => {
    const q = summarySearch.trim().toLowerCase()
    if (!q) return summaryMessages
    return summaryMessages.filter(m => summaryMessageText(m).toLowerCase().includes(q) || (m.sender_name || '').toLowerCase().includes(q))
  }, [summaryMessages, summarySearch])

  const summaryRange = useMemo(() => {
    const a = summaryMessages.findIndex(m => m.id === summaryStartId)
    const b = summaryMessages.findIndex(m => m.id === summaryEndId)
    if (a < 0 || b < 0) return []
    const start = Math.min(a, b)
    const end = Math.max(a, b)
    return summaryMessages.slice(start, end + 1)
  }, [summaryMessages, summaryStartId, summaryEndId])

  const canCreateSummary = conversation?.kind === 'group' && summaryStartId && summaryEndId && summaryRange.length > 0 && !summarizing

  const freshCmid = () => `team-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const scrollToBottom = () => {
    if (messageScroller.current) messageScroller.current.scrollTop = messageScroller.current.scrollHeight
  }

  const ensureAttachmentBlobUrl = async (att: TeamChatAttachment) => {
    if (imageObjectUrls[att.id]) return imageObjectUrls[att.id]
    const blob = await runtime.api.download(att.id)
    const url = URL.createObjectURL(blob)
    setImageObjectUrls(prev => ({ ...prev, [att.id]: url }))
    return url
  }

  const hydrateImageUrls = async (list: TeamChatMessage[]) => {
    const images = list.map(m => m.kind === 'image' ? m.attachment : null).filter((att): att is TeamChatAttachment => !!att && !imageObjectUrls[att.id])
    await Promise.all(images.map(att => ensureAttachmentBlobUrl(att).catch(() => '')))
  }

  const loadMessages = async () => {
    if (!convId) return
    setLoading(true)
    try {
      const res = await runtime.api.listMessages(convId)
      setMessages(res)
      hydrateImageUrls(res).catch(() => {})
      setTimeout(scrollToBottom, 50)
      runtime.api.markRead(convId).catch(() => {})
      runtime.storeApi.getState().bumpRead(convId)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '加载消息失败')
    } finally {
      setLoading(false)
    }
  }

  const pollIncremental = async () => {
    if (!convId) return
    try {
      const last = messages[messages.length - 1]
      const incoming = await runtime.api.listMessages(convId, last?.id ? { after_id: last.id } : undefined)
      if (incoming.length) {
        setMessages(prev => {
          const seen = new Set(prev.map(m => m.id))
          const adds = incoming.filter(m => !seen.has(m.id))
          if (adds.length) {
            const next = [...prev, ...adds]
            hydrateImageUrls(adds).catch(() => {})
            setTimeout(scrollToBottom, 50)
            runtime.api.markRead(convId).catch(() => {})
            runtime.storeApi.getState().bumpRead(convId)
            return next
          }
          return prev
        })
      }
      runtime.storeApi.getState().fetch(true).catch(() => {})
    } catch {}
  }

  const startPolling = () => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
    pollTimerRef.current = window.setInterval(pollIncremental, 3000)
  }

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  useEffect(() => {
    setMessages([])
    if (!convId) return
    runtime.storeApi.getState().fetch(true)
    loadMessages()
    if (store.realtimeConnected) stopPolling()
    else startPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId])

  useEffect(() => {
    if (!convId) return
    if (store.realtimeConnected) {
      pollIncremental().finally(() => stopPolling())
    } else {
      startPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.realtimeConnected])

  useEffect(() => {
    if (!convId || store.lastRealtimeConvId !== convId) return
    if (store.lastRealtimeType === 'team_message' && store.lastRealtimeMessage) {
      const msg = store.lastRealtimeMessage
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        const next = [...prev, msg]
        hydrateImageUrls([msg]).catch(() => {})
        setTimeout(scrollToBottom, 50)
        runtime.api.markRead(convId).catch(() => {})
        runtime.storeApi.getState().bumpRead(convId)
        return next
      })
      return
    }
    pollIncremental()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.realtimeRevision])

  useEffect(() => {
    return () => {
      stopPolling()
      if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview)
      Object.values(imageObjectUrls).forEach(url => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmtDate = (d: string) => {
    if (!d) return ''
    const t = new Date(d).getTime()
    if (!t || Number.isNaN(t)) return ''
    const now = Date.now()
    const diff = now - t
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} 分钟前`
    const date = new Date(t)
    const sameDay = new Date(now).toDateString() === date.toDateString()
    if (sameDay) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(2)} MB`
  }

  const avatarOf = (name: string | undefined) => (name || '?').slice(0, 1).toUpperCase()
  const isMine = (msg: TeamChatMessage) => msg.sender_user_id === myUserId

  const send = async () => {
    const text = draft.trim()
    const file = pendingFile
    if ((!text && !file) || !convId) return
    setSending(true)
    try {
      let fileMsg: TeamChatMessage | undefined
      let textMsg: TeamChatMessage | undefined
      
      if (file) {
        if (!pendingFileCmid) setPendingFileCmid(freshCmid())
        const att = await runtime.api.upload(file)
        fileMsg = await runtime.api.sendMessage(convId, {
          kind: att.is_image ? 'image' : 'file',
          attachment_id: att.id,
          sender_name: myName,
          client_message_id: pendingFileCmid || freshCmid(),
        })
        setPendingFile(null)
        setPendingFilePreview('')
        setPendingFileCmid('')
      }
      if (text) {
        if (!pendingTextCmid) setPendingTextCmid(freshCmid())
        textMsg = await runtime.api.sendMessage(convId, {
          kind: 'text',
          content: text,
          sender_name: myName,
          client_message_id: pendingTextCmid || freshCmid(),
        })
        setPendingTextCmid('')
      }
      
      setMessages(prev => {
        const adds = [fileMsg, textMsg].filter((m): m is TeamChatMessage => !!m && !prev.some(x => x.id === m.id))
        if (!adds.length) return prev
        hydrateImageUrls(adds).catch(() => {})
        setTimeout(scrollToBottom, 50)
        return [...prev, ...adds]
      })
      setDraft('')
      runtime.storeApi.getState().fetch(true).catch(() => {})
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '发送失败')
    } finally {
      setSending(false)
    }
  }

  const onComposerEnter = (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.shiftKey) return
    ev.preventDefault()
    send()
  }

  const renameGroup = async () => {
    if (!conversation || !newTitle.trim()) return
    try {
      const updated = await runtime.api.updateConversation(conversation.id, { title: newTitle.trim() })
      runtime.storeApi.getState().upsert(updated)
      toast.success('群名称已更新')
      setRenameDialogOpen(false)
    } catch {
      toast.error('修改失败')
    }
  }

  const summarizeGroup = async () => {
    if (!conversation || conversation.kind !== 'group' || !canCreateSummary) return
    setSummarizing(true)
    try {
      const { message } = await runtime.api.summarize(conversation.id, {
        start_message_id: summaryRange[0]?.id,
        end_message_id: summaryRange[summaryRange.length - 1]?.id,
      })
      setMessages(prev => [...prev, message])
      setSummaryDialogVisible(false)
      setSummaryStartId('')
      setSummaryEndId('')
      setTimeout(scrollToBottom, 50)
      runtime.storeApi.getState().fetch(true).catch(() => {})
      toast.success('AI梳理文档已保存到团队文件')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'AI梳理失败')
    } finally {
      setSummarizing(false)
    }
  }

  const onFileSelected = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    if (!file || !convId) return
    if (file.size > 20 * 1024 * 1024) {
      toast.warning('文件不能超过 20MB')
      ev.target.value = ''
      return
    }
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview)
    setPendingFile(file)
    setPendingFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
    ev.target.value = ''
  }

  const clearPendingFile = () => {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview)
    setPendingFile(null)
    setPendingFilePreview('')
    setPendingFileCmid('')
  }

  return (
    <section className="tct">
      <header className="tct-head">
        <div className="tct-head-left">
          <span className={`tct-ava ${conversation?.kind === 'group' ? 'group' : ''}`}>
            {conversation?.kind === 'group' ? <Icon name="users" size={14} /> : <span>{avatarOf(conversation?.title)}</span>}
          </span>
          <strong className="tct-head-title">{conversation?.title || '对话'}</strong>
          {headerSubtitle && <span className="tct-head-sub">· {headerSubtitle}</span>}
        </div>
        <div className="tct-head-right">
          {conversation?.kind === 'group' && (
            <button type="button" className="tct-ai" disabled={summarizing} onClick={() => {
              if (!summaryMessages.length) return toast.warning('当前群聊还没有可梳理的消息')
              setSummarySearch('')
              setSummaryStartId(summaryMessages[0]?.id || '')
              setSummaryEndId(summaryMessages[summaryMessages.length - 1]?.id || '')
              setSummaryDialogVisible(true)
            }}>
              <Icon name="sparkles" size={13} />
              <span>{summarizing ? '梳理中' : 'AI梳理'}</span>
            </button>
          )}
          {isGroupAdmin && (
            <button type="button" className="tct-rename" onClick={() => { setNewTitle(conversation.title || ''); setRenameDialogOpen(true); }}>
              改名
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tct-more" type="button" aria-label="更多"><Icon name="more-horizontal" size={14} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isGroupAdmin && <DropdownMenuItem onClick={() => { setNewTitle(conversation.title || ''); setRenameDialogOpen(true); }}>修改群名称</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => {
                if (!conversation) return
                prefs.toggleMuteTeamConv(conversation.id)
                toast.success(!prefs.teamConvIsMuted(conversation.id) ? '已开启免打扰' : '已关闭免打扰')
              }}>{teamMuteMenuLabel}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-xs px-2 py-0.5 rounded-full border border-current opacity-70 ml-1">
            {conversation?.kind === 'dm' ? '私聊' : '群聊'}
          </span>
        </div>
      </header>

      <div ref={messageScroller} className="tct-stream">
        {loading && <div className="tct-loading">加载消息…</div>}
        {!loading && !messages.length && (
          <div className="tct-empty">
            <Icon name="message-square" size={20} />
            <span>发条消息开启对话吧</span>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`msg ${isMine(m) ? 'mine' : ''} ${m.kind === 'system' ? 'system' : ''}`}>
            {m.kind !== 'system' ? (
              <>
                {!isMine(m) && <span className="msg-ava">{avatarOf(m.sender_name)}</span>}
                <div className="msg-bubble-wrap">
                  {!isMine(m) && (
                    <div className="msg-meta">
                      <strong>{m.sender_name}</strong>
                      <small>{fmtDate(m.created_at)}</small>
                    </div>
                  )}
                  <div className={`msg-bubble kind-${m.kind}`}>
                    {m.kind === 'text' ? (
                      <span className="msg-text">{m.content}</span>
                    ) : m.kind === 'image' && m.attachment ? (
                      <button type="button" className="msg-image-link" onClick={() => {
                        ensureAttachmentBlobUrl(m.attachment!).then(url => setImagePreview({ url, name: m.attachment!.name })).catch(() => toast.error('图片加载失败'))
                      }}>
                        {imageObjectUrls[m.attachment.id] ? <img src={imageObjectUrls[m.attachment.id]} alt={m.attachment.name} /> : <span className="msg-image-loading">图片加载中</span>}
                      </button>
                    ) : m.attachment ? (
                      <button type="button" className="msg-file" onClick={() => {
                        const isText = (m.attachment!.content_type || '').startsWith('text/') || /\.(md|json|csv|yaml|yml|log|txt)$/i.test(m.attachment!.name || '')
                        if (isText) {
                          setTextFile(m.attachment!)
                          setTextLoading(true)
                          runtime.api.readTextFile(m.attachment!.id).then(r => setTextContent(r.content)).catch(() => toast.error('打开失败')).finally(() => setTextLoading(false))
                        } else {
                          setDownloadFile(m.attachment!)
                        }
                      }}>
                        <Icon name="package" size={20} />
                        <div>
                          <strong>{m.attachment.name}</strong>
                          <small>{fmtSize(m.attachment.size)} · {m.attachment.content_type}</small>
                        </div>
                      </button>
                    ) : null}
                  </div>
                  {isMine(m) && <small className="msg-time mine">{fmtDate(m.created_at)}</small>}
                </div>
              </>
            ) : (
              <small className="msg-system">{m.content}</small>
            )}
          </div>
        ))}
      </div>

      <div className="tct-foot">
        <div className={`tct-cx ${sending ? 'is-loading' : ''}`}>
          {pendingFile && (
            <div className="tct-pending">
              {pendingFilePreview ? (
                <img className="tct-pending-img" src={pendingFilePreview} alt={pendingFile.name} />
              ) : (
                <span className="tct-pending-icon"><Icon name="package" size={16} /></span>
              )}
              <div className="tct-pending-meta">
                <strong>{pendingFile.name}</strong>
                <small>{fmtSize(pendingFile.size)} · {pendingFile.type || '未知类型'}</small>
              </div>
              <button className="tct-pending-x" type="button" onClick={clearPendingFile}>×</button>
            </div>
          )}
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="tct-cx-text"
            rows={1}
            placeholder="说点什么…  Shift+Enter 换行 · Enter 发送"
            onKeyDown={onComposerEnter}
          />
          <div className="tct-cx-bar">
            <div className="tct-cx-left">
              <span className="tct-cx-hint">
                <Icon name={conversation?.kind === 'group' ? 'users' : 'user'} size={11} />
                {conversation?.kind === 'group' ? '群聊' : '私聊'} · {conversation?.title || '对话'}
              </span>
            </div>
            <div className="tct-cx-right">
              <input ref={fileInput} type="file" className="tct-file-input" onChange={onFileSelected} />
              <button className="tct-attach-btn" type="button" title="附加文件" onClick={() => fileInput.current?.click()}>
                <Icon name="paperclip" size={13} />
                <span className="tct-attach-label">附件</span>
              </button>
              <button
                className={`tct-cx-send ${(!!draft.trim() || !!pendingFile) && !sending ? 'is-active' : ''}`}
                type="button"
                disabled={sending}
                onClick={send}
              >
                {!sending ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
                ) : (
                  <span className="tct-cx-spinner" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>修改群名称</DialogTitle></DialogHeader>
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="群名称" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>取消</Button>
            <Button onClick={renameGroup}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryDialogVisible} onOpenChange={setSummaryDialogVisible}>
        <DialogContent className="max-w-[760px] w-[92vw]">
          <DialogHeader><DialogTitle>选择AI梳理范围</DialogTitle></DialogHeader>
          <div className="tct-summary-tools">
            <Input value={summarySearch} onChange={e => setSummarySearch(e.target.value)} placeholder="搜索发送人、文本、文件名" className="tct-summary-search" />
            <span className="tct-summary-count">已选 {summaryRange.length} 条，包含起点和终点</span>
          </div>
          <div className="tct-summary-list">
            {filteredSummaryMessages.length ? filteredSummaryMessages.map(m => (
              <div key={m.id} className={`tct-summary-item ${summaryStartId === m.id ? 'is-start' : ''} ${summaryEndId === m.id ? 'is-end' : ''} ${summaryRange.some(x => x.id === m.id) ? 'is-in-range' : ''}`}>
                <div className="tct-summary-main">
                  <strong>{m.sender_name || '成员'}</strong>
                  <span>{summaryMessageText(m)}</span>
                  <small>{fmtDate(m.created_at)}</small>
                </div>
                <div className="tct-summary-actions">
                  <button type="button" onClick={() => { setSummaryStartId(m.id); if (!summaryEndId) setSummaryEndId(m.id); }}>设为起点</button>
                  <button type="button" onClick={() => { setSummaryEndId(m.id); if (!summaryStartId) setSummaryStartId(m.id); }}>设为终点</button>
                </div>
              </div>
            )) : <div className="tct-summary-empty">没有匹配的消息</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryDialogVisible(false)}>取消</Button>
            <Button disabled={!canCreateSummary} onClick={summarizeGroup}>生成梳理文档</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={open => !open && setImagePreview(null)}>
          <DialogContent className="max-w-[860px] w-[92vw]">
            <DialogHeader><DialogTitle>{imagePreview.name}</DialogTitle></DialogHeader>
            <img className="tct-image-large" src={imagePreview.url} alt={imagePreview.name} />
          </DialogContent>
        </Dialog>
      )}

      {downloadFile && (
        <Dialog open={!!downloadFile} onOpenChange={open => !open && setDownloadFile(null)}>
          <DialogContent className="max-w-[460px] w-[92vw]">
            <DialogHeader><DialogTitle>文件下载</DialogTitle></DialogHeader>
            <div className="tct-file-detail">
              <Icon name="package" size={22} />
              <div>
                <strong>{downloadFile.name}</strong>
                <small>{fmtSize(downloadFile.size)} · {downloadFile.content_type}</small>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDownloadFile(null)}>取消</Button>
              <Button onClick={() => {
                runtime.api.download(downloadFile.id).then(blob => {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = downloadFile.name || 'download'; a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 1000)
                }).catch(() => toast.error('下载失败'))
                setDownloadFile(null)
              }}>下载</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {textFile && (
        <Dialog open={!!textFile} onOpenChange={open => !open && setTextFile(null)}>
          <DialogContent className="max-w-[860px] w-[92vw]">
            <DialogHeader><DialogTitle>{textFile.name}</DialogTitle></DialogHeader>
            {textLoading ? <div className="tct-text-loading">加载中…</div> : <pre className="tct-text-content">{textContent}</pre>}
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
