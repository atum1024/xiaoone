import { ChangeEvent, useEffect, useMemo, useState, useRef } from 'react'
import { getChatKit, type AgentAttachment } from '@xiaoone/chat-kit'
import { Icon } from '../components/Icon'
import { toast, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@xiaoone/react-ui'
import './automation-file-library-page.css'

const TEMPLATES = [
  { key: 'file-organize', label: '文件梳理', note: '请对选中文件做结构化梳理，输出摘要、关键事实、待确认问题和可执行清单。' },
  { key: 'install-doc', label: '安装文档生成', note: '请把选中文件整理成安装与使用文档，包含环境要求、安装步骤、配置项、验证方式和常见问题。' },
  { key: 'corpus', label: '客服语料整理', note: '请把选中文件整理成客服语料，按问题、标准回答、适用场景、注意事项输出。' },
  { key: 'sop', label: '运营 SOP 生成', note: '请把选中文件整理成运营 SOP，包含目标、适用范围、角色分工、步骤、检查点和异常处理。' },
]

function absoluteUrl(url: string) {
  if (!url) return ''
  return new URL(url, window.location.origin).toString()
}

export function AutomationFileLibraryPage() {
  const { AgentAttachmentAPI } = getChatKit()
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<AgentAttachment[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [organizing, setOrganizing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [revokingShare, setRevokingShare] = useState(false)

  const [markdownPreview, setMarkdownPreview] = useState('')
  const [generatedAttachment, setGeneratedAttachment] = useState<AgentAttachment | null>(null)
  const [generatedDownloadUrl, setGeneratedDownloadUrl] = useState('')
  const [generatedShareUrl, setGeneratedShareUrl] = useState('')

  const [templateKey, setTemplateKey] = useState(TEMPLATES[0].key)
  const [instruction, setInstruction] = useState(TEMPLATES[0].note)

  const sourceFiles = useMemo(() => files.filter(f => f.source === 'user_upload'), [files])
  const generatedFiles = useMemo(() => files.filter(f => f.source === 'ai_output'), [files])
  const selectedFiles = useMemo(() => files.filter(f => selectedFileIds.includes(f.id)), [files, selectedFileIds])

  const loadFiles = async () => {
    setFileLoading(true)
    try {
      const r = await AgentAttachmentAPI.list({ page_size: 80 })
      setFiles(r || [])
      const currentIds = new Set(r.filter(f => f.source === 'user_upload').map(f => f.id))
      setSelectedFileIds(prev => prev.filter(id => currentIds.has(id)))
    } catch {
      toast({ title: '文件库加载失败' })
    } finally {
      setFileLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const uploadFiles = async (ev: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(ev.target.files || [])
    if (!picked.length) return
    setUploading(true)
    try {
      for (const file of picked) {
        await AgentAttachmentAPI.upload(file)
      }
      toast({ title: '文件已上传' })
      loadFiles()
    } catch (e: any) {
      toast({ title: '文件上传失败', description: e?.message || '未知错误' })
    } finally {
      setUploading(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    }
  }

  const toggleFile = (id: string) => {
    setSelectedFileIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const organizeFiles = async () => {
    if (!selectedFileIds.length) {
      toast({ title: '请先选择文件' })
      return
    }
    setOrganizing(true)
    setMarkdownPreview('')
    setGeneratedAttachment(null)
    setGeneratedDownloadUrl('')
    setGeneratedShareUrl('')
    try {
      const r = await AgentAttachmentAPI.organize({
        attachment_ids: selectedFileIds,
        template_key: templateKey,
        instruction: instruction.trim(),
      })
      setGeneratedAttachment(r.attachment)
      setMarkdownPreview(r.markdown_preview || '')
      setGeneratedDownloadUrl(absoluteUrl(r.download_url))
      setGeneratedShareUrl(absoluteUrl(r.share_url))
      toast({ title: 'Markdown 已生成' })
      loadFiles()
    } catch (e: any) {
      toast({ title: 'AI 梳理失败', description: e?.message || '未知错误' })
    } finally {
      setOrganizing(false)
    }
  }

  const copyText = async (text: string, label: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast({ title: `${label}已复制` })
  }

  const refreshPublicShare = async () => {
    if (!generatedAttachment || sharing) return
    setSharing(true)
    try {
      const r = await AgentAttachmentAPI.share(generatedAttachment.id)
      setGeneratedAttachment(r.attachment)
      setGeneratedShareUrl(absoluteUrl(r.share_url))
      toast({ title: '公开链接已生成' })
    } catch (e: any) {
      toast({ title: '生成公开链接失败', description: e?.message || '未知错误' })
    } finally {
      setSharing(false)
    }
  }

  const revokePublicShare = async () => {
    if (!generatedAttachment || revokingShare) return
    setRevokingShare(true)
    try {
      await AgentAttachmentAPI.revokeShare(generatedAttachment.id)
      setGeneratedShareUrl('')
      toast({ title: '公开链接已撤销' })
    } catch (e: any) {
      toast({ title: '撤销公开链接失败', description: e?.message || '未知错误' })
    } finally {
      setRevokingShare(false)
    }
  }

  const openGeneratedDownload = () => {
    if (generatedDownloadUrl) window.open(generatedDownloadUrl, '_blank')
  }

  return (
    <section className="file-page">
      <header className="file-head">
        <div>
          <span className="file-kicker">自动化</span>
          <h1>文件库</h1>
        </div>
        <button type="button" className="file-action" onClick={loadFiles}>
          刷新
        </button>
      </header>

      <section className="file-block">
        <div className="file-block-head">
          <strong>上传与梳理</strong>
          <span>选择文件后生成 Markdown，可下载或复制链接。</span>
        </div>

        <div className="file-toolbar">
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            className="file-input"
            onChange={uploadFiles}
          />
          <button type="button" className="file-action" disabled={uploading} onClick={() => uploadInputRef.current?.click()}>
            <Icon name="package" size={14} />
            {uploading ? '上传中…' : '上传文件'}
          </button>

          <Select value={templateKey} onValueChange={v => {
            setTemplateKey(v)
            setInstruction(TEMPLATES.find(t => t.key === v)?.note || '')
          }}>
            <SelectTrigger className="file-select w-[140px] border-none h-[32px] bg-[var(--xiaoone-bg)]">
              <SelectValue placeholder="选择梳理模板" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map(tpl => (
                <SelectItem key={tpl.key} value={tpl.key}>{tpl.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button type="button" className="file-action is-primary" disabled={organizing || !selectedFileIds.length} onClick={organizeFiles}>
            <Icon name="sparkles" size={14} />
            {organizing ? '梳理中…' : 'AI 一键梳理'}
          </button>
          <span className="file-count">已选 {selectedFiles.length} 个文件</span>
        </div>

        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          className="file-instruction"
          rows={3}
          placeholder="补充这次梳理的目标，例如：整理成安装文档、生成客服语料、输出 SOP。"
        />

        <div className="file-grid">
          <div className="file-list">
            <div className="file-list-head">
              <strong>上传文件</strong>
              <span>{sourceFiles.length} 个</span>
            </div>
            {sourceFiles.map(f => (
              <button
                key={f.id}
                type="button"
                className={`file-row ${selectedFileIds.includes(f.id) ? 'is-selected' : ''}`}
                onClick={() => toggleFile(f.id)}
              >
                <span className="file-check">{selectedFileIds.includes(f.id) ? '✓' : ''}</span>
                <span className="file-copy">
                  <strong>{f.name}</strong>
                  <small>{f.is_text ? '已抽取文本' : '仅元数据'} · {Math.ceil(f.size / 1024)} KB</small>
                </span>
              </button>
            ))}
            {fileLoading && <div className="file-empty">加载中…</div>}
            {!fileLoading && !sourceFiles.length && <div className="file-empty">暂无上传文件</div>}
          </div>

          <div className="file-output">
            <div className="file-list-head">
              <strong>生成结果</strong>
              <span>{generatedFiles.length} 个 Markdown</span>
            </div>
            {markdownPreview ? (
              <div className="markdown-preview">
                <pre>{markdownPreview}</pre>
              </div>
            ) : (
              <div className="file-empty">选择文件后点击 AI 一键梳理，生成 Markdown 预览。</div>
            )}

            {generatedAttachment && (
              <div className="output-actions">
                <button type="button" className="file-action" onClick={openGeneratedDownload}>下载</button>
                <button type="button" className="file-action" onClick={() => copyText(generatedDownloadUrl, '登录态链接')}>复制登录态链接</button>
                {generatedShareUrl ? (
                  <>
                    <button type="button" className="file-action" onClick={() => copyText(generatedShareUrl, '公开链接')}>复制公开链接</button>
                    <button type="button" className="file-action is-danger" disabled={revokingShare} onClick={revokePublicShare}>
                      {revokingShare ? '撤销中…' : '撤销公开链接'}
                    </button>
                  </>
                ) : (
                  <button type="button" className="file-action" disabled={sharing} onClick={refreshPublicShare}>
                    {sharing ? '生成中…' : '重新生成公开链接'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  )
}
