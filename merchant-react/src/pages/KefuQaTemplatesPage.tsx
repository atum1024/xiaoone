import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BookText, ClipboardList, FileText, Film, Image as ImageIcon, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { getChatKit, type CorpusEntry, type CorpusSource, type SDKConfig as SdkConfigRow, type Store as StoreRow } from '@xiaoone/chat-kit'
import { usePreferences } from '../app/preferences'
import type { KefuTranslate } from '../i18n/catalog/kefu'
import { describeAxiosError, describeKefuError } from '../lib/apiErrors'
import './KefuQaTemplatesPage.css'

type TabKey = 'sources' | 'entries'
type KefuQaTemplatesMode = 'all' | 'uploads' | 'qa-library'

interface KefuQaTemplatesPageProps {
  mode?: KefuQaTemplatesMode
  /** 嵌入客服设置「自动回复」统一面板时，不再套一层 x1-lc-container */
  embedded?: boolean
}

function sourceTypeLabel(t: KefuTranslate): Record<string, string> {
  return {
    upload: t('kefu.qa.sourceType.upload'),
    paste: t('kefu.qa.sourceType.paste'),
    text: t('kefu.qa.sourceType.text'),
    file: t('kefu.qa.sourceType.file'),
  }
}

function sourceStatusLabel(t: KefuTranslate): Record<string, string> {
  return {
    pending: t('kefu.qa.sourceStatus.pending'),
    processing: t('kefu.qa.sourceStatus.processing'),
    ready: t('kefu.qa.sourceStatus.ready'),
    done: t('kefu.qa.sourceStatus.done'),
    failed: t('kefu.qa.sourceStatus.failed'),
  }
}

function mediaKindLabel(t: KefuTranslate): Record<string, string> {
  return {
    text: t('kefu.qa.mediaKind.text'),
    image: t('kefu.qa.mediaKind.image'),
    video: t('kefu.qa.mediaKind.video'),
  }
}

const SUPPORTED_CORPUS_EXTS = [
  '.txt', '.md', '.markdown', '.json', '.yaml', '.yml', '.csv', '.tsv',
  '.html', '.css', '.scss', '.xml', '.sql', '.zip',
  '.py', '.js', '.ts', '.tsx', '.jsx', '.vue', '.java', '.kt', '.go', '.rs', '.php', '.rb', '.swift',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.heic', '.heif',
  '.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi',
]
const CORPUS_ACCEPT = [
  ...SUPPORTED_CORPUS_EXTS,
  'image/*',
  'video/*',
].join(',')
const MAX_BATCH_CONTEXT_UNITS = 24_000
const VISITOR_QUICK_QUESTION_LIMIT = 10

function unsupportedCorpusFiles(files: File[]) {
  return files.filter((file) => {
    const name = file.name.toLowerCase()
    return !SUPPORTED_CORPUS_EXTS.some(ext => name.endsWith(ext))
  })
}

function tabsForMode(mode: KefuQaTemplatesMode): TabKey[] {
  if (mode === 'uploads')
    return ['sources']
  if (mode === 'qa-library')
    return ['entries']
  return ['sources', 'entries']
}

function defaultTabForMode(mode: KefuQaTemplatesMode): TabKey {
  if (mode === 'qa-library')
    return 'entries'
  return 'sources'
}

function selectedContextUnits(sourceIds: number[], sources: CorpusSource[]) {
  return sourceIds.reduce((sum, id) => {
    const row = sources.find(item => item.id === id)
    return sum + (row?.estimated_units || 0)
  }, 0)
}

