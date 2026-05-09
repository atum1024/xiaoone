import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { BookText, ClipboardList, RefreshCw, Sparkles, Upload } from 'lucide-react'
import { getChatKit, type CorpusEntry, type CorpusSource, type QuickReply } from '@xiaoone/chat-kit'
import { ApiError } from '../lib/apiErrors'

type TabKey = 'sources' | 'entries' | 'generate' | 'suggestions'

const SOURCE_TYPE_LABEL: Record<string, string> = {
  upload: '上传资料',
  paste: '粘贴资料',
  text: '文本资料',
  file: '文件资料',
}

const SOURCE_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  ready: '可生成',
  done: '已完成',
  failed: '处理失败',
}

export function KefuQaTemplatesPage() {
  const [tab, setTab] = useState<TabKey>('sources')
  const [entries, setEntries] = useState<CorpusEntry[]>([])
  const [sources, setSources] = useState<CorpusSource[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [entryTitle, setEntryTitle] = useState('')
  const [entryContent, setEntryContent] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickContent, setQuickContent] = useState('')
  const [pasteName, setPasteName] = useState('')
  const [pasteText, setPasteText] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const [entryRes, sourceRes, quickRes] = await Promise.all([
        getChatKit().CorpusAPI.list(),
        getChatKit().CorpusSourceAPI.list(),
        getChatKit().QuickReplyAPI.list(),
      ])
      setEntries(entryRes.items)
      setSources(sourceRes.items)
      setQuickReplies(quickRes.items)
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '问答模板加载失败')
      else
        setError('问答模板加载失败')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const selectedCount = selectedSourceIds.length
  const canGenerate = useMemo(() => selectedSourceIds.length > 0, [selectedSourceIds])

  async function onUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    event.target.value = ''
    if (!files?.length)
      return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files))
        await getChatKit().CorpusSourceAPI.upload({ file, name: file.name })
      await reload()
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '上传失败')
      else
        setError('上传失败')
    }
    finally {
      setUploading(false)
    }
  }

  async function onPasteSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pasteText.trim())
      return
    setUploading(true)
    setError('')
    try {
      await getChatKit().CorpusSourceAPI.paste({
        name: pasteName.trim() || '粘贴资料',
        content_text: pasteText.trim(),
      })
      setPasteName('')
      setPasteText('')
      await reload()
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '粘贴保存失败')
      else
        setError('粘贴保存失败')
    }
    finally {
      setUploading(false)
    }
  }

  async function onGenerateSelected() {
    if (!canGenerate)
      return
    setGenerating(true)
    setError('')
    try {
      await getChatKit().CorpusSourceAPI.generateSelected({
        source_ids: selectedSourceIds,
        channel: 'all',
      })
      setSelectedSourceIds([])
      await reload()
      setTab('entries')
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '生成失败')
      else
        setError('生成失败')
    }
    finally {
      setGenerating(false)
    }
  }

  async function onCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!entryTitle.trim() || !entryContent.trim())
      return
    setError('')
    try {
      await getChatKit().CorpusAPI.create({
        title: entryTitle.trim(),
        content: entryContent.trim(),
        channel: 'all',
      } as any)
      setEntryTitle('')
      setEntryContent('')
      await reload()
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '新增问答条目失败')
      else
        setError('新增问答条目失败')
    }
  }

  async function onCreateQuickReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quickTitle.trim() || !quickContent.trim())
      return
    setError('')
    try {
      await getChatKit().QuickReplyAPI.create({
        title: quickTitle.trim(),
        content: quickContent.trim(),
      })
      setQuickTitle('')
      setQuickContent('')
      await reload()
      setTab('suggestions')
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '新增建议回复失败')
      else
        setError('新增建议回复失败')
    }
  }

  return (
    <div className="x1-lc-container">
      <header className="x1-lc-header">
        <div className="x1-lc-header-top">
          <h1><BookText size={18} className="mr-muted" /> 问答模板</h1>
          <div className="x1-lc-status">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ cursor: 'pointer' }} onClick={() => void reload()} />
            {loading ? '同步中' : '已同步'}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>商户只需要按资料来源、问答条目、生成问答、建议回复维护客服可用内容。</p>
        <div className="x1-lc-header-toolbar">
          <div className="x1-lc-tabs" role="tablist">
            <button type="button" className={`x1-lc-tab ${tab === 'sources' ? 'is-active' : ''}`} onClick={() => setTab('sources')}>资料来源</button>
            <button type="button" className={`x1-lc-tab ${tab === 'entries' ? 'is-active' : ''}`} onClick={() => setTab('entries')}>问答条目 <b>{entries.length}</b></button>
            <button type="button" className={`x1-lc-tab ${tab === 'generate' ? 'is-active' : ''}`} onClick={() => setTab('generate')}>生成问答</button>
            <button type="button" className={`x1-lc-tab ${tab === 'suggestions' ? 'is-active' : ''}`} onClick={() => setTab('suggestions')}>建议回复</button>
          </div>
        </div>
      </header>

      {error ? <div className="mr-state-error" style={{ margin: '0 20px' }}>{error}</div> : null}

      {tab === 'sources' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={16} className="mr-muted" /> 上传或粘贴资料
              </h2>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, padding: 20, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <label className="mr-upload-box" style={{ background: '#fafbfc', border: '1px dashed color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' }}>
              <Upload size={24} style={{ color: 'var(--xiaoone-fg-mute)', marginBottom: 12 }} />
              <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>上传文件资料</strong>
              <span style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', marginTop: 8 }}>支持多文件上传，后续可批量生成问答。</span>
              <input type="file" multiple onChange={onUploadFile} disabled={uploading} style={{ display: 'none' }} />
              <div className="x1-lc-btn" style={{ marginTop: 16 }}>{uploading ? '上传中...' : '选择文件'}</div>
            </label>
            
            <form onSubmit={onPasteSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={pasteName} onChange={e => setPasteName(e.target.value)} placeholder="资料名称（可选）" 
              />
              <textarea 
                className="x1-lc-composer-inner"
                style={{ padding: '12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', resize: 'vertical', minHeight: 120, flex: 1 }}
                value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="粘贴资料内容..." 
              />
              <button type="submit" className="x1-lc-btn x1-lc-btn-primary" style={{ alignSelf: 'flex-start' }} disabled={uploading}>
                {uploading ? '处理中...' : '保存粘贴资料'}
              </button>
            </form>
          </div>

          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} className="mr-muted" /> 
                已导入资料
              </h2>
              <span className="x1-lc-badge">{sources.length} 个文件</span>
            </div>
          </div>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? <div className="x1-lc-empty"><p>加载中...</p></div> : null}
            {!loading && sources.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><ClipboardList size={24} /></div>
                <strong>暂无资料来源</strong>
                <p>先上传文件或粘贴资料，再到「生成问答」中多选生成。</p>
              </div>
            ) : null}
            
            {sources.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: '#fafbfc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.name}</strong>
                    <span className="x1-lc-badge" style={{ background: item.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : '#edf3ff', color: item.status === 'failed' ? '#ef4444' : '#294b95' }}>
                      {item.status === 'failed' ? '处理失败' : '可用'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{SOURCE_TYPE_LABEL[item.source_type] || '资料来源'}</span>
                    <span>·</span>
                    <span>{SOURCE_STATUS_LABEL[item.status] || item.status || '待处理'}</span>
                    <span>·</span>
                    <span>{item.entries_count || 0} 条</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'generate' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} className="mr-muted" /> 生成问答
              </h2>
            </div>
            <div className="x1-lc-main-actions">
              <button type="button" className="x1-lc-btn x1-lc-btn-primary" disabled={!canGenerate || generating} onClick={() => void onGenerateSelected()}>
                {generating ? '生成中...' : `生成问答（已选 ${selectedCount}）`}
              </button>
            </div>
          </div>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, marginBottom: 8, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>多选资料来源后生成问答条目，生成结果进入「问答条目」维护。</p>
            {loading ? <div className="x1-lc-empty"><p>加载中...</p></div> : null}
            {!loading && sources.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><Sparkles size={24} /></div>
                <strong>暂无可生成资料</strong>
                <p>请先在「资料来源」上传或粘贴资料。</p>
              </div>
            ) : null}
            
            {sources.map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: selectedSourceIds.includes(item.id) ? '#f4f8ff' : '#fafbfc', cursor: 'pointer', transition: 'background 0.15s' }}>
                <input
                  type="checkbox"
                  checked={selectedSourceIds.includes(item.id)}
                  onChange={(e) => {
                    setSelectedSourceIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id))
                  }}
                  style={{ width: 18, height: 18, accentColor: 'var(--xiaoone-accent)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.name}</strong>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{SOURCE_TYPE_LABEL[item.source_type] || '资料来源'}</span>
                    <span>·</span>
                    <span>{SOURCE_STATUS_LABEL[item.status] || item.status || '待处理'}</span>
                    <span>·</span>
                    <span>已生成 {item.entries_count || 0} 条</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'entries' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookText size={16} className="mr-muted" /> 问答条目
              </h2>
              <span className="x1-lc-badge">{entries.length} 条</span>
            </div>
          </div>
          
          <form onSubmit={onCreateEntry} style={{ padding: 20, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={entryTitle} onChange={e => setEntryTitle(e.target.value)} placeholder="问题标题" 
              />
              <textarea 
                className="x1-lc-composer-inner"
                style={{ padding: '8px 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', resize: 'vertical', minHeight: 60 }}
                value={entryContent} onChange={e => setEntryContent(e.target.value)} placeholder="标准回复内容" 
              />
            </div>
            <button type="submit" className="x1-lc-btn x1-lc-btn-primary" style={{ height: 36, flexShrink: 0 }}>新增条目</button>
          </form>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!loading && entries.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><BookText size={24} /></div>
                <strong>暂无问答条目</strong>
                <p>可以手动新增，也可以从「生成问答」批量生成。</p>
              </div>
            ) : null}
            
            {entries.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: '#fafbfc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.title}</strong>
                    <span className="x1-lc-badge" style={{ background: item.is_active ? 'var(--xiaoone-success-bg)' : '#f1f3f7', color: item.is_active ? 'var(--xiaoone-success)' : 'var(--xiaoone-fg-mute)' }}>
                      {item.is_active ? '启用' : '停用'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{item.store_name || '全部店铺'}</span>
                    <span>·</span>
                    <span>{item.channel}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'color-mix(in srgb, var(--xiaoone-fg) 80%, #000)', lineHeight: 1.5, whiteSpace: 'pre-wrap', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 60%, transparent)' }}>
                    {item.answer || item.question || '未填写回复内容'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'suggestions' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} className="mr-muted" /> 建议回复
              </h2>
            </div>
            <span style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>用于访客入口的推荐问题和客服回复沉淀。</span>
          </div>
          
          <form onSubmit={onCreateQuickReply} style={{ padding: 20, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={quickTitle} onChange={e => setQuickTitle(e.target.value)} placeholder="问题标题" 
              />
              <textarea 
                className="x1-lc-composer-inner"
                style={{ padding: '8px 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', resize: 'vertical', minHeight: 60 }}
                value={quickContent} onChange={e => setQuickContent(e.target.value)} placeholder="建议回复内容" 
              />
            </div>
            <button type="submit" className="x1-lc-btn x1-lc-btn-primary" style={{ height: 36, flexShrink: 0 }}>新增建议回复</button>
          </form>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!loading && quickReplies.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><ClipboardList size={24} /></div>
                <strong>暂无建议回复</strong>
                <p>添加常见问题后，客服处理会话时可更快选择合适回复。</p>
              </div>
            ) : null}
            
            {quickReplies.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: '#fafbfc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.title}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{item.store_name || '全部店铺'}</span>
                    <span>·</span>
                    <span className="x1-lc-badge">{(item.tags || '').trim() || '无标签'}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--xiaoone-fg)', lineHeight: 1.5 }}>
                    {item.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
