import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Building2, Globe2, Link2, Plus, RefreshCw, Save, Store, Trash2, X } from 'lucide-react'
import { getChatKit, type Store as StoreRow } from '@xiaoone/chat-kit'
import { ApiError } from '../lib/apiErrors'

type StoreView = StoreRow & {
  has_sdk?: boolean
  is_demo?: boolean
  timezone?: string
  welcome_message?: string
}

interface StoreFormState {
  name: string
  slug: string
  domain: string
  welcome_message: string
  timezone: string
  description: string
  is_active: boolean
}

const EMPTY_FORM: StoreFormState = {
  name: '',
  slug: '',
  domain: '',
  welcome_message: '您好！欢迎光临',
  timezone: 'Asia/Shanghai',
  description: '',
  is_active: true,
}

export function KefuStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<StoreFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const res = await getChatKit().StoreAPI.list()
      setStores(res.items)
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '店铺加载失败')
      else
        setError('店铺加载失败')
      setStores([])
    }
    finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function editStore(row: StoreRow) {
    const item = row as StoreView
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      slug: row.slug || '',
      domain: row.domain || '',
      welcome_message: item.welcome_message || '您好！欢迎光临',
      timezone: item.timezone || 'Asia/Shanghai',
      description: row.description || '',
      is_active: row.is_active !== false,
    })
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSaveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim())
      return
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        domain: form.domain.trim() || undefined,
        welcome_message: form.welcome_message.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      }
      if (editingId)
        await getChatKit().StoreAPI.update(editingId, payload)
      else
        await getChatKit().StoreAPI.create(payload as any)
      resetForm()
      await reload()
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '保存失败')
      else
        setError('保存失败')
    }
    finally {
      setSaving(false)
    }
  }

  async function deleteStore(row: StoreRow) {
    const typedName = window.prompt(`删除店铺「${row.name}」会影响该店铺的 SDK 接入配置和客户咨询筛选。若确认删除，请输入完整店铺名称。`)
    if (typedName == null)
      return
    if (typedName.trim() !== row.name) {
      setError('已取消删除：输入的店铺名称不匹配。')
      return
    }
    const confirmed = window.confirm(`请再次确认：确定删除店铺「${row.name}」？此操作不能从当前页面撤销。`)
    if (!confirmed)
      return
    setError('')
    try {
      await getChatKit().StoreAPI.destroy(row.id)
      if (editingId === row.id)
        resetForm()
      await reload()
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '删除失败')
      else
        setError('删除失败')
    }
  }

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q)
      return stores
    return stores.filter((item) => {
      const row = item as StoreView
      return [row.name, row.slug, row.domain, row.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    })
  }, [search, stores])

  const activeCount = stores.filter(item => item.is_active !== false).length
  const connectedCount = stores.filter(item => Boolean((item as StoreView).has_sdk)).length

  return (
    <div className="x1-lc-container">
      <header className="x1-lc-header">
        <div className="x1-lc-header-top">
          <h1><Store size={18} className="mr-muted" /> 店铺列表与接入状态</h1>
          <div className="x1-lc-status">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ cursor: 'pointer' }} onClick={() => void reload()} />
            {loading ? '同步中' : '已同步'}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>按店铺维护客户咨询接入基础信息，确认哪些店铺已启用、已完成 SDK 配置。</p>
      </header>

      {error ? <div className="mr-state-error" style={{ margin: '0 20px' }}>{error}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <section className="x1-lc-header">
          <div className="x1-lc-header-top">
            <h2 style={{ fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Store size={16} className="mr-muted" /> 店铺总数</h2>
            <span className="x1-lc-badge">{activeCount} 个启用</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>当前共 {stores.length} 个店铺配置。</p>
        </section>
        
        <section className="x1-lc-header">
          <div className="x1-lc-header-top">
            <h2 style={{ fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Link2 size={16} className="mr-muted" /> 接入配置</h2>
            <span className="x1-lc-badge">SDK</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>{connectedCount} 个店铺已返回 SDK 接入标记。</p>
        </section>
      </div>

      <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
        <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
          <div className="x1-lc-main-title">
            <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} className="mr-muted" /> 
              {editingId ? '编辑店铺' : '新建店铺'}
            </h2>
          </div>
        </div>
        
        <form style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }} onSubmit={onSaveStore}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>店铺名称</label>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="店铺名称（必填）" 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>Slug (可选)</label>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', opacity: editingId ? 0.6 : 1 }}
                value={form.slug} onChange={e => updateForm('slug', e.target.value)} placeholder="唯一标识" disabled={Boolean(editingId)} 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>域名 (可选)</label>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={form.domain} onChange={e => updateForm('domain', e.target.value)} placeholder="如 example.com" 
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>访客欢迎语</label>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={form.welcome_message} onChange={e => updateForm('welcome_message', e.target.value)} placeholder="如：您好！欢迎光临" 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>时区</label>
              <input 
                className="x1-lc-composer-inner"
                style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                value={form.timezone} onChange={e => updateForm('timezone', e.target.value)} placeholder="Asia/Shanghai" 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <label className="x1-lc-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', cursor: 'pointer', background: 'color-mix(in srgb, var(--xiaoone-bg-soft) 50%, #fff)', border: '1px solid var(--xiaoone-border)' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => updateForm('is_active', e.target.checked)} />
                启用店铺
              </label>
              <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={saving}>
                <Save size={14} />
                {saving ? '保存中...' : editingId ? '保存店铺' : '新增店铺'}
              </button>
              {editingId ? (
                <button type="button" className="x1-lc-btn" onClick={resetForm}>
                  <X size={14} /> 取消
                </button>
              ) : null}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>描述 (可选)</label>
            <textarea 
              className="x1-lc-composer-inner"
              style={{ padding: '8px 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', resize: 'vertical', minHeight: 60 }}
              value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="简短描述..." 
            />
          </div>
        </form>

        <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
          <div className="x1-lc-main-title">
            <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={16} className="mr-muted" /> 
              已添加的店铺
            </h2>
            <span className="x1-lc-badge">{filteredStores.length} / {stores.length}</span>
          </div>
          <div className="x1-lc-filters">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索名称 / slug / 域名..." />
          </div>
        </div>
        
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? <div className="x1-lc-empty"><p>加载中...</p></div> : null}
          {!loading && filteredStores.length === 0 ? (
            <div className="x1-lc-empty">
              <div className="x1-lc-empty-icon"><Store size={24} /></div>
              <strong>暂无店铺</strong>
              <p>创建后可用于客户咨询筛选、访客入口和 SDK 接入配置。</p>
            </div>
          ) : null}
          
          {filteredStores.map(item => {
            const row = item as StoreView
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: '#fafbfc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.name}</strong>
                    {row.is_demo ? <span className="x1-lc-badge">示例</span> : null}
                    <span className="x1-lc-badge" style={{ background: item.is_active !== false ? 'var(--xiaoone-success-bg)' : '#f1f3f7', color: item.is_active !== false ? 'var(--xiaoone-success)' : 'var(--xiaoone-fg-mute)' }}>
                      {item.is_active !== false ? '启用' : '停用'}
                    </span>
                    <span className="x1-lc-badge" style={{ background: row.has_sdk ? '#edf3ff' : '#f1f3f7', color: row.has_sdk ? '#294b95' : 'var(--xiaoone-fg-mute)' }}>
                      <Link2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> 
                      {row.has_sdk ? '已接入' : '待接入'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{item.slug || '-'}</span>
                    <span>·</span>
                    <span>{item.domain || '未配置域名'}</span>
                    <span>·</span>
                    <span>{row.timezone || 'Asia/Shanghai'}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe2 size={13} /> {row.welcome_message || '访客欢迎语未配置'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="x1-lc-btn" onClick={() => editStore(item)}>编辑</button>
                  <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteStore(item)}>
                    <Trash2 size={14} /> 删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
