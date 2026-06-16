import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from '@xiaoone/react-ui'
import { Bot, Cable, Code2, Copy, Download, KeyRound, RefreshCw, Trash2 } from 'lucide-react'
import { getChatKit, type SDKConfig as SdkConfigRow } from '@xiaoone/chat-kit'
import { usePreferences } from '../app/preferences'
import { describeFormValidationError, describeKefuError } from '../lib/apiErrors'
import { KefuIntegrationGuide } from './KefuIntegrationGuide'
import {
  allowedOriginsLabel,
  buildAiIntegrationBundle,
  buildIntegrationGuide,
  getPublicChatApi,
  renderGuideMarkdown,
  sdkCredentialText,
  sdkInstallSummary,
  type SdkConfigView,
} from './kefuIntegrationContent'
import './kefu-tech-config-page.css'

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function toastSuccess(title: string, description?: string) {
  toast({ variant: 'success', title, description })
}

function toastError(title: string, description?: string) {
  toast({ variant: 'destructive', title, description })
}

export function KefuTechConfigPage() {
  const { t, tpl } = usePreferences()
  const publicChatApi = useMemo(() => getPublicChatApi(t), [t])

  const [rows, setRows] = useState<SdkConfigRow[]>([])
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [sdkForm, setSdkForm] = useState<Partial<SdkConfigView>>({})
  const [editingSdkId, setEditingSdkId] = useState<number | null>(null)
  const [savingSdk, setSavingSdk] = useState(false)
  const [regeneratingSdkId, setRegeneratingSdkId] = useState<number | null>(null)
  const [showCredentialDetails, setShowCredentialDetails] = useState(false)

  const availableOrigin = typeof window !== 'undefined' ? window.location.origin : ''

  const integrationGuide = useMemo(() => {
    return buildIntegrationGuide(undefined, availableOrigin, t, tpl, { credentialCount: rows.length })
  }, [availableOrigin, rows, t, tpl])

  const externalApiDoc = useMemo(
    () => renderGuideMarkdown(integrationGuide, t, tpl),
    [integrationGuide, t, tpl],
  )

  function loadRows() {
    setLoading(true)
    setLoadError('')
    void getChatKit().SDKConfigAPI.list().then((data) => {
      setRows(data.items)
    }).catch((err) => {
      setLoadError(describeKefuError(err, t('kefu.tech.loadCredsFailed')))
      setRows([])
    }).finally(() => {
      setLoading(false)
    })
  }

  useEffect(() => {
    loadRows()
    void getChatKit().StoreAPI.list().then(res => setStores(res.items))
  }, [])

  useEffect(() => {
    if (!stores.length || editingSdkId || sdkForm.store)
      return
    setSdkForm(prev => ({ ...prev, store: stores[0].id }))
  }, [editingSdkId, sdkForm.store, stores])

  function resetSdkForm() {
    setEditingSdkId(null)
    setSdkForm({
      store: stores[0]?.id,
      theme: 'auto',
      primary_color: '#6366F1',
      bubble_position: 'bottom-right',
      enable_translation: true,
      auto_reply_enabled: true,
      merchant_display_label: '',
      visitor_channel_label: '',
      visitor_entry_url: '',
      allowed_origins: '',
    } as Partial<SdkConfigView>)
  }

  function editSdk(row: SdkConfigView) {
    setEditingSdkId(row.id)
    setSdkForm({ ...row })
  }

  async function saveSdk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sdkForm.store) {
      toastError(t('kefu.tech.selectStoreToast'), t('kefu.tech.selectStoreToastDesc'))
      return
    }
    setSavingSdk(true)
    const { auto_reply_knowledge_mode: _omit, auto_reply_model_key: _omitModel, ...sdkPayload } = sdkForm
    const payload = {
      ...sdkPayload,
      enable_translation: true,
      theme: sdkPayload.theme || 'auto',
      primary_color: sdkPayload.primary_color || '#6366F1',
      bubble_position: sdkPayload.bubble_position || 'bottom-right',
    }
    try {
      if (editingSdkId)
        await getChatKit().SDKConfigAPI.update(editingSdkId, payload as Partial<SdkConfigRow>)
      else
        await getChatKit().SDKConfigAPI.create(payload as Partial<SdkConfigRow>)
      toastSuccess(
        editingSdkId ? t('kefu.tech.saveSuccessEdit') : t('kefu.tech.saveSuccessCreate'),
        editingSdkId
          ? t('kefu.tech.saveSuccessEditDesc')
          : t('kefu.tech.saveSuccessCreateDesc'),
      )
      resetSdkForm()
      loadRows()
    }
    catch (err) {
      toastError(t('kefu.tech.saveFailed'), describeFormValidationError(err, describeKefuError(err, t('kefu.tech.saveCredsFailed'))))
    }
    finally {
      setSavingSdk(false)
    }
  }

  async function deleteSdk(row: SdkConfigView) {
    const confirmed = window.confirm(t('kefu.tech.deleteConfirm'))
    if (!confirmed)
      return
    try {
      await getChatKit().SDKConfigAPI.destroy(row.id)
      if (editingSdkId === row.id)
        resetSdkForm()
      toastSuccess(t('kefu.tech.deleteSuccess'))
      loadRows()
    }
    catch (err) {
      toastError(t('kefu.tech.deleteFailed'), describeKefuError(err, t('kefu.common.deleteFailed')))
    }
  }

  async function regenerateSdk(row: SdkConfigView) {
    const storeLabel = row.store_name || tpl('kefu.common.storeHash', String(row.store))
    const confirmed = window.confirm(tpl('kefu.tech.regenerateConfirm', storeLabel))
    if (!confirmed)
      return
    setRegeneratingSdkId(row.id)
    try {
      const updated = await getChatKit().SDKConfigAPI.regenerate(row.id)
      if (editingSdkId === row.id)
        setSdkForm(prev => ({ ...prev, app_secret: updated.app_secret }))
      toastSuccess(t('kefu.tech.regenerateSuccess'), t('kefu.tech.regenerateSuccessDesc'))
      loadRows()
    }
    catch (err) {
      toastError(t('kefu.tech.regenerateFailed'), describeKefuError(err, t('kefu.tech.regenerateApiKeyFailed')))
    }
    finally {
      setRegeneratingSdkId(null)
    }
  }

  async function copyText(text: string, label: string) {
    if (!text)
      return
    try {
      await navigator.clipboard.writeText(text)
      toastSuccess(tpl('kefu.common.copiedLabel', label))
    }
    catch {
      toastError(t('kefu.common.copyFailed'), t('kefu.common.copyFailedDesc'))
    }
  }

  const settingsWorkspace = (
    <>
      <div className="x1-lc-settings-tabrail mr-kefu-tech-single-toolbar">
        <div className="x1-lc-header-toolbar">
          <div className="x1-lc-toolbar-leading">
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cable size={16} className="mr-muted" /> {t('kefu.tech.title')}
              </h2>
              <span className="x1-lc-badge">{t('kefu.tech.badge')}</span>
            </div>
            <div className="x1-lc-status" aria-live="polite">
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => loadRows()}
              />
              {loading ? t('kefu.common.syncing') : t('kefu.common.synced')}
            </div>
          </div>
        </div>
      </div>

      <div className="x1-lc-settings-section">
          <div className="x1-lc-settings-pad" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <form onSubmit={saveSdk} className="x1-lc-settings-well" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="x1-lc-settings-form-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>
                    {editingSdkId ? t('kefu.tech.formEditTitle') : t('kefu.tech.formCreateTitle')}
                  </strong>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', marginTop: 4 }}>
                    {t('kefu.tech.formDesc')}
                  </div>
                </div>
                <div className="x1-lc-settings-form-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={savingSdk}>
                    {savingSdk ? t('kefu.common.saving') : editingSdkId ? t('kefu.tech.saveConfig') : t('kefu.tech.addIntegration')}
                  </button>
                  <button type="button" className="x1-lc-btn" onClick={resetSdkForm}>
                    {editingSdkId ? t('kefu.tech.cancelEdit') : t('kefu.tech.resetForm')}
                  </button>
                </div>
              </div>

              <div className="mr-kefu-tech-form-sections">
                <section className="mr-kefu-tech-form-section" aria-labelledby="mr-kefu-tech-form-store-heading">
                  <h3 id="mr-kefu-tech-form-store-heading" className="mr-kefu-tech-form-section-title">{t('kefu.tech.formSectionDisplay')}</h3>
                  <div className="mr-kefu-tech-form-row mr-kefu-tech-form-row--store">
                    <div className="x1-lc-settings-field">
                      <label htmlFor="kefu-tech-store">{t('kefu.tech.fieldStore')}</label>
                      <select
                        id="kefu-tech-store"
                        className="x1-lc-settings-input"
                        value={sdkForm.store || ''}
                        onChange={e => setSdkForm(p => ({ ...p, store: Number(e.target.value) }))}
                        disabled={Boolean(editingSdkId)}
                      >
                        <option value="">{t('kefu.common.selectStore')}</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <span className="x1-lc-settings-field-hint">{t('kefu.tech.fieldStoreHint')}</span>
                    </div>
                  </div>
                  <div className="mr-kefu-tech-form-row mr-kefu-tech-form-row--2">
                    <div className="x1-lc-settings-field">
                      <label htmlFor="kefu-tech-merchant-label">{t('kefu.tech.fieldMerchantLabel')}</label>
                      <input
                        id="kefu-tech-merchant-label"
                        className="x1-lc-settings-input"
                        value={sdkForm.merchant_display_label || ''}
                        onChange={e => setSdkForm(p => ({ ...p, merchant_display_label: e.target.value }))}
                        placeholder={t('kefu.tech.fieldMerchantLabelPlaceholder')}
                      />
                      <span className="x1-lc-settings-field-hint">{t('kefu.tech.fieldMerchantLabelHint')}</span>
                    </div>
                    <div className="x1-lc-settings-field">
                      <label htmlFor="kefu-tech-channel-label">{t('kefu.tech.fieldChannelLabel')}</label>
                      <input
                        id="kefu-tech-channel-label"
                        className="x1-lc-settings-input"
                        value={sdkForm.visitor_channel_label || ''}
                        onChange={e => setSdkForm(p => ({ ...p, visitor_channel_label: e.target.value }))}
                        placeholder={t('kefu.tech.fieldChannelLabelPlaceholder')}
                      />
                      <span className="x1-lc-settings-field-hint">{t('kefu.tech.fieldChannelLabelHint')}</span>
                    </div>
                  </div>
                </section>

                <section className="mr-kefu-tech-form-section mr-kefu-tech-form-section--primary" aria-labelledby="mr-kefu-tech-form-origins-heading">
                  <h3 id="mr-kefu-tech-form-origins-heading" className="mr-kefu-tech-form-section-title">{t('kefu.tech.fieldAllowedOrigins')}</h3>
                  <div className="x1-lc-settings-field">
                    <textarea
                      id="kefu-tech-allowed-origins"
                      className="x1-lc-settings-textarea mr-kefu-tech-form-origins"
                      value={sdkForm.allowed_origins || ''}
                      onChange={e => setSdkForm(p => ({ ...p, allowed_origins: e.target.value }))}
                      placeholder={t('kefu.tech.fieldAllowedOriginsPlaceholder')}
                      aria-describedby="kefu-tech-allowed-origins-hint"
                    />
                    <span id="kefu-tech-allowed-origins-hint" className="x1-lc-settings-field-hint">
                      {t('kefu.tech.fieldAllowedOriginsHint')}
                    </span>
                  </div>
                </section>

                <section className="mr-kefu-tech-form-section mr-kefu-tech-form-section--optional" aria-labelledby="mr-kefu-tech-form-entry-heading">
                  <h3 id="mr-kefu-tech-form-entry-heading" className="mr-kefu-tech-form-section-title">
                    {t('kefu.tech.fieldEntryUrl')}
                    <span className="mr-kefu-tech-form-optional-tag">{t('kefu.tech.fieldOptional')}</span>
                  </h3>
                  <div className="x1-lc-settings-field">
                    <input
                      id="kefu-tech-entry-url"
                      className="x1-lc-settings-input"
                      value={sdkForm.visitor_entry_url || ''}
                      onChange={e => setSdkForm(p => ({ ...p, visitor_entry_url: e.target.value }))}
                      placeholder={t('kefu.tech.fieldEntryUrlPlaceholder')}
                    />
                    <span className="x1-lc-settings-field-hint">{t('kefu.tech.fieldEntryUrlHint')}</span>
                  </div>
                </section>
              </div>

            </form>
          </div>

          <div className="x1-lc-settings-list">
            {!loading && rows.length === 0 ? (
              <div className="x1-lc-empty x1-lc-empty-cta">
                <div className="x1-lc-empty-icon"><Cable size={28} /></div>
                <strong>{t('kefu.tech.emptyTitle')}</strong>
                <p>{t('kefu.tech.emptyDesc')}</p>
                <div className="x1-lc-empty-actions">
                  <button
                    type="button"
                    className="x1-lc-btn x1-lc-btn-primary"
                    onClick={() => {
                      document.querySelector('.mr-kefu-settings-panel')?.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    {t('kefu.tech.emptyCta')}
                  </button>
                </div>
              </div>
            ) : null}

            {rows.map((item) => {
              const row = item as SdkConfigView
              const secret = row.app_secret ? `${row.app_secret.slice(0, 6)}...${row.app_secret.slice(-4)}` : '-'
              const rowSummary = sdkInstallSummary(row, availableOrigin, t, tpl)
              const rowAiIntegrationBundle = buildAiIntegrationBundle(row, availableOrigin, t, tpl, { credentialCount: rows.length })
              const credentialText = sdkCredentialText(row, t, tpl)
              return (
                <div key={item.id} className="x1-lc-settings-well" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.store_name || tpl('kefu.common.storeHash', String(item.store))}</strong>
                      <span className={`x1-lc-badge ${item.app_id ? 'x1-lc-badge--success' : 'x1-lc-badge--muted'}`}>
                        {item.app_id ? t('kefu.tech.statusReady') : t('kefu.tech.statusPending')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="x1-lc-btn x1-lc-btn-primary"
                        disabled={!row.app_id}
                        onClick={() => void copyText(rowAiIntegrationBundle, t('kefu.tech.copyLabel.fullBundle'))}
                      >
                        <Bot size={13} />
                        {t('kefu.tech.copyFullBundle')}
                      </button>
                      <button type="button" className="x1-lc-btn" onClick={() => void copyText(rowSummary, t('kefu.tech.copyLabel.installInfo'))}>
                        <Copy size={13} />
                        {t('kefu.tech.copyInstallInfo')}
                      </button>
                      <button type="button" className="x1-lc-btn" onClick={() => void copyText(credentialText, t('kefu.tech.copyApiCreds'))} disabled={!row.app_id || !row.app_secret}>
                        <KeyRound size={13} />
                        {t('kefu.tech.copyApiCreds')}
                      </button>
                      <button
                        type="button"
                        className="x1-lc-btn"
                        disabled={!row.app_id || regeneratingSdkId === row.id}
                        onClick={() => void regenerateSdk(row)}
                      >
                        <RefreshCw size={13} className={regeneratingSdkId === row.id ? 'animate-spin' : ''} />
                        {t('kefu.tech.resetApiKey')}
                      </button>
                      <button type="button" className="x1-lc-btn" onClick={() => editSdk(row)}>{t('kefu.common.edit')}</button>
                      <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteSdk(row)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>{tpl('kefu.tech.visitorDisplay', row.merchant_display_label || row.store_name || t('kefu.common.defaultStoreName'))}</span>
                    <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                    <span>{tpl('kefu.tech.entryChannel', row.visitor_channel_label || t('kefu.tech.defaultChannel'))}</span>
                    <span aria-hidden="true">{t('kefu.common.dotSep')}</span>
                    <span>{tpl('kefu.tech.allowedSites', allowedOriginsLabel(row, t))}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>{tpl('kefu.tech.visitorEntry', row.visitor_entry_url || t('kefu.common.notConfigured'))}</span>
                  </div>
                  <div className="mr-kefu-tech-credential-grid">
                    <div className="mr-kefu-tech-credential-box">
                      <span>{t('kefu.tech.appId')}</span>
                      <code>{item.app_id || t('kefu.common.autoGenerated')}</code>
                      <button type="button" className="x1-lc-btn" style={{ alignSelf: 'flex-start' }} onClick={() => void copyText(String(item.app_id || ''), t('kefu.tech.appId'))} disabled={!item.app_id}>
                        <Copy size={13} />
                        {t('kefu.tech.copyAppId')}
                      </button>
                    </div>
                    <div className="mr-kefu-tech-credential-box">
                      <span>{t('kefu.tech.apiKey')}</span>
                      <code>{row.app_secret || t('kefu.common.autoGenerated')}</code>
                      <button type="button" className="x1-lc-btn" style={{ alignSelf: 'flex-start' }} onClick={() => void copyText(String(row.app_secret || ''), t('kefu.tech.apiKey'))} disabled={!row.app_secret}>
                        <Copy size={13} />
                        {t('kefu.tech.copyApiKey')}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="x1-lc-btn"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setShowCredentialDetails(prev => !prev)}
                    aria-expanded={showCredentialDetails}
                  >
                    <Code2 size={13} />
                    {showCredentialDetails ? t('kefu.tech.hideDevInfo') : t('kefu.tech.showDevInfo')}
                  </button>
                  {showCredentialDetails ? (
                    <div className="mr-kefu-tech-dev-meta">
                      <code>App ID: {item.app_id || '-'}</code>
                      <code>API Key: {secret}</code>
                      <code>{tpl('kefu.tech.devApi', publicChatApi.method, publicChatApi.path)}</code>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

      <div className="x1-lc-settings-section mr-kefu-tech-doc-section">
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={16} className="mr-muted" /> {t('kefu.tech.docTitle')}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="x1-lc-btn" onClick={() => void copyText(externalApiDoc, t('kefu.tech.copyLabel.devDoc'))}>
                <Copy size={13} />
                {t('kefu.tech.copyDoc')}
              </button>
              <button type="button" className="x1-lc-btn" onClick={() => downloadTextFile('xiaoone-kefu-one-api-guide.md', externalApiDoc)}>
                <Download size={13} />
                {t('kefu.common.downloadMarkdown')}
              </button>
            </div>
          </div>

          <div className="x1-lc-settings-pad mr-kefu-tech-doc-pad">
            <p className="mr-kefu-tech-doc-lede">
              {t('kefu.tech.docLede')}
            </p>
            <KefuIntegrationGuide guide={integrationGuide} onCopy={copyText} />
          </div>
        </div>
    </>
  )

  return (
    <div className="x1-lc-container x1-lc-settings-page mr-kefu-tech-config">
      <header className="x1-lc-header">
        <p className="x1-lc-settings-lede">
          {t('kefu.tech.pageLede')}
        </p>
      </header>

      {loadError ? (
        <div className="mr-state-error x1-lc-settings-alert" role="alert">
          {loadError}
        </div>
      ) : null}

      <div className="x1-lc-body x1-lc-settings-workspace">
        {settingsWorkspace}
      </div>
    </div>
  )
}