export function KefuQaTemplatesPage({ mode = 'all', embedded = false }: KefuQaTemplatesPageProps) {
  const { t, tpl } = usePreferences()
  const SOURCE_TYPE_LABEL = sourceTypeLabel(t)
  const SOURCE_STATUS_LABEL = sourceStatusLabel(t)
  const MEDIA_KIND_LABEL = mediaKindLabel(t)
  const navigate = useNavigate()
  const isUploadsMode = mode === 'uploads'
  const isQaLibraryMode = mode === 'qa-library'
  const [tab, setTab] = useState<TabKey>(() => defaultTabForMode(mode))
  const [entries, setEntries] = useState<CorpusEntry[]>([])
  const [entriesTotal, setEntriesTotal] = useState(0)
  const [sources, setSources] = useState<CorpusSource[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [entryTitle, setEntryTitle] = useState('')
  const [entryContent, setEntryContent] = useState('')
  const [entryStoreId, setEntryStoreId] = useState('')
  const [entryActive, setEntryActive] = useState(true)
  const [entryQuickQuestion, setEntryQuickQuestion] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [sdkRows, setSdkRows] = useState<SdkConfigRow[]>([])
  const [savingAutoReply, setSavingAutoReply] = useState(false)
  const [generatingSourceId, setGeneratingSourceId] = useState<number | null>(null)
  const [generateStoreDialogOpen, setGenerateStoreDialogOpen] = useState(false)
  const [generateStoreId, setGenerateStoreId] = useState('')
  const [pendingGenerateSource, setPendingGenerateSource] = useState<CorpusSource | null | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const visibleTabs = useMemo(() => tabsForMode(mode), [mode])
  const showInnerTabs = mode === 'all' && visibleTabs.length > 1
  const globalAutoReplyEnabled = useMemo(() => {
    if (!sdkRows.length)
      return true
    return sdkRows.every(row => row.auto_reply_enabled !== false)
  }, [sdkRows])
  const selectedUnits = useMemo(() => selectedContextUnits(selectedSourceIds, sources), [selectedSourceIds, sources])
  const visitorQuickQuestionCount = useMemo(
    () => entries.filter(item => item.is_active !== false && item.is_visitor_quick_question).length,
    [entries],
  )

  useEffect(() => {
    if (!visibleTabs.includes(tab))
      setTab(defaultTabForMode(mode))
  }, [mode, tab, visibleTabs])

  useEffect(() => {
    if (isUploadsMode && tab !== 'sources')
      setTab('sources')
  }, [isUploadsMode, tab])

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const entryRes = await getChatKit().CorpusAPI.list()
      const sourceRes = await getChatKit().CorpusSourceAPI.list()
      const storeRes = await getChatKit().StoreAPI.list()
      setEntries(entryRes.items)
      setEntriesTotal(entryRes.total ?? entryRes.items.length)
      setSources(sourceRes.items)
      setStores(storeRes.items)
      if (isQaLibraryMode || mode === 'all') {
        const sdkRes = await getChatKit().SDKConfigAPI.list()
        setSdkRows(sdkRes.items)
      }
    }
    catch (err) {
      setError(describeKefuError(err, t('kefu.qa.loadFailed')))
    }
    finally {
      setLoading(false)
    }
  }, [isQaLibraryMode, mode])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectedCount = selectedSourceIds.length
  const canGenerate = useMemo(() => selectedSourceIds.length > 0, [selectedSourceIds])

  function notifySuccess(title: string, description?: string) {
    toast({ variant: 'success', title, description })
  }

  function notifyWarning(title: string, description?: string) {
    toast({ variant: 'warning', title, description })
  }

  function notifyError(title: string, description?: string) {
    toast({ variant: 'destructive', title, description })
  }

  function resetEntryForm() {
    setEntryTitle('')
    setEntryContent('')
    setEntryStoreId('')
    setEntryActive(true)
    setEntryQuickQuestion(false)
    setEditingEntryId(null)
  }

  function closeEntryDialog() {
    setEntryDialogOpen(false)
    resetEntryForm()
  }

  function openEntryDialogForCreate() {
    resetEntryForm()
    setEntryDialogOpen(true)
  }

  async function onUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selectedFiles.length)
      return
    const rejected = unsupportedCorpusFiles(selectedFiles)
    if (rejected.length) {
      notifyWarning(
        t('kefu.qa.fileUnsupported'),
        tpl('kefu.qa.fileUnsupportedDesc', rejected.map(file => file.name).join('、')),
      )
      return
    }
    setUploading(true)
    setError('')
    try {
      const uploadedIds: number[] = []
      for (const file of selectedFiles) {
        const result = await getChatKit().CorpusSourceAPI.upload({ file, name: file.name, store: null })
        if (result.source?.id)
          uploadedIds.push(result.source.id)
      }
      await reload()
      if (uploadedIds.length)
        setSelectedSourceIds(uploadedIds)
      notifySuccess(
        t('kefu.qa.uploadSuccess'),
        tpl('kefu.qa.uploadSuccessDesc', String(selectedFiles.length)),
      )
    }
    catch (err) {
      notifyError(t('kefu.qa.uploadFailed'), describeKefuError(err, t('kefu.qa.uploadFailed')))
    }
    finally {
      setUploading(false)
    }
  }

  function closeGenerateStoreDialog() {
    setGenerateStoreDialogOpen(false)
    setGenerateStoreId('')
    setPendingGenerateSource(undefined)
  }

  function openGenerateStoreDialog(item?: CorpusSource) {
    if (item === undefined && !canGenerate)
      return
    setGenerateStoreId('')
    setPendingGenerateSource(item === undefined ? null : item)
    setGenerateStoreDialogOpen(true)
  }

  function generateStorePayload() {
    return { store: generateStoreId ? Number(generateStoreId) : null }
  }

  async function onConfirmGenerateStore() {
    if (pendingGenerateSource === undefined)
      return
    const storePayload = generateStorePayload()
    const source = pendingGenerateSource
    const isBatch = source === null
    closeGenerateStoreDialog()
    if (isBatch)
      await onUpdateSelected(storePayload)
    else
      await onUpdateSource(source, storePayload)
  }

  async function onUpdateSelected(storePayload: { store: number | null } = { store: null }) {
    if (!canGenerate)
      return
    setGenerating(true)
    setError('')
    const idsToPoll = [...selectedSourceIds]
    try {
      const result = await getChatKit().CorpusSourceAPI.generateSelected({
        source_ids: selectedSourceIds,
        channel: 'all',
        ...storePayload,
      })
      setSelectedSourceIds([])
      if (result.skipped?.length)
        notifyWarning(t('kefu.qa.updateInProgress'), tpl('kefu.qa.updateInProgressPartial', String(result.enqueued_sources), String(result.skipped.length)))
      else
        notifySuccess(t('kefu.qa.updateInProgress'), tpl('kefu.qa.updateInProgressDesc', String(result.enqueued_sources)))
      await pollSourceStatus(idsToPoll)
      await reload()
    }
    catch (err) {
      await reload().catch(() => undefined)
      notifyError(
        t('kefu.qa.updateFailed'),
        describeAxiosError(err, describeKefuError(err, t('kefu.qa.updateFailed')), t('kefu.qa.updateFailedTimeout')),
      )
    }
    finally {
      setGenerating(false)
    }
  }

  async function onUpdateSource(item: CorpusSource, storePayload: { store: number | null } = { store: null }) {
    setGeneratingSourceId(item.id)
    setError('')
    try {
      await getChatKit().CorpusSourceAPI.generate(item.id, { use_ai: true, channel: 'all', ...storePayload })
      await pollSourceStatus([item.id])
      await reload()
      notifySuccess(t('kefu.qa.updateSuccess'), tpl('kefu.qa.updateSuccessSingle', item.name))
    }
    catch (err) {
      await reload().catch(() => undefined)
      notifyError(t('kefu.qa.updateFailed'), describeAxiosError(err, describeKefuError(err, t('kefu.qa.updateFailed')), t('kefu.qa.updateFailedRetry')))
    }
    finally {
      setGeneratingSourceId(null)
    }
  }

  function toggleSourceSelection(item: CorpusSource, checked: boolean) {
    setSelectedSourceIds((prev) => {
      if (!checked)
        return prev.filter(id => id !== item.id)
      if (prev.includes(item.id))
        return prev
      const nextUnits = selectedContextUnits(prev, sources) + (item.estimated_units || 0)
      if (nextUnits > MAX_BATCH_CONTEXT_UNITS) {
        notifyWarning(
          t('kefu.qa.contextLimit'),
          tpl('kefu.qa.contextLimitDesc', String(nextUnits), String(MAX_BATCH_CONTEXT_UNITS)),
        )
        return prev
      }
      return [...prev, item.id]
    })
  }

  async function onToggleGlobalAutoReply(enabled: boolean) {
    if (!sdkRows.length) {
      notifyWarning(t('kefu.qa.autoReplyNoSdk'), t('kefu.qa.autoReplyNoSdkDesc'))
      return
    }
    setSavingAutoReply(true)
    setError('')
    try {
      await Promise.all(sdkRows.map(row => getChatKit().SDKConfigAPI.update(row.id, { auto_reply_enabled: enabled } as any)))
      await reload()
      notifySuccess(enabled ? t('kefu.qa.autoReplyEnabled') : t('kefu.qa.autoReplyDisabled'))
    }
    catch (err) {
      notifyError(t('kefu.qa.autoReplySaveFailed'), describeKefuError(err, t('kefu.qa.autoReplySaveFailed')))
    }
    finally {
      setSavingAutoReply(false)
    }
  }

  async function pollSourceStatus(ids: number[], interval = 3000, maxAttempts = 40) {
    if (!ids.length)
      return
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval))
      const data = await getChatKit().CorpusSourceAPI.list({ page_size: 100 })
      const stillProcessing = data.items?.some(s => ids.includes(s.id) && s.status === 'processing')
      if (!stillProcessing)
        return
    }
  }

  async function onCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!entryTitle.trim() || !entryContent.trim())
      return
    setError('')
    try {
      const payload = {
        title: entryTitle.trim(),
        question: entryTitle.trim(),
        answer: entryContent.trim(),
        content: entryContent.trim(),
        channel: 'all',
        store: entryStoreId ? Number(entryStoreId) : null,
        is_active: entryActive,
        is_visitor_quick_question: entryQuickQuestion,
      } as any
      if (editingEntryId)
        await getChatKit().CorpusAPI.update(editingEntryId, payload)
      else
        await getChatKit().CorpusAPI.create(payload)
      const wasEditing = Boolean(editingEntryId)
      closeEntryDialog()
      await reload()
      if (wasEditing)
        notifySuccess(t('kefu.qa.entrySaved'))
      else
        notifySuccess(t('kefu.qa.entryAdded'), t('kefu.qa.entryAddedDesc'))
    }
    catch (err) {
      notifyError(t('kefu.qa.entrySaveFailed'), describeKefuError(err, t('kefu.qa.entrySaveFailed')))
    }
  }

  function editEntry(item: CorpusEntry) {
    setEditingEntryId(item.id)
    setEntryTitle(item.title || item.question || '')
    setEntryContent(item.answer || item.content || '')
    setEntryStoreId(item.store ? String(item.store) : '')
    setEntryActive(item.is_active !== false)
    setEntryQuickQuestion(Boolean(item.is_visitor_quick_question))
    setEntryDialogOpen(true)
  }

  async function deleteEntry(item: CorpusEntry) {
    if (!window.confirm(tpl('kefu.qa.deleteEntryConfirm', item.title || item.question || '')))
      return
    setError('')
    try {
      await getChatKit().CorpusAPI.destroy(item.id)
      if (editingEntryId === item.id)
        closeEntryDialog()
      await reload()
      notifySuccess(t('kefu.qa.entryDeleted'))
    }
    catch (err) {
      notifyError(t('kefu.qa.entryDeleteFailed'), describeKefuError(err, t('kefu.qa.entryDeleteFailed')))
    }
  }

  async function deleteSource(item: CorpusSource) {
    if (!window.confirm(tpl('kefu.qa.deleteSourceConfirm', item.name)))
      return
    setError('')
    try {
      await getChatKit().CorpusSourceAPI.destroy(item.id)
      setSelectedSourceIds(prev => prev.filter(id => id !== item.id))
      await reload()
      notifySuccess(t('kefu.qa.sourceDeleted'))
    }
    catch (err) {
      notifyError(t('kefu.qa.sourceDeleteFailed'), describeKefuError(err, t('kefu.qa.sourceDeleteFailed')))
    }
  }

  const pageAlerts = error ? <div className="mr-state-error x1-lc-settings-alert" role="alert">{error}</div> : null

  const syncStatus = (
    <div className="x1-lc-status" aria-live="polite" style={{ marginLeft: 'auto' }}>
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ cursor: 'pointer' }} onClick={() => void reload()} />
      {loading ? t('kefu.common.syncing') : t('kefu.common.synced')}
    </div>
  )

  const tabRail = showInnerTabs ? (
    <div className="x1-lc-settings-tabrail">
      <div className="x1-lc-header-toolbar">
        <div className="x1-lc-toolbar-leading">
          <div className="x1-lc-tabs" role="tablist" aria-label={t('kefu.qa.tabsAria')}>
            {visibleTabs.map(key => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`x1-lc-tab ${tab === key ? 'is-active' : ''}`}
                onClick={() => setTab(key)}
              >
                {key === 'sources' ? t('kefu.qa.tabSources') : t('kefu.qa.tabEntries')}
                {key === 'entries' ? <b>{entriesTotal}</b> : null}
              </button>
            ))}
          </div>
          {syncStatus}
        </div>
      </div>
    </div>
  ) : null

  function renderMediaIcon(item: CorpusSource) {
    const kind = item.media_kind || 'text'
    if (kind === 'video')
      return <Film size={18} className="mr-muted" aria-hidden />
    if (kind === 'image')
      return <ImageIcon size={18} className="mr-muted" aria-hidden />
    return <FileText size={18} className="mr-muted" aria-hidden />
  }

  const settingsWorkspace = (
    <>
        {tabRail}

        {(tab === 'sources' || isUploadsMode) ? (
          <div className="x1-lc-settings-section">
            <div className="x1-lc-main-head kefu-qa-upload-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
              <div className="x1-lc-main-title kefu-qa-upload-head__title">
                <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Upload size={16} className="mr-muted" /> {t('kefu.qa.uploadTitle')}
                </h2>
                <span className="x1-lc-badge">{tpl('kefu.common.countItems', String(sources.length))}</span>
                {!showInnerTabs ? syncStatus : null}
              </div>
              <div className="x1-lc-main-actions kefu-qa-upload-head__actions">
                <input ref={fileInputRef} type="file" multiple accept={CORPUS_ACCEPT} onChange={onUploadFile} disabled={uploading} style={{ display: 'none' }} />
                {selectedCount > 0 ? (
                  <div className="kefu-qa-upload-batch">
                    {selectedCount > 1 ? (
                      <span className="kefu-qa-upload-batch__hint">
                        {t('kefu.qa.batchHint')}
                      </span>
                    ) : null}
                    <div className="kefu-qa-upload-batch__actions">
                      <button type="button" className="x1-lc-btn x1-lc-btn-primary" disabled={generating} onClick={() => openGenerateStoreDialog()}>
                        {generating ? t('kefu.common.updating') : tpl('kefu.qa.batchUpdate', String(selectedCount))}
                      </button>
                      <span className="kefu-qa-upload-batch__meta">
                        {tpl('kefu.qa.selectedContext', String(selectedUnits), String(MAX_BATCH_CONTEXT_UNITS))}
                      </span>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="x1-lc-btn x1-lc-btn-primary"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {uploading ? t('kefu.common.uploading') : t('kefu.qa.uploadBtn')}
                </button>
              </div>
            </div>

            <div className="x1-lc-settings-list">
              {loading ? <div className="x1-lc-empty"><p>{t('kefu.common.loading')}</p></div> : null}
              {!loading && sources.length === 0 ? (
                <div className="x1-lc-empty x1-lc-empty-cta">
                  <div className="x1-lc-empty-icon"><ClipboardList size={28} /></div>
                  <strong>{t('kefu.qa.emptyUploadTitle')}</strong>
                  <p>{t('kefu.qa.emptyUploadDesc')}</p>
                  <div className="x1-lc-empty-actions">
                    <button
                      type="button"
                      className="x1-lc-btn x1-lc-btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t('kefu.qa.uploadBtn')}
                    </button>
                  </div>
                </div>
              ) : null}

              {sources.map(item => {
                const isSelected = selectedSourceIds.includes(item.id)
                const isUsed = Boolean(item.is_used)
                const isProcessing = item.status === 'processing' || generatingSourceId === item.id
                return (
                  <div
                    key={item.id}
                    className="x1-lc-settings-row"
                    style={{
                      alignItems: 'flex-start',
                      background: isSelected ? 'color-mix(in srgb, var(--xiaoone-accent) 10%, transparent)' : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isProcessing}
                      onChange={e => toggleSourceSelection(item, e.target.checked)}
                      style={{ width: 18, height: 18, marginTop: 4, accentColor: 'var(--xiaoone-accent)', flexShrink: 0 }}
                    />
                    {item.preview_url ? (
                      <img
                        src={item.preview_url}
                        alt=""
                        style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--xiaoone-border)', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--xiaoone-border)', background: 'var(--xiaoone-bg-soft)', flexShrink: 0 }}>
                        {renderMediaIcon(item)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.name}</strong>
                        <span className="x1-lc-badge">{MEDIA_KIND_LABEL[item.media_kind || 'text'] || t('kefu.common.material')}</span>
                        {isUsed ? (
                          <span className="x1-lc-badge" style={{ background: 'var(--xiaoone-success-bg)', color: 'var(--xiaoone-success)' }}>{t('kefu.common.used')}</span>
                        ) : null}
                        <span className="x1-lc-badge" style={{ background: item.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : item.status === 'processing' ? '#fff7ed' : '#edf3ff', color: item.status === 'failed' ? '#ef4444' : item.status === 'processing' ? '#c2410c' : '#294b95' }}>
                          {SOURCE_STATUS_LABEL[item.status] || item.status || t('kefu.qa.sourceStatus.pending')}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span>{item.store_name || t('kefu.common.allStores')}</span>
                        <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                        <span>{SOURCE_TYPE_LABEL[item.source_type] || t('kefu.common.sourceMaterial')}</span>
                        <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                        <span>{tpl('kefu.qa.entriesCount', String(item.entries_count || 0))}</span>
                        <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                        <span>{tpl('kefu.qa.contextUnits', String(item.estimated_units || 0))}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="x1-lc-btn x1-lc-btn-primary"
                        disabled={isProcessing || generating}
                        onClick={() => openGenerateStoreDialog(item)}
                      >
                        <Sparkles size={14} />
                        {isProcessing ? t('kefu.common.analyzing') : t('kefu.qa.updateLibrary')}
                      </button>
                      <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteSource(item)}>
                        <Trash2 size={14} /> {t('kefu.common.delete')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {(isQaLibraryMode || tab === 'entries') && !isUploadsMode ? (
          <div className="x1-lc-settings-section">
            <div className="x1-lc-main-head kefu-qa-library-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
              <div className="x1-lc-main-title kefu-qa-library-title">
                <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookText size={16} className="mr-muted" /> {t('kefu.qa.libraryTitle')}
                </h2>
                <span className="x1-lc-badge">{tpl('kefu.common.countItems', String(entriesTotal))}</span>
                <span className="x1-lc-badge">{tpl('kefu.qa.visitorQuickQuestionCount', String(visitorQuickQuestionCount), String(VISITOR_QUICK_QUESTION_LIMIT))}</span>
                <label
                  className={`x1-lc-auto-reply-switch kefu-qa-auto-reply-toggle ${globalAutoReplyEnabled ? 'is-on' : ''} ${savingAutoReply || !sdkRows.length ? 'is-disabled' : ''}`}
                  title={t('kefu.qa.autoReplyTitle')}
                >
                  <input
                    type="checkbox"
                    aria-label={t('kefu.qa.autoReplyAria')}
                    checked={globalAutoReplyEnabled}
                    disabled={savingAutoReply || !sdkRows.length}
                    onChange={e => void onToggleGlobalAutoReply(e.target.checked)}
                  />
                  <span className="kefu-qa-auto-reply-toggle__label">{t('kefu.common.aiAutoReply')}</span>
                  <span className="kefu-qa-auto-reply-toggle__state">
                    {savingAutoReply ? t('kefu.common.savingShort') : globalAutoReplyEnabled ? t('kefu.common.on') : t('kefu.common.off')}
                  </span>
                </label>
                {isQaLibraryMode && !showInnerTabs ? syncStatus : null}
              </div>
              <div className="x1-lc-main-actions">
                <button type="button" className="x1-lc-btn x1-lc-btn-primary" onClick={openEntryDialogForCreate}>
                  <Plus size={14} /> {t('kefu.qa.addEntry')}
                </button>
              </div>
            </div>

            <div className="x1-lc-settings-list">
              {!loading && entries.length === 0 ? (
                <div className="x1-lc-empty x1-lc-empty-cta">
                  <div className="x1-lc-empty-icon"><BookText size={28} /></div>
                  <strong>{t('kefu.qa.emptyLibraryTitle')}</strong>
                  <p>{t('kefu.qa.emptyLibraryDesc')}</p>
                  <div className="x1-lc-empty-actions">
                    <button type="button" className="x1-lc-btn x1-lc-btn-primary" onClick={() => navigate('/workbench/kefu/settings?tab=uploads')}>
                      {t('kefu.qa.goUpload')}
                    </button>
                    <button type="button" className="x1-lc-btn" onClick={openEntryDialogForCreate}>
                      {t('kefu.qa.addManual')}
                    </button>
                  </div>
                </div>
              ) : null}

              {entries.map(item => (
                <div key={item.id} className="x1-lc-settings-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.title}</strong>
                      <span className="x1-lc-badge" style={{ background: item.is_active ? 'var(--xiaoone-success-bg)' : '#f1f3f7', color: item.is_active ? 'var(--xiaoone-success)' : 'var(--xiaoone-fg-mute)' }}>
                        {item.is_active ? t('kefu.common.enabled') : t('kefu.common.disabled')}
                      </span>
                      {item.is_visitor_quick_question ? (
                        <span className="x1-lc-badge">{t('kefu.qa.visitorQuickQuestion')}</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span>{item.store_name || t('kefu.common.allStores')}</span>
                      <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                      <span>{item.channel}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'color-mix(in srgb, var(--xiaoone-fg) 80%, #000)', lineHeight: 1.5, whiteSpace: 'pre-wrap', background: 'color-mix(in srgb, var(--xiaoone-bg-soft) 20%, #fff)', padding: 12, borderRadius: 8, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 60%, transparent)' }}>
                      {item.answer || item.question || t('kefu.common.noReplyContent')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="x1-lc-btn" onClick={() => editEntry(item)}>
                      <Pencil size={14} /> {t('kefu.common.edit')}
                    </button>
                    <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteEntry(item)}>
                      <Trash2 size={14} /> {t('kefu.common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

    </>
  )

  const formDialogs = (
    <>
      <Dialog open={entryDialogOpen} onOpenChange={(open) => open ? setEntryDialogOpen(true) : closeEntryDialog()}>
        <DialogContent className="kefu-qa-dialog">
          <form className="kefu-qa-dialog__form" onSubmit={onCreateEntry}>
            <DialogHeader className="kefu-qa-dialog__header">
              <div className="kefu-qa-dialog__heading">
                <span className="kefu-qa-dialog__icon" aria-hidden="true">
                  {editingEntryId ? <Pencil size={17} /> : <Plus size={17} />}
                </span>
                <div>
                  <DialogTitle className="kefu-qa-dialog__title">
                    {editingEntryId ? t('kefu.qa.dialogEditTitle') : t('kefu.qa.dialogAddTitle')}
                  </DialogTitle>
                  <DialogDescription className="kefu-qa-dialog__description">
                    {editingEntryId ? t('kefu.qa.dialogEditDesc') : t('kefu.qa.dialogAddDesc')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="kefu-qa-dialog__body">
              <div className="kefu-qa-dialog__grid">
                <div className="kefu-qa-dialog__field">
                  <label htmlFor="entry-title">{t('kefu.qa.fieldTitle')}</label>
                  <input
                    id="entry-title"
                    className="kefu-qa-dialog__control"
                    value={entryTitle}
                    onChange={e => setEntryTitle(e.target.value)}
                    placeholder={t('kefu.qa.fieldTitlePlaceholder')}
                    autoFocus
                  />
                </div>
                <div className="kefu-qa-dialog__field">
                  <label htmlFor="entry-store">{t('kefu.qa.fieldStore')}</label>
                  <select
                    id="entry-store"
                    className="kefu-qa-dialog__control"
                    value={entryStoreId}
                    onChange={e => setEntryStoreId(e.target.value)}
                  >
                    <option value="">{t('kefu.common.allStores')}</option>
                    {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="kefu-qa-dialog__field">
                <label htmlFor="entry-content">{t('kefu.qa.fieldContent')}</label>
                <textarea
                  id="entry-content"
                  className="kefu-qa-dialog__control kefu-qa-dialog__textarea"
                  value={entryContent}
                  onChange={e => setEntryContent(e.target.value)}
                  placeholder={t('kefu.qa.fieldContentPlaceholder')}
                />
              </div>
              <label className="kefu-qa-dialog__check">
                <input type="checkbox" checked={entryActive} onChange={e => setEntryActive(e.target.checked)} />
                <span>
                  <strong>{t('kefu.qa.enableEntry')}</strong>
                  <small>{t('kefu.qa.enableEntryHint')}</small>
                </span>
              </label>
              <label className="kefu-qa-dialog__check">
                <input type="checkbox" checked={entryQuickQuestion} onChange={e => setEntryQuickQuestion(e.target.checked)} />
                <span>
                  <strong>{t('kefu.qa.visitorQuickQuestion')}</strong>
                  <small>{tpl('kefu.qa.visitorQuickQuestionHint', String(VISITOR_QUICK_QUESTION_LIMIT))}</small>
                </span>
              </label>
            </div>

            <DialogFooter className="kefu-qa-dialog__footer">
              <button type="button" className="x1-lc-btn" onClick={closeEntryDialog}>
                <X size={14} /> {t('kefu.common.cancel')}
              </button>
              <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={!entryTitle.trim() || !entryContent.trim()}>
                <Save size={14} /> {editingEntryId ? t('kefu.qa.saveEntry') : t('kefu.qa.addEntryBtn')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={generateStoreDialogOpen} onOpenChange={(open) => open ? setGenerateStoreDialogOpen(true) : closeGenerateStoreDialog()}>
        <DialogContent className="kefu-qa-dialog">
          <DialogHeader className="kefu-qa-dialog__header">
            <div className="kefu-qa-dialog__heading">
              <span className="kefu-qa-dialog__icon" aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <div>
                <DialogTitle className="kefu-qa-dialog__title">
                  {t('kefu.qa.updateStoreDialogTitle')}
                </DialogTitle>
                <DialogDescription className="kefu-qa-dialog__description">
                  {pendingGenerateSource
                    ? tpl('kefu.qa.updateStoreDialogDescSingle', pendingGenerateSource.name)
                    : tpl('kefu.qa.updateStoreDialogDescBatch', String(selectedCount))}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="kefu-qa-dialog__body">
            <div className="kefu-qa-dialog__field">
              <label htmlFor="generate-store">{t('kefu.qa.fieldStore')}</label>
              <select
                id="generate-store"
                className="kefu-qa-dialog__control"
                value={generateStoreId}
                onChange={e => setGenerateStoreId(e.target.value)}
              >
                <option value="">{t('kefu.common.allStores')}</option>
                {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </div>
          </div>

          <DialogFooter className="kefu-qa-dialog__footer">
            <button type="button" className="x1-lc-btn" onClick={closeGenerateStoreDialog}>
              <X size={14} /> {t('kefu.common.cancel')}
            </button>
            <button type="button" className="x1-lc-btn x1-lc-btn-primary" disabled={generating} onClick={() => void onConfirmGenerateStore()}>
              <Sparkles size={14} /> {t('kefu.qa.updateLibrary')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )

  if (embedded) {
    return (
      <section className="mr-kefu-auto-reply-block" aria-label={t('kefu.qa.embeddedAria')}>
        {pageAlerts}
        {settingsWorkspace}
        {formDialogs}
      </section>
    )
  }

  return (
    <div className="x1-lc-container x1-lc-settings-page">
      {pageAlerts}

      <div className="x1-lc-body x1-lc-settings-workspace">
        {settingsWorkspace}
      </div>
      {formDialogs}
    </div>
  )
}
