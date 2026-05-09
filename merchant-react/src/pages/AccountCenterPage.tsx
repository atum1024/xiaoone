import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useAuthStore as useAuth } from '../store/auth'
import { api } from '../lib/httpClient'
import { describeAxiosError } from '../lib/apiErrors'
import { WalletPanel } from '../panels/account/WalletPanel'
import { BillingPanel } from '../panels/account/BillingPanel'
import { UsagePanel } from '../panels/account/UsagePanel'
import '../panels/account/account.css'

type TabKey = 'wallet' | 'billing' | 'usage' | 'settings'

interface Tab {
  key: TabKey
  label: string
  icon: any
  hint: string
}

const TABS: Tab[] = [
  { key: 'wallet', label: '钱包概览', icon: 'briefcase', hint: '账户余额 / 充值入口' },
  { key: 'billing', label: '充值与付款', icon: 'bolt', hint: '充值 / 服务购买 / 账单流水' },
  { key: 'usage', label: 'Token 用量', icon: 'sparkles', hint: 'AI / 翻译消耗明细' },
  { key: 'settings', label: '系统设置', icon: 'key', hint: '绑定手机号 / 邮箱 · 重置密码' },
]

export function AccountCenterPage() {
  const auth = useAuth()
  const [tab, setTab] = useState<TabKey>('wallet')

  const merchantName = auth.me?.merchants?.[0]?.name || '我的商户'
  const currentHint = useMemo(() => TABS.find(t => t.key === tab)?.hint || '', [tab])

  return (
    <section className="acct">
      <header className="acct-head">
        <div className="acct-head-top">
          <span className="acct-icon"><Icon name="user" size={18} /></span>
          <div className="acct-head-text">
            <h1>账户中心</h1>
            <p className="acct-sub">{merchantName} · 钱包 / 计费 / Token 用量 统一管理</p>
          </div>
        </div>

        <nav className="acct-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`acct-tab ${tab === t.key ? 'is-active' : ''}`}
              role="tab"
              aria-selected={tab === t.key}
              type="button"
              onClick={() => setTab(t.key)}
            >
              <Icon name={t.icon} size={13} />
              <span>{t.label}</span>
            </button>
          ))}
          <span className="acct-tabs-hint" title={currentHint}>{currentHint}</span>
        </nav>
      </header>

      <div className="acct-content">
        {tab === 'wallet' && <WalletPanel onNavigate={setTab} />}
        {tab === 'billing' && <BillingPanel />}
        {tab === 'usage' && <UsagePanel />}
        {tab === 'settings' && <SecuritySettingsPanel />}
      </div>
    </section>
  )
}

