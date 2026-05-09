import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Cable, Copy, KeyRound, Plus, RadioTower, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { getChatKit, type SDKConfig as SdkConfigRow, type ChannelAccount as ChannelAccountRow } from '@xiaoone/chat-kit'
import { ApiError } from '../lib/apiErrors'

type SdkConfigView = SdkConfigRow & {
  merchant_id?: number
  app_secret?: string
  visitor_entry_url?: string
  visitor_qr_image_url?: string
  theme?: 'auto' | 'light' | 'dark' | 'brand'
  primary_color?: string
  enable_translation?: boolean
  auto_reply_enabled?: boolean
  auto_reply_model_key?: string
  auto_reply_knowledge_mode?: 'relaxed' | 'balanced' | 'strict'
  merchant_display_label?: string
  visitor_channel_label?: string
  store?: number
  store_name?: string
}

const AUTO_REPLY_MODELS = [
  { value: '', label: '继承平台默认（GPT 5.4）' },
  { value: 'gpt-5.4', label: 'GPT 5.4' },
  { value: 'openai-reasoning-best', label: 'OpenAI GPT 5.4' },
  { value: 'openai-reasoning-value', label: 'OpenAI GPT 5.4 mini' },
  { value: 'google-reasoning-best', label: 'Gemini 3.1 Pro' },
  { value: 'google-reasoning-value', label: 'Gemini 2.5 Flash' },
  { value: 'qwen-plus', label: 'Qwen Plus' },
]

const AUTO_REPLY_KNOWLEDGE_MODES = [
  { value: 'relaxed', label: 'AI 模式' },
  { value: 'balanced', label: 'AI + 语料库结合模式' },
  { value: 'strict', label: '完全语料库模式' },
]

type ChannelProvider = 'telegram' | 'whatsapp' | 'wecom'

interface ProviderMeta {
  key: ChannelProvider
  label: string
  note: string
  state: string
  credentials: Array<{ key: string; label: string; placeholder: string }>
}

const PROVIDERS: ProviderMeta[] = [
  {
    key: 'telegram',
    label: 'Telegram',
    note: 'Bot API，使用 @BotFather 获取 Bot Token 后配置 webhook。',
    state: '账号接入',
    credentials: [
      { key: 'bot_token', label: 'Bot Token', placeholder: '1234567:ABC-DEF...' },
    ],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    note: 'Meta Cloud API，配置访问令牌和 Phone Number ID。',
    state: '账号接入',
    credentials: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAG...' },
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '109...0123' },
    ],
  },
  {
    key: 'wecom',
    label: '企业微信',
    note: '微信客服 / 客户联系 API，配置 CorpID、Secret 和客服 ID。',
    state: '账号接入',
    credentials: [
      { key: 'corp_id', label: 'CorpID', placeholder: 'wwxxxxxxxxxxxxxxxx' },
      { key: 'secret', label: 'AppSecret', placeholder: '...' },
      { key: 'kf_id', label: '客服 ID（可选）', placeholder: 'wkxxxxxxxxxxxx' },
    ],
  },
]

interface ChannelFormState {
  provider: ChannelProvider
  name: string
  enabled: boolean
  credentials: Record<string, string>
  extras: {
    visitor_qr_image_url: string
    visitor_entry_url: string
  }
}

function providerMeta(provider: ChannelProvider) {
  return PROVIDERS.find(item => item.key === provider) || PROVIDERS[0]
}

function emptyChannelForm(provider: ChannelProvider = 'telegram'): ChannelFormState {
  return {
    provider,
    name: '',
    enabled: true,
    credentials: {},
    extras: {
      visitor_qr_image_url: '',
      visitor_entry_url: '',
    },
  }
}

function readItems<T>(payload: any): T[] {
  if (Array.isArray(payload?.items))
    return payload.items
  if (Array.isArray(payload?.results))
    return payload.results
  if (Array.isArray(payload))
    return payload
  return []
}

function readStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object')
    return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, val == null ? '' : String(val)]),
  )
}

const API_GROUPS = [
  {
    title: '访客 / 聊天',
    rows: [
      { method: 'POST', path: '/api/v1/chat/visitor/handshake/', note: '建立访客会话；使用 merchant_id、app_id、sdk_key、visitor_name 等字段' },
      { method: 'POST', path: '/api/v1/chat/visitor/messages/', note: '访客发消息，依赖握手返回的访客上下文' },
    ],
  },
  {
    title: '客服元数据',
    rows: [
      { method: 'GET', path: '/api/v1/kefu/sdk-config/', note: 'SDK 配置行列表' },
      { method: 'GET', path: '/api/v1/kefu/quick-replies/', note: '建议回复列表' },
      { method: 'GET', path: '/api/v1/kefu/corpus/', note: '问答条目列表' },
      { method: 'GET', path: '/api/v1/kefu/corpus-sources/', note: '资料来源列表' },
      { method: 'GET', path: '/api/v1/iam/team/', note: '商户成员与客户咨询接待配置' },
    ],
  },
  {
    title: '渠道服务',
    rows: [
      { method: 'GET', path: '/api/v1/channels/accounts/', note: '外部渠道账号列表' },
      { method: 'POST', path: '/api/v1/channels/accounts/', note: '新增渠道账号，保存后把 webhook 配到对应平台' },
    ],
  },
]

