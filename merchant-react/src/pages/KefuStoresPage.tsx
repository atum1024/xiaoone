import { FormEvent, useEffect, useState } from 'react'
import { Globe2, Link2, Plus, Save, Store, Trash2, X } from 'lucide-react'
import { getChatKit, type Store as StoreRow } from '@xiaoone/chat-kit'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import { describeKefuError } from '../lib/apiErrors'

type StoreView = StoreRow & {
  has_sdk?: boolean
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

type StoreFormFieldErrors = Partial<Record<keyof StoreFormState, string>>

const EMPTY_FORM: StoreFormState = {
  name: '',
  slug: '',
  domain: '',
  welcome_message: '',
  timezone: 'Asia/Shanghai',
  description: '',
  is_active: true,
}

const TIMEZONE_OPTIONS = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Europe/London',
  'Europe/Paris',
  'America/Los_Angeles',
  'America/New_York',
  'UTC',
]

function slugify(value: string, fallbackPrefix = 'store') {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`
}

function sanitizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function cleanErrorMessage(value: unknown): string {
  if (typeof value === 'string')
    return value.trim()
  if (Array.isArray(value))
    return value.map(cleanErrorMessage).filter(Boolean).join('；')
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return cleanErrorMessage(record.message || record.detail || record.error)
  }
  return ''
}

function storeFormErrorsFromApi(error: unknown, t: (key: string) => string): { fields: StoreFormFieldErrors; message: string } {
  const response = (error as { response?: { data?: unknown } })?.response
  const data = response?.data
  const fields: StoreFormFieldErrors = {}
  const assign = (key: keyof StoreFormState, value: unknown) => {
    const message = cleanErrorMessage(value)
    if (message)
      fields[key] = message
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    assign('name', record.name)
    assign('slug', record.slug)
    assign('domain', record.domain)
    const nested = record.data && typeof record.data === 'object' ? record.data as Record<string, unknown> : {}
    const nestedField = cleanErrorMessage(nested.field)
    const nestedError = cleanErrorMessage(nested.error || record.message)
    if (nestedField === 'slug' && nestedError)
      fields.slug = nestedError === 'duplicate_slug' ? t('kefu.stores.fieldSlugDuplicate') : nestedError
    const message = cleanErrorMessage(record.message || record.detail)
    if (!fields.slug && /slug/i.test(message) && /(exist|duplicate|重复|已存在)/i.test(message))
      fields.slug = t('kefu.stores.fieldSlugDuplicate')
    return { fields, message }
  }
  return { fields, message: '' }
}

function sanitizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^\w.-]/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 128)
}

export function KefuStoresPage() {
  const { t, tpl } = usePreferences()
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<StoreFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [formFieldErrors, setFormFieldErrors] = useState<StoreFormFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const storeRes = await getChatKit().StoreAPI.list()
      setStores(storeRes.items)
    }
    catch (err) {
      setError(describeKefuError(err, t('kefu.stores.loadFailed')))
      setStores([])
    }
    finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFormFieldErrors(prev => ({ ...prev, [key]: '' }))
  }

  function updateStoreName(value: string) {
    setForm(prev => ({
      ...prev,
      name: value,
      slug: !editingId && !slugTouched ? slugify(value) : prev.slug,
    }))
    setFormFieldErrors(prev => ({ ...prev, name: '', slug: !editingId && !slugTouched ? '' : prev.slug }))
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormFieldErrors({})
    setSlugTouched(false)
  }

  function openCreateStore() {
    resetForm()
    setFormOpen(true)
  }

  function closeFormDialog() {
    if (saving)
      return
    setFormOpen(false)
    resetForm()
  }

  function editStore(row: StoreRow) {
    const item = row as StoreView
    setFormError('')
    setFormFieldErrors({})
    setSlugTouched(true)
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      slug: row.slug || '',
      domain: row.domain || '',
      welcome_message: item.welcome_message || t('kefu.stores.defaultWelcome'),
      timezone: item.timezone || 'Asia/Shanghai',
      description: row.description || '',
      is_active: row.is_active !== false,
    })
    setFormOpen(true)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSaveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) {
      setFormError(t('kefu.stores.fieldNameRequiredForm'))
      setFormFieldErrors({ name: t('kefu.stores.fieldNameRequired') })
      return
    }
    if (form.slug.trim() && sanitizeSlug(form.slug) !== form.slug.trim()) {
      setFormError(t('kefu.stores.fieldSlugInvalid'))
      setFormFieldErrors({ slug: t('kefu.stores.fieldSlugInvalidShort') })
      return
    }
    if (form.domain.trim() && sanitizeDomain(form.domain) !== form.domain.trim().toLowerCase().replace(/^https?:\/\//, '')) {
      setFormError(t('kefu.stores.fieldDomainInvalid'))
      setFormFieldErrors({ domain: t('kefu.stores.fieldDomainInvalidShort') })
      return
    }
    setSaving(true)
    setFormError('')
    setFormFieldErrors({})
    try {
      const payload = {
        name: form.name.trim(),
        slug: sanitizeSlug(form.slug) || slugify(form.name),
        domain: sanitizeDomain(form.domain) || undefined,
        welcome_message: form.welcome_message.trim() || undefined,
        timezone: form.timezone || 'Asia/Shanghai',
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      }
      if (editingId)
        await getChatKit().StoreAPI.update(editingId, payload)
      else
        await getChatKit().StoreAPI.create(payload as any)
      setFormOpen(false)
      resetForm()
      await reload()
    }
    catch (err) {
      const parsed = storeFormErrorsFromApi(err, t)
      const hasFieldErrors = Object.keys(parsed.fields).length > 0
      if (hasFieldErrors)
        setFormFieldErrors(parsed.fields)
      setFormError(hasFieldErrors ? t('kefu.common.checkFormFields') : (parsed.message || describeKefuError(err, t('kefu.common.saveFailed'))))
    }
    finally {
      setSaving(false)
    }
  }

  async function deleteStore(row: StoreRow) {
    const typedName = window.prompt(tpl('kefu.stores.deleteStorePrompt', row.name))
    if (typedName == null)
      return
    if (typedName.trim() !== row.name) {
      setError(t('kefu.stores.deleteStoreMismatch'))
      return
    }
    const confirmed = window.confirm(tpl('kefu.stores.deleteStoreConfirm', row.name))
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
      setError(describeKefuError(err, t('kefu.stores.deleteStoreFailed')))
    }
  }

  return (
    <div className="x1-lc-container x1-lc-settings-page">
      {error ? <div className="mr-state-error x1-lc-settings-alert">{error}</div> : null}

      <div className="x1-lc-body x1-lc-settings-workspace">
        <div className="x1-lc-settings-section">
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-toolbar-leading">
              <div className="x1-lc-main-title">
                <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={16} className="mr-muted" />
                  {t('kefu.stores.listTitle')}
                </h2>
                <span className="x1-lc-badge">{stores.length}</span>
              </div>
            </div>
            <div className="x1-lc-main-actions">
              <button type="button" className="x1-lc-btn x1-lc-btn-primary" onClick={openCreateStore}>
                <Plus size={14} />
                {t('kefu.stores.createStore')}
              </button>
            </div>
          </div>

          <div className="x1-lc-settings-list">
            {loading ? <div className="x1-lc-empty"><p>{t('kefu.common.loading')}</p></div> : null}
            {!loading && stores.length === 0 ? (
              <div className="x1-lc-empty x1-lc-empty-cta">
                <div className="x1-lc-empty-icon"><Store size={28} /></div>
                <strong>{t('kefu.stores.emptyTitle')}</strong>
                <p>{t('kefu.stores.emptyDesc')}</p>
                <div className="x1-lc-empty-actions">
                  <button
                    type="button"
                    className="x1-lc-btn x1-lc-btn-primary"
                    onClick={openCreateStore}
                  >
                    {t('kefu.stores.createStore')}
                  </button>
                </div>
              </div>
            ) : null}

            {stores.map((item) => {
              const row = item as StoreView
              return (
                <div key={item.id} className="x1-lc-settings-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.name}</strong>
                      <span className="x1-lc-badge" style={{ background: item.is_active !== false ? 'var(--xiaoone-success-bg)' : '#f1f3f7', color: item.is_active !== false ? 'var(--xiaoone-success)' : 'var(--xiaoone-fg-mute)' }}>
                        {item.is_active !== false ? t('kefu.common.enabled') : t('kefu.common.disabled')}
                      </span>
                      <span className="x1-lc-badge" style={{ background: row.has_sdk && item.is_active !== false ? '#edf3ff' : '#f1f3f7', color: row.has_sdk && item.is_active !== false ? '#294b95' : 'var(--xiaoone-fg-mute)' }}>
                        <Link2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                        {row.has_sdk ? (item.is_active !== false ? t('kefu.stores.connected') : t('kefu.stores.paused')) : t('kefu.stores.pendingConnect')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span>{item.slug || '—'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.domain || t('kefu.stores.noDomain')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{row.timezone || 'Asia/Shanghai'}</span>
                      <span aria-hidden="true">·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe2 size={13} aria-hidden /> {row.welcome_message || t('kefu.stores.welcomeNotSet')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="x1-lc-btn" onClick={() => editStore(item)}>{t('kefu.common.edit')}</button>
                    <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteStore(item)}>
                      <Trash2 size={14} /> {t('kefu.common.delete')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => open ? setFormOpen(true) : closeFormDialog()}>
        <DialogContent className="w-[min(920px,calc(100vw-32px))] max-w-none max-h-[min(88vh,760px)] overflow-y-auto p-0 gap-0">
          <form onSubmit={onSaveStore}>
            <DialogHeader className="px-5 py-4 pr-12 border-b border-[color-mix(in_srgb,var(--xiaoone-border)_80%,transparent)]">
              <DialogTitle className="flex items-center gap-2 text-[16px]">
                {editingId ? <Store size={16} className="mr-muted" /> : <Plus size={16} className="mr-muted" />}
                {editingId ? t('kefu.stores.dialogEditStore') : t('kefu.stores.dialogCreateStore')}
              </DialogTitle>
              <DialogDescription>
                {editingId ? t('kefu.stores.dialogEditStoreDesc') : t('kefu.stores.dialogCreateStoreDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="x1-lc-settings-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError ? <div className="mr-state-error x1-lc-settings-alert">{formError}</div> : null}

              <div className="x1-lc-settings-form-grid">
                <div className="x1-lc-settings-field">
                  <label htmlFor="store-name">{t('kefu.stores.fieldName')}</label>
                  <input
                    id="store-name"
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: `1px solid ${formFieldErrors.name ? 'var(--xiaoone-danger)' : 'var(--xiaoone-border)'}`, borderRadius: 6, outline: 'none' }}
                    value={form.name}
                    onChange={e => updateStoreName(e.target.value)}
                    placeholder={t('kefu.stores.fieldNamePlaceholder')}
                    autoFocus
                    aria-invalid={Boolean(formFieldErrors.name)}
                    aria-describedby={formFieldErrors.name ? 'store-name-error' : undefined}
                  />
                  {formFieldErrors.name ? <small id="store-name-error" style={{ color: 'var(--xiaoone-danger)', fontSize: 12 }}>{formFieldErrors.name}</small> : null}
                </div>
                <div className="x1-lc-settings-field">
                  <label htmlFor="store-slug">{t('kefu.stores.fieldSlug')}</label>
                  <input
                    id="store-slug"
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: `1px solid ${formFieldErrors.slug ? 'var(--xiaoone-danger)' : 'var(--xiaoone-border)'}`, borderRadius: 6, outline: 'none', opacity: editingId ? 0.6 : 1 }}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      updateForm('slug', sanitizeSlug(e.target.value))
                    }}
                    placeholder={t('kefu.stores.fieldSlugPlaceholder')}
                    aria-invalid={Boolean(formFieldErrors.slug)}
                    aria-describedby={formFieldErrors.slug ? 'store-slug-error' : undefined}
                  />
                  {formFieldErrors.slug ? <small id="store-slug-error" style={{ color: 'var(--xiaoone-danger)', fontSize: 12 }}>{formFieldErrors.slug}</small> : null}
                </div>
                <div className="x1-lc-settings-field">
                  <label htmlFor="store-domain">{t('kefu.stores.fieldDomain')}</label>
                  <input
                    id="store-domain"
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: `1px solid ${formFieldErrors.domain ? 'var(--xiaoone-danger)' : 'var(--xiaoone-border)'}`, borderRadius: 6, outline: 'none' }}
                    value={form.domain}
                    onChange={e => updateForm('domain', sanitizeDomain(e.target.value))}
                    placeholder={t('kefu.stores.fieldDomainPlaceholder')}
                    aria-invalid={Boolean(formFieldErrors.domain)}
                    aria-describedby={formFieldErrors.domain ? 'store-domain-error' : undefined}
                  />
                  {formFieldErrors.domain ? <small id="store-domain-error" style={{ color: 'var(--xiaoone-danger)', fontSize: 12 }}>{formFieldErrors.domain}</small> : null}
                </div>
              </div>

              <div className="x1-lc-settings-form-grid">
                <div className="x1-lc-settings-field">
                  <label htmlFor="store-welcome">{t('kefu.stores.fieldWelcome')}</label>
                  <input
                    id="store-welcome"
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={form.welcome_message}
                    onChange={e => updateForm('welcome_message', e.target.value)}
                    placeholder={t('kefu.stores.fieldWelcomePlaceholder')}
                  />
                </div>
                <div className="x1-lc-settings-field">
                  <label htmlFor="store-tz">{t('kefu.stores.fieldTimezone')}</label>
                  <select
                    id="store-tz"
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', background: '#fff' }}
                    value={form.timezone}
                    onChange={e => updateForm('timezone', e.target.value)}
                  >
                    {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div className="x1-lc-settings-field" style={{ justifyContent: 'end' }}>
                  <label className="x1-lc-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, width: 'fit-content', padding: '0 12px', cursor: 'pointer', background: 'color-mix(in srgb, var(--xiaoone-bg-soft) 50%, #fff)', border: '1px solid var(--xiaoone-border)' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => updateForm('is_active', e.target.checked)} />
                    {t('kefu.stores.enableStore')}
                  </label>
                </div>
              </div>

              <div className="x1-lc-settings-field">
                <label htmlFor="store-desc">{t('kefu.stores.fieldDesc')}</label>
                <textarea
                  id="store-desc"
                  className="x1-lc-composer-inner"
                  style={{ padding: '8px 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none', resize: 'vertical', minHeight: 72 }}
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  placeholder={t('kefu.stores.fieldDescPlaceholder')}
                />
              </div>
            </div>

            <DialogFooter className="px-5 py-4 border-t border-[color-mix(in_srgb,var(--xiaoone-border)_80%,transparent)]">
              <button type="button" className="x1-lc-btn" onClick={closeFormDialog} disabled={saving}>
                <X size={14} />
                {t('kefu.common.cancel')}
              </button>
              <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={saving}>
                <Save size={14} />
                {saving ? t('kefu.common.saving') : editingId ? t('kefu.stores.saveStore') : t('kefu.stores.addStore')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
