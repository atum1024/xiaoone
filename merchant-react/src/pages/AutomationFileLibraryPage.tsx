import { ChangeEvent, useEffect, useMemo, useState, useRef } from 'react'
import { getChatKit, type AgentAttachment } from '@xiaoone/chat-kit'
import { Icon } from '../components/Icon'
import { usePreferences } from '../app/preferences'
import { toast, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@xiaoone/react-ui'
import './automation-file-library-page.css'

const TEMPLATE_DEFS = [
  { key: 'file-organize', labelKey: 'automation.file.template.fileOrganize', noteKey: 'automation.file.template.fileOrganizeNote' },
  { key: 'install-doc', labelKey: 'automation.file.template.installDoc', noteKey: 'automation.file.template.installDocNote' },
  { key: 'corpus', labelKey: 'automation.file.template.corpus', noteKey: 'automation.file.template.corpusNote' },
  { key: 'sop', labelKey: 'automation.file.template.sop', noteKey: 'automation.file.template.sopNote' },
] as const

function absoluteUrl(url: string) {
  if (!url) return ''
  return new URL(url, window.location.origin).toString()
}

export function AutomationFileLibraryPage() {
  const { t, tpl } = usePreferences()
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

  const [templateKey, setTemplateKey] = useState<string>(TEMPLATE_DEFS[0].key)
  const [instruction, setInstruction] = useState('')

  const templates = useMemo(
    () => TEMPLATE_DEFS.map(item => ({
      key: item.key,
      label: t(item.labelKey),
      note: t(item.noteKey),
    })),
    [t],
  )

  useEffect(() => {
    const current = templates.find(item => item.key === templateKey)
    if (current) setInstruction(current.note)
  }, [templateKey, templates])

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
      toast({ title: t('automation.file.toast.loadFailed') })
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
      toast({ title: t('automation.file.toast.uploaded') })
      loadFiles()
    } catch (e: any) {
      toast({ title: t('automation.file.toast.uploadFailed'), description: e?.message || t('automation.archives.unknownError') })
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
      toast({ title: t('automation.file.toast.selectFirst') })
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
      toast({ title: t('automation.file.toast.markdownReady') })
      loadFiles()
    } catch (e: any) {
      toast({ title: t('automation.file.toast.organizeFailed'), description: e?.message || t('automation.archives.unknownError') })
    } finally {
      setOrganizing(false)
    }
  }

  const copyText = async (text: string, label: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast({ title: tpl('automation.file.toast.copied', label) })
  }

  const refreshPublicShare = async () => {
    if (!generatedAttachment || sharing) return
    setSharing(true)
    try {
      const r = await AgentAttachmentAPI.share(generatedAttachment.id)
      setGeneratedAttachment(r.attachment)
      setGeneratedShareUrl(absoluteUrl(r.share_url))
      toast({ title: t('automation.file.toast.publicReady') })
    } catch (e: any) {
      toast({ title: t('automation.file.toast.publicFailed'), description: e?.message || t('automation.archives.unknownError') })
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
      toast({ title: t('automation.file.toast.publicRevoked') })
    } catch (e: any) {
      toast({ title: t('automation.file.toast.revokeFailed'), description: e?.message || t('automation.archives.unknownError') })
    } finally {
      setRevokingShare(false)
    }
  }

  const openGeneratedDownload = () => {
    if (generatedDownloadUrl) window.open(generatedDownloadUrl, '_blank')
  }

  return (
    <section className="file-page">
      <section className="file-block">
        <div className="file-block-head">
          <div>
            <strong>{t('automation.file.uploadTitle')}</strong>
            <span>{t('automation.file.uploadDesc')}</span>
          </div>
          <button type="button" className="file-action" onClick={loadFiles}>
            {t('automation.file.refresh')}
          </button>
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
            {uploading ? t('automation.file.uploading') : t('automation.file.upload')}
          </button>

          <Select value={templateKey} onValueChange={v => {
            setTemplateKey(v)
            setInstruction(templates.find(item => item.key === v)?.note || '')
          }}>
            <SelectTrigger className="file-select w-[140px] border-none h-[32px] bg-[var(--xiaoone-bg)]">
              <SelectValue placeholder={t('automation.file.templatePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {templates.map(tplItem => (
                <SelectItem key={tplItem.key} value={tplItem.key}>{tplItem.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button type="button" className="file-action is-primary" disabled={organizing || !selectedFileIds.length} onClick={organizeFiles}>
            <Icon name="sparkles" size={14} />
            {organizing ? t('automation.file.organizing') : t('automation.file.organize')}
          </button>
          <span className="file-count">{tpl('automation.file.selectedCount', String(selectedFiles.length))}</span>
        </div>

        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          className="file-instruction"
          rows={3}
          placeholder={t('automation.file.instructionPlaceholder')}
        />

        <div className="file-grid">
          <div className="file-list">
            <div className="file-list-head">
              <strong>{t('automation.file.sourceTitle')}</strong>
              <span>{tpl('automation.file.countUnit', String(sourceFiles.length))}</span>
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
                  <small>{f.is_text ? t('automation.file.textExtracted') : t('automation.file.metadataOnly')} · {Math.ceil(f.size / 1024)} KB</small>
                </span>
              </button>
            ))}
            {fileLoading && <div className="file-empty">{t('automation.file.loading')}</div>}
            {!fileLoading && !sourceFiles.length && <div className="file-empty">{t('automation.file.noUploads')}</div>}
          </div>

          <div className="file-output">
            <div className="file-list-head">
              <strong>{t('automation.file.resultTitle')}</strong>
              <span>{tpl('automation.file.markdownCount', String(generatedFiles.length))}</span>
            </div>
            {markdownPreview ? (
              <div className="markdown-preview">
                <pre>{markdownPreview}</pre>
              </div>
            ) : (
              <div className="file-empty">{t('automation.file.resultEmpty')}</div>
            )}

            {generatedAttachment && (
              <div className="output-actions">
                <button type="button" className="file-action" onClick={openGeneratedDownload}>{t('automation.file.download')}</button>
                <button type="button" className="file-action" onClick={() => copyText(generatedDownloadUrl, t('automation.file.toast.authLink'))}>{t('automation.file.copyAuthLink')}</button>
                {generatedShareUrl ? (
                  <>
                    <button type="button" className="file-action" onClick={() => copyText(generatedShareUrl, t('automation.file.toast.publicLink'))}>{t('automation.file.copyPublicLink')}</button>
                    <button type="button" className="file-action is-danger" disabled={revokingShare} onClick={revokePublicShare}>
                      {revokingShare ? t('automation.file.revoking') : t('automation.file.revokePublic')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="file-action" disabled={sharing} onClick={refreshPublicShare}>
                    {sharing ? t('automation.file.regenerating') : t('automation.file.regeneratePublic')}
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
