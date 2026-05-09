import { useEffect, useRef, useState, useMemo } from 'react'
import './ChatStream.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, toast } from '@xiaoone/react-ui'
import { Icon } from './Icon'
import { getChatKit, type AgentAttachment, type AgentGenerationTask } from '@xiaoone/chat-kit'
import { authFetch } from '../lib/authFetch'
import { usePreferences } from '../app/preferences'
import { useWorkspaceStore } from '../store/workspace'
import { actionsForErrorCode, localeKeyForErrorCode } from '../lib/agentGenerationErrors'

const { AgentAttachmentAPI } = getChatKit()

export interface UIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  is_streaming?: boolean
  is_mock?: boolean
  generation_tasks?: AgentGenerationTask[]
  attachments?: AgentAttachment[]
}

export interface RouteSuggestionPayload {
  routeTo: 'system' | 'marketing' | 'support' | 'agency' | 'feedback'
  reason: string
  sourceMessageId: string
}

interface Props {
  messages: UIChatMessage[]
  emptyTitle?: string
  emptyHint?: string
  notifyStatusByMessageId?: Record<string, { target: string; status: string }>
  onRetryTask?: (task: AgentGenerationTask) => void
  onRefreshTask?: (task: AgentGenerationTask) => void
  onRouteTo?: (payload: RouteSuggestionPayload) => void
  children?: React.ReactNode
}

const ROUTE_TARGETS = new Set(['system', 'marketing', 'support', 'agency', 'feedback'])

function extractRoutePayload(content: string): { routeTo: RouteSuggestionPayload['routeTo']; reason: string; cleanText: string } | null {
  const trimmed = (content || '').trim()
  if (!trimmed) return null
  const fenced = /<route_to>([\s\S]+?)<\/route_to>/m.exec(trimmed)
  if (fenced?.[1]) {
    try {
      const parsed = JSON.parse(fenced[1]) as { route_to?: string; reason?: string }
      if (!parsed.route_to || !ROUTE_TARGETS.has(parsed.route_to)) return null
      return {
        routeTo: parsed.route_to as RouteSuggestionPayload['routeTo'],
        reason: String(parsed.reason || '').trim(),
        cleanText: trimmed.replace(fenced[0], '').trim(),
      }
    } catch {
      // fallthrough
    }
  }
  const marker = trimmed.lastIndexOf('{"route_to"')
  if (marker < 0) return null
  const raw = trimmed.slice(marker)
  try {
    const parsed = JSON.parse(raw) as { route_to?: string; reason?: string }
    if (!parsed.route_to || !ROUTE_TARGETS.has(parsed.route_to)) return null
    return {
      routeTo: parsed.route_to as RouteSuggestionPayload['routeTo'],
      reason: String(parsed.reason || '').trim(),
      cleanText: trimmed.slice(0, marker).trimEnd(),
    }
  } catch {
    return null
  }
}

function renderMessageText(m: UIChatMessage): string {
  if (m.role !== 'assistant') return m.content || ''
  return extractRoutePayload(m.content || '')?.cleanText || m.content || ''
}

function routeBadgeText(routeTo: RouteSuggestionPayload['routeTo']): string {
  const map: Record<RouteSuggestionPayload['routeTo'], string> = {
    system: '程序员',
    marketing: '推广大师',
    support: '渠道专员',
    agency: '商务经理',
    feedback: '维修工',
  }
  return map[routeTo]
}

function notifyChannelLabel(target: string): string {
  const map: Record<string, string> = {
    telegram: 'Telegram',
    feishu: '飞书',
    wecom: '企业微信',
  }
  return map[target] || target
}

function taskTitle(task: AgentGenerationTask) {
  return task.modality === 'image' ? '图片生成' : '视频生成'
}

function taskStatusLabel(status: AgentGenerationTask['status']) {
  const map: Record<string, string> = {
    draft: '准备生成',
    submitted: '已提交',
    queued: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
    canceled: '已取消',
  }
  return map[status] || status
}

function taskArtifacts(task: AgentGenerationTask): any[] {
  return Array.isArray(task.result?.artifacts) ? task.result!.artifacts : []
}

function taskVideos(task: AgentGenerationTask): string[] {
  const artifacts: string[] = taskArtifacts(task)
    .filter((item: any) => item?.type === 'video' && (item.url || item.uri))
    .map((item: any) => String(item.url || item.uri || ''))
    .filter(Boolean)
  const raw = task.result?.raw || {}
  const samples = raw?.response?.generateVideoResponse?.generatedSamples || raw?.generateVideoResponse?.generatedSamples || raw?.generatedSamples || []
  for (const sample of samples) {
    const video = sample?.video || sample?.videoFile
    const src = typeof video === 'string' ? video : video?.url || video?.uri
    if (src != null && src !== '') artifacts.push(String(src))
  }
  for (const key of ['video_url', 'videoUrl', 'url', 'uri'] as const) {
    const v = raw?.[key]
    if (v != null && v !== '') artifacts.push(String(v))
  }
  return Array.from(new Set(artifacts))
}