function SecuritySettingsPanel() {
  const auth = useAuth()
  const user = auth.user
  const [phone, setPhone] = useState(user?.phone || '')
  const [phoneCode, setPhoneCode] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [emailCode, setEmailCode] = useState('')
  const [resetMethod, setResetMethod] = useState<'phone' | 'email'>(() => user?.phone ? 'phone' : 'email')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const canResetByPhone = Boolean(user?.phone && user?.phone_verified)
  const canResetByEmail = Boolean(user?.email && user?.email_verified)
  const canReset = canResetByPhone || canResetByEmail

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError('')
    setNotice('')
    try {
      await fn()
    }
    catch (err) {
      setError(describeAxiosError(err, '操作失败，请检查验证码或稍后重试'))
    }
    finally {
      setBusy('')
    }
  }

  async function requestPhoneCode() {
    await run('phone-request', async () => {
      await api.post('/api/v1/iam/account/bind-phone/request/', { phone })
      setNotice('手机号验证码已发送')
    })
  }

  async function bindPhone() {
    await run('phone-confirm', async () => {
      await api.post('/api/v1/iam/account/bind-phone/confirm/', { phone, code: phoneCode })
      await auth.fetchMe()
      setPhoneCode('')
      setNotice('手机号已绑定，可用于手机号登录和密码重置')
    })
  }

  async function requestEmailCode() {
    await run('email-request', async () => {
      await api.post('/api/v1/iam/account/bind-email/request/', { email })
      setNotice('邮箱验证码已发送')
    })
  }

  async function bindEmail() {
    await run('email-confirm', async () => {
      await api.post('/api/v1/iam/account/bind-email/confirm/', { email, code: emailCode })
      await auth.fetchMe()
      setEmailCode('')
      setNotice('邮箱已绑定，可用于邮箱登录和密码重置')
    })
  }

  async function requestResetCode() {
    await run('reset-request', async () => {
      await api.post('/api/v1/iam/account/password/reset-code/', { method: resetMethod })
      setNotice(resetMethod === 'phone' ? '密码重置短信验证码已发送' : '密码重置邮箱验证码已发送')
    })
  }

  async function resetPassword() {
    await run('reset-confirm', async () => {
      await api.post('/api/v1/iam/account/password/reset-confirm/', {
        method: resetMethod,
        code: resetCode,
        new_password: newPassword,
      })
      setResetCode('')
      setNewPassword('')
      setNotice('密码已重置，下次登录请使用新密码')
    })
  }

  return (
    <div className="apage apage--embedded">
      <div className="apage-body acct-settings">
        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="user" size={16} />
            <div>
              <h2>登录身份</h2>
              <p>手机号和邮箱都可以作为用户端登录账号；绑定后也可用于密码重置验证码。</p>
            </div>
          </div>
          <div className="acct-identity-grid">
            <div className="acct-identity-item">
              <span>当前邮箱</span>
              <strong>{user?.email || '未绑定'}</strong>
              <small>{user?.email_verified ? '已验证' : '未验证'}</small>
            </div>
            <div className="acct-identity-item">
              <span>当前手机号</span>
              <strong>{user?.phone || '未绑定'}</strong>
              <small>{user?.phone_verified ? '已验证' : '未验证'}</small>
            </div>
          </div>
        </section>

        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="key" size={16} />
            <div>
              <h2>绑定手机号</h2>
              <p>绑定成功后支持手机号 + 密码登录，也支持短信验证码重置密码。</p>
            </div>
          </div>
          <div className="acct-form-row">
            <label>
              <span>手机号</span>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 20))} placeholder="13800000000" />
            </label>
            <button type="button" onClick={requestPhoneCode} disabled={busy === 'phone-request' || !phone}>
              {busy === 'phone-request' ? '发送中' : '发送验证码'}
            </button>
          </div>
          <div className="acct-form-row">
            <label>
              <span>短信验证码</span>
              <input value={phoneCode} onChange={e => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码" />
            </label>
            <button type="button" onClick={bindPhone} disabled={busy === 'phone-confirm' || !phone || !phoneCode}>
              {busy === 'phone-confirm' ? '绑定中' : '确认绑定'}
            </button>
          </div>
        </section>

        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="key" size={16} />
            <div>
              <h2>绑定邮箱</h2>
              <p>邮箱绑定成功后会成为主要邮箱登录账号，并可接收密码重置验证码。</p>
            </div>
          </div>
          <div className="acct-form-row">
            <label>
              <span>邮箱</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>
            <button type="button" onClick={requestEmailCode} disabled={busy === 'email-request' || !email}>
              {busy === 'email-request' ? '发送中' : '发送验证码'}
            </button>
          </div>
          <div className="acct-form-row">
            <label>
              <span>邮箱验证码</span>
              <input value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码" />
            </label>
            <button type="button" onClick={bindEmail} disabled={busy === 'email-confirm' || !email || !emailCode}>
              {busy === 'email-confirm' ? '绑定中' : '确认绑定'}
            </button>
          </div>
        </section>

        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="key" size={16} />
            <div>
              <h2>重置密码</h2>
              <p>必须使用已绑定的手机号或邮箱接收验证码；没有任一已验证身份时不能重置。</p>
            </div>
          </div>
          <div className="acct-reset-methods">
            <button
              type="button"
              className={resetMethod === 'phone' ? 'is-active' : ''}
              disabled={!canResetByPhone}
              onClick={() => setResetMethod('phone')}
            >
              手机号接收
            </button>
            <button
              type="button"
              className={resetMethod === 'email' ? 'is-active' : ''}
              disabled={!canResetByEmail}
              onClick={() => setResetMethod('email')}
            >
              邮箱接收
            </button>
          </div>
          <div className="acct-form-row">
            <label>
              <span>验证码</span>
              <input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码" disabled={!canReset} />
            </label>
            <button type="button" onClick={requestResetCode} disabled={busy === 'reset-request' || !canReset}>
              {busy === 'reset-request' ? '发送中' : '发送重置验证码'}
            </button>
          </div>
          <div className="acct-form-row">
            <label>
              <span>新密码</span>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少 6 位" disabled={!canReset} />
            </label>
            <button type="button" onClick={resetPassword} disabled={busy === 'reset-confirm' || !canReset || !resetCode || newPassword.length < 6}>
              {busy === 'reset-confirm' ? '重置中' : '确认重置'}
            </button>
          </div>
        </section>

        {notice ? <div className="acct-settings-message is-ok">{notice}</div> : null}
        {error ? <div className="acct-settings-message is-error">{error}</div> : null}
      </div>
    </div>
  )
}