export function KefuTechConfigPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'sdk' | 'api'>('channels')
  const [rows, setRows] = useState<SdkConfigRow[]>([])
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [channelAccounts, setChannelAccounts] = useState<ChannelAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [channelLoading, setChannelLoading] = useState(true)
  const [error, setError] = useState('')
  const [channelError, setChannelError] = useState('')
  const [channelForm, setChannelForm] = useState<ChannelFormState>(() => emptyChannelForm('telegram'))
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [savingChannel, setSavingChannel] = useState(false)

  const [sdkForm, setSdkForm] = useState<Partial<SdkConfigView>>({})
  const [editingSdkId, setEditingSdkId] = useState<number | null>(null)
  const [savingSdk, setSavingSdk] = useState(false)

  function loadRows() {
    setLoading(true)
    setError('')
    void getChatKit().SDKConfigAPI.list().then((data) => {
      setRows(data.items)
    }).catch((err) => {
      if (err instanceof ApiError)
        setError(err.message || 'SDK 配置加载失败')
      else
        setError('SDK 配置加载失败')
      setRows([])
    }).finally(() => {
      setLoading(false)
    })
  }

  useEffect(() => {
    loadRows()
    void loadChannelAccounts()
    void getChatKit().StoreAPI.list().then(res => setStores(res.items))
  }, [])

  async function loadChannelAccounts() {
    setChannelLoading(true)
    setChannelError('')
    try {
      const payload = await getChatKit().ChannelsAPI.list()
      setChannelAccounts(payload.items)
    }
    catch (err) {
      if (err instanceof ApiError)
        setChannelError(err.message || '渠道账号加载失败')
      else
        setChannelError('渠道账号加载失败')
      setChannelAccounts([])
    }
    finally {
      setChannelLoading(false)
    }
  }

  function updateChannelForm<K extends keyof ChannelFormState>(key: K, value: ChannelFormState[K]) {
    setChannelForm(prev => ({ ...prev, [key]: value }))
  }

  function switchProvider(nextProvider: ChannelProvider) {
    setEditingChannelId(null)
    setChannelForm(emptyChannelForm(nextProvider))
  }

  function updateCredential(key: string, value: string) {
    setChannelForm(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: value },
    }))
  }

  function updateExtra(key: keyof ChannelFormState['extras'], value: string) {
    setChannelForm(prev => ({
      ...prev,
      extras: { ...prev.extras, [key]: value },
    }))
  }

  function resetChannelForm(provider: ChannelProvider = channelForm.provider) {
    setEditingChannelId(null)
    setChannelForm(emptyChannelForm(provider))
  }

  function editChannelAccount(account: ChannelAccountRow) {
    setEditingChannelId(account.id)
    setChannelForm({
      provider: account.provider,
      name: account.name || '',
      enabled: account.enabled !== false,
      credentials: readStringMap(account.credentials),
      extras: {
        visitor_qr_image_url: readStringMap(account.extras).visitor_qr_image_url || '',
        visitor_entry_url: readStringMap(account.extras).visitor_entry_url || '',
      },
    })
  }

  async function saveChannelAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingChannel(true)
    setChannelError('')
    try {
      const meta = providerMeta(channelForm.provider)
      const credentials = Object.fromEntries(
        meta.credentials.map(field => [field.key, (channelForm.credentials[field.key] || '').trim()]),
      )
      const payload = {
        provider: channelForm.provider,
        name: channelForm.name.trim() || `${meta.label} 账号`,
        credentials,
        extras: {
          visitor_qr_image_url: channelForm.extras.visitor_qr_image_url.trim(),
          visitor_entry_url: channelForm.extras.visitor_entry_url.trim(),
        },
        enabled: channelForm.enabled,
      }
      if (editingChannelId)
        await getChatKit().ChannelsAPI.update(editingChannelId.toString(), payload as any)
      else
        await getChatKit().ChannelsAPI.create(payload as any)
      resetChannelForm(channelForm.provider)
      await loadChannelAccounts()
    }
    catch (err) {
      if (err instanceof ApiError)
        setChannelError(err.message || '保存渠道账号失败')
      else
        setChannelError('保存渠道账号失败')
    }
    finally {
      setSavingChannel(false)
    }
  }

  async function deleteChannelAccount(row: ChannelAccountRow) {
    const typedName = window.prompt(`删除渠道账号「${row.name}」会使该外部渠道停止接入。若确认删除，请输入完整账号名。`)
    if (typedName == null)
      return
    if (typedName.trim() !== row.name) {
      setChannelError('已取消删除：输入的账号名不匹配。')
      return
    }
    const confirmed = window.confirm(`请再次确认：确定删除渠道账号「${row.name}」？此操作不能从当前页面撤销。`)
    if (!confirmed)
      return
    setChannelError('')
    try {
      await getChatKit().ChannelsAPI.destroy(row.id.toString())
      if (editingChannelId === row.id)
        resetChannelForm(row.provider)
      await loadChannelAccounts()
    }
    catch (err) {
      if (err instanceof ApiError)
        setChannelError(err.message || '删除渠道账号失败')
      else
        setChannelError('删除渠道账号失败')
    }
  }

  const groupedAccounts = useMemo(() => {
    const map: Record<ChannelProvider, ChannelAccountRow[]> = {
      telegram: [],
      whatsapp: [],
      wecom: [],
    }
    for (const account of channelAccounts) {
      if (account.provider in map)
        map[account.provider].push(account)
    }
    return map
  }, [channelAccounts])

  function resetSdkForm() {
    setEditingSdkId(null)
    setSdkForm({
      store: stores[0]?.id,
      theme: 'auto',
      primary_color: '#6366F1',
      bubble_position: 'bottom-right',
      enable_translation: false,
      auto_reply_enabled: true,
      auto_reply_model_key: '',
      auto_reply_knowledge_mode: 'relaxed',
      merchant_display_label: '',
      visitor_channel_label: '',
      visitor_entry_url: '',
      visitor_qr_image_url: '',
    } as any)
  }

  function editSdk(row: SdkConfigView) {
    setEditingSdkId(row.id)
    setSdkForm({ ...row })
  }

  async function saveSdk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingSdk(true)
    setError('')
    try {
      if (editingSdkId)
        await getChatKit().SDKConfigAPI.update(editingSdkId, sdkForm as any)
      else
        await getChatKit().SDKConfigAPI.create(sdkForm as any)
      resetSdkForm()
      loadRows()
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || '保存 SDK 配置失败')
      else
        setError('保存 SDK 配置失败')
    }
    finally {
      setSavingSdk(false)
    }
  }

  async function deleteSdk(row: SdkConfigView) {
    const confirmed = window.confirm(`删除该 SDK 配置后，店铺前端将无法连接，确认？`)
    if (!confirmed) return
    try {
      await getChatKit().SDKConfigAPI.destroy(row.id)
      if (editingSdkId === row.id) resetSdkForm()
      loadRows()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message || '删除失败')
      else setError('删除失败')
    }
  }

  const activeProviderMeta = providerMeta(channelForm.provider)

  function fullWebhookUrl(row: ChannelAccountRow) {
    if (!row.webhook_url)
      return ''
    if (/^https?:\/\//.test(row.webhook_url))
      return row.webhook_url
    return `${window.location.origin}${row.webhook_url}`
  }

  function credentialSummary(row: ChannelAccountRow, meta: ProviderMeta) {
    const credentials = row.credentials || {}
    const filled = meta.credentials.filter(field => credentials[field.key])
    if (!filled.length)
      return '凭据未填写'
    return `${filled.length} / ${meta.credentials.length} 项凭据：${filled.map(field => field.label).join('、')}`
  }

  async function copyText(text: string) {
    if (!text)
      return
    try {
      await navigator.clipboard.writeText(text)
    }
    catch {
      // Copy is a convenience only; do not block the page if the browser denies it.
    }
  }

  const embedSnippet = useMemo(() => {
    const row = rows[0] as SdkConfigView
    if (!row) return ''
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://你的BFF域名'
    return `// 浏览器嵌入：参考仓库 frontends/visitor/src/lib/chatClient.ts（XiaooneChatWidget）与 xiaooneSdkConfig.ts；或直接 fetch 握手（字段如下）。
// REST: POST ${base}/api/v1/chat/visitor/handshake/
// 请求体 JSON（字段名固定）：
{
  "merchant_id": ${row.merchant_id},
  "app_id": "${row.app_id}",
  "sdk_key": "/* App Secret，勿写入前端公开仓库；由商家服务端下发或构建时注入 */",
  "visitor_name": "访客昵称",
  "store_name": "可选，店铺展示名快照"
}
// 完整说明见仓库根目录 docs/客服-SDK对接指南.md`
  }, [rows])

  return (
    <div className="x1-lc-container">
      <header className="x1-lc-header">
        <div className="x1-lc-header-top">
          <h1><Cable size={18} className="mr-muted" /> 渠道、SDK、API 配置</h1>
          <div className="x1-lc-status">
            <RefreshCw size={14} className={loading || channelLoading ? "animate-spin" : ""} style={{ cursor: 'pointer' }} onClick={() => { loadRows(); void loadChannelAccounts(); }} />
            {loading || channelLoading ? '同步中' : '已同步'}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>外部消息渠道、网页 / App SDK 凭据，以及对外 REST 路径说明集中在这里。</p>
        <div className="x1-lc-header-toolbar">
          <div className="x1-lc-tabs" role="tablist">
            <button type="button" className={`x1-lc-tab ${activeTab === 'channels' ? 'is-active' : ''}`} onClick={() => setActiveTab('channels')}>渠道接入</button>
            <button type="button" className={`x1-lc-tab ${activeTab === 'sdk' ? 'is-active' : ''}`} onClick={() => setActiveTab('sdk')}>SDK 配置</button>
            <button type="button" className={`x1-lc-tab ${activeTab === 'api' ? 'is-active' : ''}`} onClick={() => setActiveTab('api')}>API 接口</button>
          </div>
        </div>
      </header>

      {error || channelError ? <div className="mr-state-error" style={{ margin: '0 20px' }}>{error || channelError}</div> : null}

      {activeTab === 'channels' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RadioTower size={16} className="mr-muted" /> 新增与管理渠道
              </h2>
            </div>
          </div>
          
          <div style={{ padding: 20, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <p style={{ margin: 0, marginBottom: 16, fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>按外部平台管理账号、凭据和 webhook，保存后到对应平台完成回调配置。</p>
            <form onSubmit={saveChannelAccount} style={{ background: '#fafbfc', border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{editingChannelId ? '编辑渠道账号' : '新增渠道账号'}</strong>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', marginTop: 4 }}>{activeProviderMeta.label}：{activeProviderMeta.note}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={savingChannel}>
                    {savingChannel ? '保存中...' : editingChannelId ? '保存账号' : '新增账号'}
                  </button>
                  {editingChannelId ? (
                    <button type="button" className="x1-lc-btn" onClick={() => resetChannelForm(channelForm.provider)}>
                      取消
                    </button>
                  ) : null}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>渠道</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={channelForm.provider} onChange={e => switchProvider(e.target.value as ChannelProvider)} disabled={Boolean(editingChannelId)}
                  >
                    {PROVIDERS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>账号名</label>
                  <input 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={channelForm.name} onChange={e => updateChannelForm('name', e.target.value)} placeholder="例如 Acme official bot" 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>启用状态</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={channelForm.enabled ? 'enabled' : 'disabled'} onChange={e => updateChannelForm('enabled', e.target.value === 'enabled')}
                  >
                    <option value="enabled">启用</option>
                    <option value="disabled">停用</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {activeProviderMeta.credentials.map(field => (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>{field.label}</label>
                    <input 
                      className="x1-lc-composer-inner"
                      style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                      value={channelForm.credentials[field.key] || ''}
                      onChange={e => updateCredential(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      type={field.key.includes('token') || field.key.includes('secret') ? 'password' : 'text'}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>渠道二维码图 URL（可选）</label>
                  <input 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={channelForm.extras.visitor_qr_image_url} onChange={e => updateExtra('visitor_qr_image_url', e.target.value)} placeholder="https://..." 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>落地页 / 加群链接（可选）</label>
                  <input 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={channelForm.extras.visitor_entry_url} onChange={e => updateExtra('visitor_entry_url', e.target.value)} placeholder="https://..." 
                  />
                </div>
              </div>
            </form>
          </div>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PROVIDERS.map((item) => {
              const accounts = groupedAccounts[item.key]
              return (
                <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.label}</h3>
                    <span className="x1-lc-badge">{accounts.length ? `${accounts.length} 个账号` : item.state}</span>
                  </div>
                  {!accounts.length ? (
                    <div style={{ padding: 16, background: '#fafbfc', borderRadius: 8, fontSize: 13, color: 'var(--xiaoone-fg-mute)', border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
                      尚未配置 {item.label} 渠道账号，可在上方选择该渠道后新增。
                    </div>
                  ) : null}
                  <div style={{ display: 'grid', gap: 12 }}>
                    {accounts.map((account) => {
                      const webhookUrl = fullWebhookUrl(account)
                      return (
                        <div key={account.id} style={{ padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{account.name}</strong>
                              {account.is_demo ? <span className="x1-lc-badge">示例</span> : null}
                              <span className="x1-lc-badge" style={{ background: account.enabled !== false ? 'var(--xiaoone-success-bg)' : '#f1f3f7', color: account.enabled !== false ? 'var(--xiaoone-success)' : 'var(--xiaoone-fg-mute)' }}>
                                {account.enabled !== false ? '已启用' : '已停用'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button type="button" className="x1-lc-btn" onClick={() => editChannelAccount(account)}>编辑</button>
                              <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteChannelAccount(account)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>
                            {credentialSummary(account, item)}
                          </div>
                          
                          {webhookUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fafbfc', padding: '6px 12px', borderRadius: 6, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
                              <code style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--xiaoone-fg-soft)' }}>
                                {webhookUrl}
                              </code>
                              <button type="button" className="x1-lc-icon-btn" onClick={() => void copyText(webhookUrl)} title="复制 webhook">
                                <Copy size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>保存后若后端返回 webhook URL，请复制到 {item.label} 平台。</div>
                          )}
                          
                          {(account.extras?.visitor_qr_image_url || account.extras?.visitor_entry_url) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {account.extras?.visitor_qr_image_url ? <span className="x1-lc-badge">二维码图已配置</span> : null}
                              {account.extras?.visitor_entry_url ? <span className="x1-lc-badge">落地页已配置</span> : null}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {activeTab === 'sdk' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          {embedSnippet ? (
            <div style={{ background: '#fafbfc', padding: 20, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong style={{ fontSize: 14, color: 'var(--xiaoone-fg)' }}>外部站点对接摘要</strong>
                <button type="button" className="x1-lc-btn" onClick={() => void copyText(embedSnippet)}>
                  <Copy size={13} />
                  复制片段
                </button>
              </div>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--xiaoone-fg-soft)', fontFamily: 'ui-monospace, monospace' }}>
                {embedSnippet}
              </pre>
            </div>
          ) : null}

          <div style={{ padding: 20, borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <form onSubmit={saveSdk} style={{ background: '#fafbfc', border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{editingSdkId ? '编辑 SDK 配置' : '新建 SDK 配置'}</strong>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', marginTop: 4 }}>网页 Widget 接入或 App 接入凭据，与平台对应的店铺关联。</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="submit" className="x1-lc-btn x1-lc-btn-primary" disabled={savingSdk}>
                    {savingSdk ? '保存中...' : editingSdkId ? '保存配置' : '新增配置'}
                  </button>
                  <button type="button" className="x1-lc-btn" onClick={resetSdkForm}>
                    {editingSdkId ? '取消编辑' : '重置表单'}
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>店铺</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.store || ''} onChange={e => setSdkForm(p => ({ ...p, store: Number(e.target.value) }))} disabled={Boolean(editingSdkId)}
                  >
                    <option value="">请选择店铺</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>官网商户名</label>
                  <input 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.merchant_display_label || ''} onChange={e => setSdkForm(p => ({ ...p, merchant_display_label: e.target.value }))} placeholder="访客见到的商户名" 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>官网渠道名</label>
                  <input 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.visitor_channel_label || ''} onChange={e => setSdkForm(p => ({ ...p, visitor_channel_label: e.target.value }))} placeholder="如：官网客服" 
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>主题</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.theme || 'auto'} onChange={e => setSdkForm(p => ({ ...p, theme: e.target.value as SdkConfigView['theme'] }))}
                  >
                    <option value="auto">自动 auto</option>
                    <option value="light">浅色 light</option>
                    <option value="dark">深色 dark</option>
                    <option value="brand">品牌色 brand</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>主色</label>
                  <input 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.primary_color || ''} onChange={e => setSdkForm(p => ({ ...p, primary_color: e.target.value }))} placeholder="#6366F1" 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>气泡位置</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.bubble_position || 'bottom-right'} onChange={e => setSdkForm(p => ({ ...p, bubble_position: e.target.value }))}
                  >
                    <option value="bottom-right">右下</option>
                    <option value="bottom-left">左下</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>自动回复模型</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.auto_reply_model_key || ''} onChange={e => setSdkForm(p => ({ ...p, auto_reply_model_key: e.target.value }))}
                  >
                    {AUTO_REPLY_MODELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>自动回复模式</label>
                  <select 
                    className="x1-lc-composer-inner"
                    style={{ height: 36, padding: '0 12px', border: '1px solid var(--xiaoone-border)', borderRadius: 6, outline: 'none' }}
                    value={sdkForm.auto_reply_knowledge_mode || 'relaxed'} onChange={e => setSdkForm(p => ({ ...p, auto_reply_knowledge_mode: e.target.value as SdkConfigView['auto_reply_knowledge_mode'] }))}
                  >
                    {AUTO_REPLY_KNOWLEDGE_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  <label className="x1-lc-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', cursor: 'pointer', background: 'color-mix(in srgb, var(--xiaoone-bg-soft) 50%, #fff)', border: '1px solid var(--xiaoone-border)' }}>
                    <input type="checkbox" checked={sdkForm.auto_reply_enabled} onChange={e => setSdkForm(p => ({ ...p, auto_reply_enabled: e.target.checked }))} />
                    启用自动回复
                  </label>
                </div>
              </div>
            </form>
          </div>

          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!loading && rows.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><Cable size={24} /></div>
                <strong>暂无 SDK 配置</strong>
                <p>先在上方创建配置，再把 App ID 和 App Secret 用于访客握手。</p>
              </div>
            ) : null}
            
            {rows.map((item) => {
              const row = item as SdkConfigView
              const secret = row.app_secret ? `${row.app_secret.slice(0, 6)}...${row.app_secret.slice(-4)}` : '-'
              return (
                <div key={item.id} style={{ padding: 16, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 10, background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{item.store_name || `店铺 #${item.store}`}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" className="x1-lc-btn" onClick={() => void copyText(item.app_id || '')} disabled={!item.app_id}>复制 App ID</button>
                      <button type="button" className="x1-lc-btn" onClick={() => editSdk(row)}>编辑</button>
                      <button type="button" className="x1-lc-btn" style={{ color: 'var(--xiaoone-danger)' }} onClick={() => void deleteSdk(row)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>merchant_id: {row.merchant_id || '-'}</span>
                    <span>·</span>
                    <span>App ID: {item.app_id || '-'}</span>
                    <span>·</span>
                    <span>App Secret: {secret}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>访客入口：{row.visitor_entry_url || '未配置'}</span>
                    <span>·</span>
                    <span className="x1-lc-badge" style={{ background: item.auto_reply_enabled ? 'var(--xiaoone-success-bg)' : '#f1f3f7', color: item.auto_reply_enabled ? 'var(--xiaoone-success)' : 'var(--xiaoone-fg-mute)' }}>自动回复：{item.auto_reply_enabled ? '开启' : '关闭'}</span>
                    <span className="x1-lc-badge" style={{ background: row.enable_translation ? '#edf3ff' : '#f1f3f7', color: row.enable_translation ? '#294b95' : 'var(--xiaoone-fg-mute)' }}>翻译：{row.enable_translation ? '开启' : '关闭'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {activeTab === 'api' ? (
        <div className="x1-lc-body" style={{ height: 'auto', minHeight: 400, flexDirection: 'column' }}>
          <div className="x1-lc-main-head" style={{ borderBottom: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)' }}>
            <div className="x1-lc-main-title">
              <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={16} className="mr-muted" /> API
              </h2>
            </div>
            <span style={{ fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>商户后台使用登录态或 Bearer；官网使用 App ID + sdk_key。</span>
          </div>
          
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {API_GROUPS.map(group => (
              <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--xiaoone-fg)' }}>{group.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.rows.map(row => (
                    <div key={`${row.method}-${row.path}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, border: '1px solid color-mix(in srgb, var(--xiaoone-border) 80%, transparent)', borderRadius: 8, background: '#fafbfc' }}>
                      <span className="x1-lc-badge" style={{ background: row.method === 'POST' ? '#f0fdf4' : '#f0f9ff', color: row.method === 'POST' ? '#166534' : '#0369a1', fontFamily: 'ui-monospace, monospace' }}>{row.method}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <code style={{ fontSize: 13, fontFamily: 'ui-monospace, monospace', color: 'var(--xiaoone-fg)' }}>{row.path}</code>
                        <span style={{ fontSize: 12, color: 'var(--xiaoone-fg-mute)' }}>{row.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