function videoKey(task: AgentGenerationTask, index: number) {
  return `${task.id}:${index}`
}

function videoArtifactEndpoint(task: AgentGenerationTask, index: number) {
  return `/api/v1/agent/generation-tasks/${task.id}/artifact/?index=${index}`
}

function artifactSrc(item: any) {
  if (item?.url) return item.url
  if (item?.b64_json) return `data:${item.mime_type || 'image/png'};base64,${item.b64_json}`
  return ''
}

function fileSize(size = 0) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${size || 0} B`
}

function isImageAttachment(att: AgentAttachment) {
  return (att.content_type || '').split(';')[0].trim().toLowerCase().startsWith('image/')
}

function isTextAttachment(att: AgentAttachment) {
  const type = (att.content_type || '').split(';')[0].trim().toLowerCase()
  const name = (att.name || '').toLowerCase()
  return type.startsWith('text/') || ['application/json', 'application/xml', 'application/yaml', 'application/x-yaml'].includes(type) || /\.(cfg|conf|csv|env|ini|json|log|md|markdown|sql|text|toml|tsv|txt|xml|ya?ml)$/.test(name)
}

function isActiveTask(task: AgentGenerationTask) {
  return ['submitted', 'queued', 'running'].includes(task.status)
}

export function ChatStream({
  messages,
  notifyStatusByMessageId,
  onRetryTask,
  onRefreshTask,
  onRouteTo,
  children,
}: Props) {
  const { t } = usePreferences()
  const ws = useWorkspaceStore()
  const scrollerRef = useRef<HTMLDivElement>(null)

  const [videoObjectUrls, setVideoObjectUrls] = useState<Record<string, string>>({})
  const [videoLoading, setVideoLoading] = useState<Record<string, boolean>>({})
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({})
  const [attachmentImageUrls, setAttachmentImageUrls] = useState<Record<string, string>>({})

  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null)
  const [downloadFile, setDownloadFile] = useState<AgentAttachment | null>(null)
  const [textFile, setTextFile] = useState<AgentAttachment | null>(null)
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  const hasMessages = messages.length > 0

  const contentHash = messages.map(m => m.content).join('|')
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [contentHash])

  useEffect(() => {
    const ensureVideoBlob = async (task: AgentGenerationTask, index: number) => {
      const key = videoKey(task, index)
      if (videoObjectUrls[key] || videoLoading[key]) return
      setVideoLoading((prev) => ({ ...prev, [key]: true }))
      try {
        const resp = await authFetch(videoArtifactEndpoint(task, index))
        if (!resp.ok) throw new Error(`视频文件加载失败：${resp.status}`)
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setVideoObjectUrls((prev) => ({ ...prev, [key]: url }))
        setVideoErrors((prev) => {
          const rest = { ...prev }
          delete rest[key]
          return rest
        })
      } catch (e: any) {
        setVideoErrors((prev) => ({ ...prev, [key]: e?.message || '视频文件加载失败' }))
      } finally {
        setVideoLoading((prev) => {
          const rest = { ...prev }
          delete rest[key]
          return rest
        })
      }
    }

    const ensureAttachmentImageUrl = async (att: AgentAttachment) => {
      if (attachmentImageUrls[att.id]) return attachmentImageUrls[att.id]
      try {
        const resp = await authFetch(`/api/v1/agent/attachments/${att.id}/download/`)
        if (!resp.ok) throw new Error('图片加载失败')
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setAttachmentImageUrls((prev) => ({ ...prev, [att.id]: url }))
      } catch {
        // ignore
      }
    }

    messages.forEach(m => {
      m.generation_tasks?.forEach(task => {
        if (task.modality === 'video' && task.status === 'succeeded') {
          taskVideos(task).forEach((_src, index) => ensureVideoBlob(task, index))
        }
      })
      m.attachments?.forEach(att => {
        if (isImageAttachment(att) && !attachmentImageUrls[att.id]) {
          ensureAttachmentImageUrl(att)
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.map(m => `${m.id}:${(m.attachments || []).map(a => `${a.id}:${a.updated_at}`).join(',')}:${(m.generation_tasks || []).map(t => `${t.id}:${t.status}:${t.updated_at}`).join(',')}`).join('|')])

  useEffect(() => {
    return () => {
      Object.values(videoObjectUrls).forEach(URL.revokeObjectURL)
      Object.values(attachmentImageUrls).forEach(URL.revokeObjectURL)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const triggerRoute = (m: UIChatMessage) => {
    const payload = extractRoutePayload(m.content || '')
    if (!payload) return
    onRouteTo?.({ routeTo: payload.routeTo, reason: payload.reason, sourceMessageId: m.id })
  }

  const openAttachment = async (att: AgentAttachment) => {
    if (isImageAttachment(att)) {
      try {
        let url = attachmentImageUrls[att.id]
        if (!url) {
          const resp = await authFetch(`/api/v1/agent/attachments/${att.id}/download/`)
          if (!resp.ok) throw new Error('图片加载失败')
          const blob = await resp.blob()
          url = URL.createObjectURL(blob)
          setAttachmentImageUrls((prev) => ({ ...prev, [att.id]: url }))
        }
        setImagePreview({ url, name: att.name })
      } catch {
        toast.error('图片加载失败')
      }
      return
    }
    if (isTextAttachment(att)) {
      setTextFile(att)
      setTextContent('')
      setTextLoading(true)
      try {
        const r = await AgentAttachmentAPI.readTextFile(att.id)
        setTextFile(r.attachment)
        setTextContent(r.content)
      } catch (e: any) {
        setTextFile(null)
        toast.error(e?.response?.data?.message || '打开文本文件失败')
      } finally {
        setTextLoading(false)
      }
      return
    }
    setDownloadFile(att)
  }

  const downloadAttachment = async (att: AgentAttachment) => {
    try {
      const resp = await authFetch(`/api/v1/agent/attachments/${att.id}/download/`)
      if (!resp.ok) throw new Error('下载失败')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = att.name || 'attachment'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDownloadFile(null)
    } catch {
      toast.error('下载失败')
    }
  }

  const copyTaskPrompt = async (task: AgentGenerationTask) => {
    try {
      await navigator.clipboard.writeText(task.prompt || '')
      toast.success('已复制提示词')
    } catch {}
  }

  const taskErrorText = (task: AgentGenerationTask) => {
    if (task.error_code) return t(localeKeyForErrorCode(task.error_code))
    return task.error_message || ''
  }

  const gotoRecharge = () => {
    ws.showAccount?.('wallet')
  }

  const videoPlaybackSrc = (task: AgentGenerationTask, rawSrc: string, index: number) => {
    const local = videoObjectUrls[videoKey(task, index)]
    if (local) return local
    return rawSrc.includes('generativelanguage.googleapis.com') ? '' : rawSrc
  }

  const videoPlaybackState = (task: AgentGenerationTask, index: number) => {
    const key = videoKey(task, index)
    if (videoErrors[key]) return videoErrors[key]
    if (videoLoading[key]) return '视频文件准备中...'
    return ''
  }

  return (
    <>
      <div ref={scrollerRef} className="chat-scroller">
        {hasMessages ? (
          messages.map((m) => (
            <div key={m.id} className={`msg-row is-${m.role}`}>
              {m.role === 'assistant' && (
                <div className="msg-avatar is-ai">
                  <Icon name="sparkles" size={14} />
                </div>
              )}
              <div className="msg-col">
                {m.role === 'assistant' && (
                  <div className="msg-meta">
                    <span className="msg-role">Xiaoone</span>
                    {m.is_mock && <span className="msg-mock">mock</span>}
                  </div>
                )}
                <div className={`msg-bubble ${m.is_streaming ? 'is-streaming' : ''}`}>
                  <pre>{renderMessageText(m) || (m.is_streaming ? '…' : '')}</pre>
                </div>
                {m.role === 'assistant' && extractRoutePayload(m.content || '') && (
                  <div className="route-chip-wrap">
                    <button type="button" className="route-chip" onClick={() => triggerRoute(m)}>
                      <Icon name="link" size={12} />
                      打开{routeBadgeText(extractRoutePayload(m.content || '')!.routeTo)}会话
                    </button>
                    {extractRoutePayload(m.content || '')!.reason && (
                      <small>{extractRoutePayload(m.content || '')!.reason}</small>
                    )}
                  </div>
                )}
                {m.role === 'assistant' && notifyStatusByMessageId?.[m.id] && (
                  <div className="route-chip-wrap">
                    <span className="route-chip">
                      <Icon name="send" size={12} />
                      已提交到{notifyChannelLabel(notifyStatusByMessageId[m.id].target)}通知队列
                    </span>
                    <small>OpenClaw 预留接入 · {notifyStatusByMessageId[m.id].status}</small>
                  </div>
                )}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="msg-files">
                    {m.attachments.map((att) =>
                      isImageAttachment(att) ? (
                        <button key={att.id} type="button" className="msg-image-link" onClick={() => openAttachment(att)}>
                          {attachmentImageUrls[att.id] ? (
                            <img src={attachmentImageUrls[att.id]} alt={att.name} />
                          ) : (
                            <span>图片加载中</span>
                          )}
                        </button>
                      ) : (
                        <button key={att.id} type="button" className="msg-file" onClick={() => openAttachment(att)}>
                          <Icon name="package" size={20} />
                          <div>
                            <strong>{att.name}</strong>
                            <small>{fileSize(att.size)} · {att.content_type || '未知类型'}</small>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
                {m.generation_tasks && m.generation_tasks.length > 0 && (
                  <div className="task-stack">
                    {m.generation_tasks.map((task) => (
                      <div key={task.id} className={`task-card is-${task.status}`}>
                        <div className="task-head">
                          <div>
                            <strong>{taskTitle(task)}</strong>
                            <small>{task.provider} · {task.model_key}</small>
                          </div>
                          <span className="task-status">{taskStatusLabel(task.status)}</span>
                        </div>
                        {isActiveTask(task) && (
                          <div className="task-progress">
                            <span style={{ width: `${task.progress ?? 35}%` }} />
                          </div>
                        )}
                        {task.status === 'failed' && taskErrorText(task) ? (
                          <p className="task-error">{taskErrorText(task)}</p>
                        ) : task.error_message ? (
                          <p className="task-error">{task.error_message}</p>
                        ) : null}
                        
                        {task.status === 'failed' ? (
                          <div className="task-actions">
                            {actionsForErrorCode(task.error_code, task).map((action) => {
                              if (action === 'refresh') return <button key={action} type="button" onClick={() => onRefreshTask?.(task)}>{t('agent.gen.action.refresh')}</button>
                              if (action === 'retry') return <button key={action} type="button" onClick={() => onRetryTask?.(task)}>{t('agent.gen.action.retry')}</button>
                              if (action === 'copyPrompt') return <button key={action} type="button" onClick={() => void copyTaskPrompt(task)}>{t('agent.gen.action.copyPrompt')}</button>
                              if (action === 'recharge') return <button key={action} type="button" onClick={gotoRecharge}>{t('agent.gen.action.recharge')}</button>
                              return null
                            })}
                          </div>
                        ) : task.modality === 'video' && isActiveTask(task) ? (
                          <div className="task-actions">
                            <button type="button" onClick={() => onRefreshTask?.(task)}>刷新状态</button>
                          </div>
                        ) : null}

                        {isActiveTask(task) && (
                          <div className={`task-preview is-${task.modality}`}>
                            <div className="task-preview-blur" />
                            <div className="task-preview-shine" />
                          </div>
                        )}

                        {task.modality === 'image' && task.status === 'succeeded' && (
                          <div className="task-images">
                            {taskArtifacts(task).map((item, idx) => (
                              <img key={idx} src={artifactSrc(item)} alt="generated image" />
                            ))}
                          </div>
                        )}

                        {task.modality === 'video' && task.status === 'succeeded' && taskVideos(task).length > 0 && (
                          <div className="task-videos">
                            {taskVideos(task).map((src, idx) => (
                              <div key={`${task.id}-${idx}-${src}`} className="task-video-item">
                                <video
                                  controls
                                  playsInline
                                  preload="metadata"
                                  src={videoPlaybackSrc(task, src, idx)}
                                />
                                {videoPlaybackState(task, idx) && (
                                  <p className="task-video-state">{videoPlaybackState(task, idx)}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {task.modality === 'video' && task.upstream_task_id && (
                          <div className="task-meta">
                            任务 ID：{task.upstream_task_id}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="msg-avatar is-user">
                  <Icon name="user" size={14} />
                </div>
              )}
            </div>
          ))
        ) : children}
      </div>

      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-w-[min(920px,94vw)]">
          <DialogHeader>
            <DialogTitle>{imagePreview?.name || '图片预览'}</DialogTitle>
          </DialogHeader>
          {imagePreview && <img className="agent-preview-img" src={imagePreview.url} alt={imagePreview.name} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!downloadFile} onOpenChange={(open) => !open && setDownloadFile(null)}>
        <DialogContent className="max-w-[min(460px,92vw)]">
          <DialogHeader>
            <DialogTitle>文件下载</DialogTitle>
          </DialogHeader>
          {downloadFile && (
            <div className="agent-file-detail">
              <Icon name="package" size={22} />
              <div>
                <strong>{downloadFile.name}</strong>
                <small>{fileSize(downloadFile.size)} · {downloadFile.content_type || '未知类型'}</small>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadFile(null)}>取消</Button>
            {downloadFile && <Button onClick={() => void downloadAttachment(downloadFile)}>下载</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!textFile} onOpenChange={(open) => !open && setTextFile(null)}>
        <DialogContent className="max-w-[min(860px,92vw)]">
          <DialogHeader>
            <DialogTitle>{textFile?.name || '文本文件'}</DialogTitle>
          </DialogHeader>
          {textLoading ? (
            <div className="agent-text-loading">加载中...</div>
          ) : (
            <pre className="agent-text-content">{textContent}</pre>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTextFile(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
