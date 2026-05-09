import React, { useState, useEffect, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { useTeamChatRuntime } from './TeamChatContext'
import { TeamChatFileItem } from '@xiaoone/chat-kit'
import { TeamChatFileKind } from './types'
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@xiaoone/react-ui'

export function TeamChatFiles({ className }: { className?: string }) {
  const runtime = useTeamChatRuntime()
  const nav = runtime.nav

  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<TeamChatFileItem[]>([])
  const [imageObjectUrls, setImageObjectUrls] = useState<Record<string, string>>({})
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null)
  const [downloadFile, setDownloadFile] = useState<TeamChatFileItem | null>(null)
  const [textFile, setTextFile] = useState<TeamChatFileItem | null>(null)
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  const tabs: { key: TeamChatFileKind; label: string; empty: string }[] = [
    { key: 'dm', label: '私聊文件', empty: '还没有你参与的私聊文件。' },
    { key: 'group', label: '群里文件', empty: '还没有你所在群的群文件。' },
    { key: 'ai', label: 'AI梳理文件', empty: '群聊执行 AI 梳理后，文档会出现在这里。' },
  ]

  const activeTab = nav.teamChatFileKind
  const setActiveTab = nav.setTeamChatFileKind

  const emptyText = useMemo(() => tabs.find(t => t.key === activeTab)?.empty || '暂无文件。', [activeTab, tabs])

  const fmtDate = (d: string) => {
    if (!d) return ''
    const t = new Date(d).getTime()
    if (!t || Number.isNaN(t)) return ''
    return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(2)} MB`
  }

  const ensureFileBlobUrl = async (file: TeamChatFileItem) => {
    if (imageObjectUrls[file.id]) return imageObjectUrls[file.id]
    const blob = await runtime.api.download(file.id)
    const url = URL.createObjectURL(blob)
    setImageObjectUrls(prev => ({ ...prev, [file.id]: url }))
    return url
  }

  const hydrateImageUrls = async (list: TeamChatFileItem[]) => {
    const images = list.filter(f => f.is_image && !imageObjectUrls[f.id])
    await Promise.all(images.map(file => ensureFileBlobUrl(file).catch(() => '')))
  }

  const loadFiles = async () => {
    setLoading(true)
    try {
      const res = await runtime.api.listFiles(activeTab)
      setFiles(res)
      hydrateImageUrls(res).catch(() => {})
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '加载团队文件失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
    return () => {
      Object.values(imageObjectUrls).forEach(url => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const isTextFile = (file: TeamChatFileItem) => {
    const type = (file.content_type || '').split(';')[0].trim().toLowerCase()
    const name = (file.name || '').toLowerCase()
    return type.startsWith('text/') || ['application/json', 'application/xml', 'application/yaml', 'application/x-yaml'].includes(type) || /\.(cfg|conf|csv|env|ini|json|log|md|markdown|sql|text|toml|tsv|txt|xml|ya?ml)$/.test(name)
  }

  const imageSrc = (file: TeamChatFileItem) => imageObjectUrls[file.id] || ''

  const openFile = async (file: TeamChatFileItem) => {
    if (file.is_image) {
      try {
        const url = await ensureFileBlobUrl(file)
        setImagePreview({ url, name: file.name })
      } catch {
        toast.error('图片加载失败')
      }
      return
    }
    if (isTextFile(file)) {
      setTextFile(file)
      setTextContent('')
      setTextLoading(true)
      try {
        const r = await runtime.api.readTextFile(file.id)
        setTextContent(r.content)
      } catch (e: any) {
        setTextFile(null)
        toast.error(e?.response?.data?.message || '打开文本文件失败')
      } finally {
        setTextLoading(false)
      }
      return
    }
    setDownloadFile(file)
  }

  const downloadAttachment = async (file: TeamChatFileItem) => {
    try {
      const blob = await runtime.api.download(file.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name || 'download'
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

  return (
    <section className={`tcf ${className || ''}`}>
      <header className="tcf-head">
        <div>
          <strong>团队文件</strong>
          <span>只显示你私聊或所在群内可访问的文件</span>
        </div>
        <button type="button" className="tcf-refresh" disabled={loading} onClick={loadFiles}>刷新</button>
      </header>

      <div className="tcf-tabs" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tcf-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tcf-list">
        <div className="tcf-row tcf-row-head">
          <span>文件名称</span>
          <span>时间</span>
          <span>相关好友或群</span>
        </div>
        {loading ? (
          <div className="tcf-empty">加载中…</div>
        ) : files.length > 0 ? (
          files.map(file => (
            <button key={file.id} type="button" className="tcf-row tcf-file" onClick={() => openFile(file)}>
              <span className="tcf-name">
                {file.is_image && imageSrc(file) ? (
                  <img className="tcf-thumb" src={imageSrc(file)} alt={file.name} />
                ) : (
                  <span className="tcf-file-icon">
                    <Icon name={file.source === 'ai_summary' ? 'sparkles' : 'package'} size={14} />
                  </span>
                )}
                <span>
                  <strong>{file.name}</strong>
                  <small>{fmtSize(file.size)} · {file.content_type}</small>
                </span>
              </span>
              <span>{fmtDate(file.created_at)}</span>
              <span>{file.related_name || '未关联会话'}</span>
            </button>
          ))
        ) : (
          <div className="tcf-empty">{emptyText}</div>
        )}
      </div>

      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={open => !open && setImagePreview(null)}>
          <DialogContent className="max-w-[860px] w-[92vw]">
            <DialogHeader><DialogTitle>{imagePreview.name || '图片预览'}</DialogTitle></DialogHeader>
            <img className="tcf-image-large" src={imagePreview.url} alt={imagePreview.name} />
          </DialogContent>
        </Dialog>
      )}

      {downloadFile && (
        <Dialog open={!!downloadFile} onOpenChange={open => !open && setDownloadFile(null)}>
          <DialogContent className="max-w-[460px] w-[92vw]">
            <DialogHeader><DialogTitle>文件下载</DialogTitle></DialogHeader>
            <div className="tcf-file-detail">
              <Icon name="package" size={22} />
              <div>
                <strong>{downloadFile.name}</strong>
                <small>{fmtSize(downloadFile.size)} · {downloadFile.content_type || '未知类型'}</small>
                <small>{downloadFile.related_name || '未关联会话'} · {fmtDate(downloadFile.created_at)}</small>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDownloadFile(null)}>取消</Button>
              <Button onClick={() => downloadAttachment(downloadFile)}>下载</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {textFile && (
        <Dialog open={!!textFile} onOpenChange={open => !open && setTextFile(null)}>
          <DialogContent className="max-w-[860px] w-[92vw]">
            <DialogHeader><DialogTitle>{textFile.name || '文本文件'}</DialogTitle></DialogHeader>
            {textLoading ? (
              <div className="tcf-text-loading">加载中…</div>
            ) : (
              <pre className="tcf-text-content">{textContent}</pre>
            )}
            <DialogFooter>
              <Button onClick={() => setTextFile(null)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
