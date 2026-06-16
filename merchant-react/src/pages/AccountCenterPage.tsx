import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { LogOut } from 'lucide-react'
import { PasswordInput, toast } from '@xiaoone/react-ui'
import { setLocalRealNameOverride } from '@xiaoone/region'
import { Icon } from '../components/Icon'
import { useAuthStore as useAuth } from '../store/auth'
import { api } from '../lib/httpClient'
import { describeAxiosError, type ApiErrorLike } from '../lib/apiErrors'
import { kycOutcomeMessage } from '../lib/kycOutcome'
import type { KycStatus } from '../lib/kycTypes'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { BillingPanel } from '../panels/account/BillingPanel'
import { UsagePanel } from '../panels/account/UsagePanel'
import { TeamMembersPanel } from '../panels/account/TeamMembersPanel'
import { DefaultAvatar } from '../components/DefaultAvatar'
import { useWorkspaceStore, type AccountSettingsSubTab, type AccountTab } from '../store/workspace'
import { usePreferences } from '../app/preferences'
import { AgentArchivesPanel } from './AgentArchivesPage'
import { PartnerPlanPanel } from '../panels/account/PartnerPlanPanel'
import '../panels/account/account.css'

type TabKey = AccountTab

type BindTarget = 'phone' | 'email'
type BindAuthMethod = 'phone' | 'email'
type BindCodeKey = 'phone-auth' | 'phone-target' | 'email-auth' | 'email-target'

function maskKycName(value: string): string {
  const clean = String(value || '').trim()
  if (!clean) return ''
  if (clean.length <= 1) return '*'
  return `${clean[0]}${'*'.repeat(Math.max(1, clean.length - 1))}`
}

function maskIdCard(value: string): string {
  const clean = String(value || '').trim().toUpperCase()
  if (clean.length <= 8) return clean ? `${clean.slice(0, 1)}***${clean.slice(-1)}` : ''
  return `${clean.slice(0, 6)}${'*'.repeat(Math.max(4, clean.length - 10))}${clean.slice(-4)}`
}

interface Tab {
  key: TabKey
  labelKey: string
  icon: any
}

const TABS: Tab[] = [
  { key: 'platform', labelKey: 'account.center.tab.platform', icon: 'briefcase' },
  { key: 'usage', labelKey: 'account.center.tab.usage', icon: 'sparkles' },
  { key: 'settings', labelKey: 'account.center.tab.settings', icon: 'key' },
]

function normalizeTab(tab: unknown): TabKey {
  return tab === 'usage' || tab === 'settings' ? tab : 'platform'
}

function normalizeSettingsSection(section: string | null): AccountSettingsSubTab | null {
  if (section === 'team' || section === 'archives' || section === 'account' || section === 'partner')
    return section
  return null
}

function workspaceProviderLabel(value: string | undefined, t: (key: string) => string) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'tm' || key === 'tm_template')
    return t('account.security.workspaceTm')
  if (key === 'cvm' || key === 'cvm_bf1' || key === 'yh')
    return t('account.security.workspaceCvm')
  return value || '-'
}

const SETTINGS_SUB_TABS: { key: AccountSettingsSubTab; labelKey: string; fallback: string; menuId?: string }[] = [
  { key: 'account', labelKey: 'menu.account', fallback: '账户中心' },
  { key: 'partner', labelKey: 'menu.partner', fallback: '伙伴计划' },
  { key: 'team', labelKey: 'menu.team', fallback: '商户团队', menuId: 'teamManagement' },
  { key: 'archives', labelKey: 'menu.archives', fallback: '档案管理', menuId: 'archives' },
]

export function AccountCenterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = usePreferences()
  const workspaceTab = useWorkspaceStore(state => state.accountTab)
  const subTab = useWorkspaceStore(state => state.accountSettingsSubTab)
  const showAccount = useWorkspaceStore(state => state.showAccount)
  const setAccountSettingsSubTab = useWorkspaceStore(state => state.setAccountSettingsSubTab)
  const topTabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const settingsSection = normalizeSettingsSection(searchParams.get('section'))
  const [tab, setTab] = useState<TabKey>(() => settingsSection ? 'settings' : normalizeTab(workspaceTab))

  const visibleSettingsTabs = useMemo(
    () => SETTINGS_SUB_TABS.filter(item => !item.menuId || auth.hasMenuAccess(item.menuId)),
    [auth],
  )
  const activeTopTab: AccountSettingsSubTab = tab === 'settings' && subTab !== 'account' ? subTab : 'account'

  const selectTopTab = useCallback((next: AccountSettingsSubTab) => {
    if (next === activeTopTab)
      return
    if (next === 'account') {
      showAccount('platform')
      navigate('/workbench/account', { replace: true })
      return
    }
    setAccountSettingsSubTab(next)
    navigate(`/workbench/account?section=${next}`, { replace: true })
  }, [activeTopTab, navigate, setAccountSettingsSubTab, showAccount])

  useLocalizedTopbarSlot(() => ({
    className: 'mr-topbar--repo-tabs',
    leading: visibleSettingsTabs.length ? (
      <nav className="repo-tabs repo-tabs--topbar acct-settings-topbar-tabs" role="tablist" aria-label={t('account.settings.tabsAria', '账户设置')}>
        {visibleSettingsTabs.map(item => (
          <button
            key={item.key}
            ref={node => {
              topTabRefs.current[item.key] = node
            }}
            type="button"
            role="tab"
            className={activeTopTab === item.key ? 'is-active' : ''}
            aria-selected={activeTopTab === item.key}
            onClick={() => selectTopTab(item.key)}
          >
            {t(item.labelKey, item.fallback)}
          </button>
        ))}
      </nav>
    ) : null,
    actions: (
      <button
        type="button"
        className="acct-settings-topbar-logout"
        onClick={() => void auth.logout()}
      >
        <LogOut size={14} aria-hidden />
        <span>{t('sidebar.logout', '退出登录')}</span>
      </button>
    ),
  }), [activeTopTab, auth, selectTopTab, visibleSettingsTabs])

  useEffect(() => {
    if (!settingsSection) return
    setTab('settings')
    showAccount('settings', settingsSection)
  }, [settingsSection, showAccount])

  useEffect(() => {
    if (settingsSection) return
    const nextTab = workspaceTab === 'settings' ? 'platform' : normalizeTab(workspaceTab)
    setTab(nextTab)
    if (workspaceTab === 'settings')
      showAccount('platform')
  }, [settingsSection, workspaceTab, showAccount])

  useEffect(() => {
    topTabRefs.current[activeTopTab]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeTopTab])

  function selectTab(next: TabKey) {
    setTab(next)
    if (next === 'settings') {
      showAccount('settings', 'account')
      navigate('/workbench/account?section=account', { replace: true })
    }
    else {
      showAccount(next)
      navigate('/workbench/account', { replace: true })
    }
  }

  return (
    <section className="acct">
      {activeTopTab === 'account' ? (
        <header className="acct-head acct-head--compact">
          <nav className="acct-tabs" role="tablist" aria-label={t('account.center.tabsAria')}>
            {TABS.map(item => (
              <button
                key={item.key}
                className={`acct-tab ${tab === item.key ? 'is-active' : ''}`}
                role="tab"
                aria-selected={tab === item.key}
                type="button"
                onClick={() => selectTab(item.key)}
              >
                <Icon name={item.icon} size={13} />
                <span>{t(item.labelKey)}</span>
              </button>
            ))}
          </nav>
        </header>
      ) : null}

      {tab === 'settings' ? (
        <AccountSettingsShell />
      ) : (
        <div className="acct-content">
          {tab === 'platform' && (
          <>
            <BillingPanel />
          </>
        )}
          {tab === 'usage' && <UsagePanel />}
        </div>
      )}
    </section>
  )
}

function AccountSettingsShell() {
  const auth = useAuth()
  const [searchParams] = useSearchParams()
  const subTab = useWorkspaceStore(state => state.accountSettingsSubTab)
  const showAccount = useWorkspaceStore(state => state.showAccount)
  const setAccountSettingsSubTab = useWorkspaceStore(state => state.setAccountSettingsSubTab)
  const visibleTabs = useMemo(
    () => SETTINGS_SUB_TABS.filter(item => !item.menuId || auth.hasMenuAccess(item.menuId)),
    [auth],
  )

  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'team' || section === 'archives' || section === 'account' || section === 'partner')
      showAccount('settings', section)
  }, [searchParams, showAccount])

  useEffect(() => {
    if (!visibleTabs.some(item => item.key === subTab))
      setAccountSettingsSubTab(visibleTabs[0]?.key || 'account')
  }, [subTab, visibleTabs, setAccountSettingsSubTab])

  return (
    <div className="acct-content acct-content--settings">
      {subTab === 'account' ? <SecuritySettingsPanel /> : null}
      {subTab === 'partner' ? <PartnerPlanPanel embedded /> : null}
      {subTab === 'team' ? <TeamMembersPanel embedded /> : null}
      {subTab === 'archives' ? <AgentArchivesPanel embedded /> : null}
    </div>
  )
}

function SecuritySettingsPanel() {
  const { t } = usePreferences()
  const auth = useAuth()
  const user = auth.user
  const boundPhone = user?.phone && user?.phone_verified ? user.phone : ''
  const changeEmailIdentity = String((auth.me as { account_security?: { change_email?: string } } | null)?.account_security?.change_email || '')
  const boundEmailDisplay = user?.email && user.email_verified && !user.email.endsWith('@phone.xiaoone.local') ? user.email : ''
  const boundEmail = boundEmailDisplay || changeEmailIdentity
  const emailRequiresIdentityAuth = Boolean(boundEmailDisplay || changeEmailIdentity)
  const [profileName, setProfileName] = useState(user?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [avatarError, setAvatarError] = useState('')
  const defaultBindAuthMethod: BindAuthMethod = boundPhone ? 'phone' : 'email'
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false)
  const [phoneAuthMethod, setPhoneAuthMethod] = useState<BindAuthMethod>(() => defaultBindAuthMethod)
  const [phoneAuthCode, setPhoneAuthCode] = useState('')
  const [phoneAuthCodeRequested, setPhoneAuthCodeRequested] = useState(false)
  const [phoneAuthVerified, setPhoneAuthVerified] = useState(false)
  const [emailEditing, setEmailEditing] = useState(false)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailCodeRequested, setEmailCodeRequested] = useState(false)
  const [emailAuthMethod, setEmailAuthMethod] = useState<BindAuthMethod>(() => defaultBindAuthMethod)
  const [emailAuthCode, setEmailAuthCode] = useState('')
  const [emailAuthCodeRequested, setEmailAuthCodeRequested] = useState(false)
  const [emailAuthVerified, setEmailAuthVerified] = useState(false)
  const [resetMethod, setResetMethod] = useState<'phone' | 'email'>(() => boundPhone ? 'phone' : 'email')
  const [resetCode, setResetCode] = useState('')
  const [resetCodeCooldown, setResetCodeCooldown] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [kyc, setKyc] = useState<KycStatus | null>(null)
  const [kycName, setKycName] = useState('')
  const [kycIdCard, setKycIdCard] = useState('')
  const [kycMaskedIdCard, setKycMaskedIdCard] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [codeCooldowns, setCodeCooldowns] = useState<Record<BindCodeKey, number>>({
    'phone-auth': 0,
    'phone-target': 0,
    'email-auth': 0,
    'email-target': 0,
  })

  const canResetByPhone = Boolean(boundPhone)
  const canResetByEmail = Boolean(boundEmail)
  const canReset = canResetByPhone || canResetByEmail
  const bindAuthOptions: Array<{ value: BindAuthMethod; label: string; disabled: boolean }> = [
    { value: 'phone', label: t('account.security.bindAuthPhone'), disabled: !boundPhone },
    { value: 'email', label: t('account.security.bindAuthEmail'), disabled: !boundEmail },
  ]
  const currentMember = auth.currentMember()
  const currentMerchant = auth.currentMerchant()
  const showWorkspaceProvider = Boolean(
    auth.me?.is_platform_admin || currentMember?.role === 'owner' || currentMember?.role === 'admin',
  )
  const workspaceProvider = workspaceProviderLabel(currentMerchant?.workspace_provider || currentMerchant?.workspace_code, t)
  const kycLabel = kyc?.verified
    ? t('account.security.kycVerified')
    : kyc?.status === 'failed'
      ? t('account.security.kycFailed')
      : kyc?.status === 'pending'
        ? t('account.security.kycPending')
        : t('account.security.kycUnverified')
  const profileDirty = profileName.trim() !== (user?.name || '') || Boolean(avatarFile)
  const kycMaskedName = maskKycName(kyc?.real_name || '')

  useEffect(() => {
    setProfileName(user?.name || '')
    setAvatarPreview(user?.avatar || '')
    setAvatarFile(null)
    setAvatarError('')
  }, [user?.id, user?.name, user?.avatar])

  useEffect(() => {
    setPhoneEditing(false)
    setPhone('')
    setPhoneCode('')
    setPhoneCodeRequested(false)
    setPhoneAuthMethod(defaultBindAuthMethod)
    setPhoneAuthCode('')
    setPhoneAuthCodeRequested(false)
    setPhoneAuthVerified(false)
    setEmailEditing(false)
    setEmail('')
    setEmailCode('')
    setEmailCodeRequested(false)
    setEmailAuthMethod(defaultBindAuthMethod)
    setEmailAuthCode('')
    setEmailAuthCodeRequested(false)
    setEmailAuthVerified(false)
  }, [user?.id, boundPhone, boundEmail, defaultBindAuthMethod])

  useEffect(() => {
    if (resetMethod === 'phone' && !canResetByPhone && canResetByEmail)
      setResetMethod('email')
    if (resetMethod === 'email' && !canResetByEmail && canResetByPhone)
      setResetMethod('phone')
  }, [canResetByEmail, canResetByPhone, resetMethod])

  useEffect(() => {
    if (!avatarFile) return
    const objectUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [avatarFile])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResetCodeCooldown(prev => (prev > 0 ? prev - 1 : prev))
      setCodeCooldowns(prev => {
        let changed = false
        const next = { ...prev }
        for (const key of Object.keys(next) as BindCodeKey[]) {
          if (next[key] > 0) {
            next[key] -= 1
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    api.get('/api/v1/iam/merchant/kyc/status/')
      .then(r => {
        const nextKyc = r.data?.data || r.data
        setKyc(nextKyc)
        if (!nextKyc?.verified) setKycMaskedIdCard('')
      })
      .catch(() => {})
  }, [])

  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return
    setBusy(label)
    setError('')
    try {
      await fn()
    }
    catch (err) {
      const message = describeAxiosError(err, t('account.security.errorGeneric'))
      setError(message)
      toast.error(message)
    }
    finally {
      setBusy('')
    }
  }

  function notifySuccess(message: string) {
    setNotice('')
    toast.success(message, { duration: 4000 })
  }

  async function verifyBindAuth(target: BindTarget, method: BindAuthMethod, code: string) {
    await run(`${target}-auth-verify`, async () => {
      await api.post('/api/v1/iam/account/bind-auth/verify/', { target, method, code: code.trim() })
      if (target === 'phone') {
        setPhoneAuthVerified(true)
      }
      else {
        setEmailAuthVerified(true)
      }
      notifySuccess(t('account.security.authVerified'))
    })
  }

  async function requestPhoneCode() {
    if (codeCooldowns['phone-target'] > 0) return
    if (boundPhone && !phoneAuthVerified) {
      setError(t('account.security.verifyBeforePhoneCode'))
      toast.error(t('account.security.verifyBeforePhoneCode'))
      return
    }
    await run('phone-request', async () => {
      const nextPhone = phone.trim()
      const payload: Record<string, string> = { phone: nextPhone }
      if (boundPhone) {
        payload.auth_method = phoneAuthMethod
        payload.auth_code = phoneAuthCode
      }
      await api.post('/api/v1/iam/account/bind-phone/request/', payload)
      setPhone(nextPhone)
      setPhoneCodeRequested(true)
      startCodeCooldown('phone-target')
      setNotice('')
      notifySuccess(boundPhone ? t('account.security.phoneCodeRebind') : t('account.security.phoneCodeBind'))
    })
  }

  async function bindPhone() {
    await run('phone-confirm', async () => {
      const payload: Record<string, string> = { phone, code: phoneCode }
      if (boundPhone) {
        payload.auth_method = phoneAuthMethod
        payload.auth_code = phoneAuthCode
      }
      await api.post('/api/v1/iam/account/bind-phone/confirm/', payload)
      await auth.fetchMe()
      setPhoneEditing(false)
      setPhone('')
      setPhoneCode('')
      setPhoneCodeRequested(false)
      setPhoneAuthCode('')
      setPhoneAuthCodeRequested(false)
      setPhoneAuthVerified(false)
      notifySuccess(boundPhone ? t('account.security.phoneRebound') : t('account.security.phoneBound'))
    })
  }

  async function requestBindAuthCode(target: BindTarget, method: BindAuthMethod) {
    const cooldownKey: BindCodeKey = `${target}-auth` as BindCodeKey
    if (codeCooldowns[cooldownKey] > 0) return
    await run(`${target}-auth-request`, async () => {
      await api.post('/api/v1/iam/account/bind-auth/request/', { target, method })
      if (target === 'phone')
        setPhoneAuthCodeRequested(true)
      else
        setEmailAuthCodeRequested(true)
      startCodeCooldown(cooldownKey)
      setNotice('')
      notifySuccess(method === 'phone' ? t('account.security.phoneAuthCodeSent') : t('account.security.emailAuthCodeSent'))
    })
  }

  async function requestEmailCode() {
    if (codeCooldowns['email-target'] > 0) return
    if (emailRequiresIdentityAuth && !emailAuthVerified) {
      setError(t('account.security.verifyBeforeEmailCode'))
      toast.error(t('account.security.verifyBeforeEmailCode'))
      return
    }
    await run('email-request', async () => {
      const nextEmail = email.trim().toLowerCase()
      const payload: Record<string, string> = { email: nextEmail }
      if (emailRequiresIdentityAuth) {
        payload.auth_method = emailAuthMethod
        payload.auth_code = emailAuthCode
      }
      try {
        await api.post('/api/v1/iam/account/bind-email/request/', payload)
      }
      catch (err) {
        const message = describeAxiosError(err, t('account.security.emailCodeSendFailed'))
        if (/更换邮箱前，请先验证/.test(message)) {
          setEmailEditing(true)
          setEmailAuthCodeRequested(false)
          setEmailAuthVerified(false)
        }
        throw err
      }
      setEmail(nextEmail)
      setEmailCodeRequested(true)
      startCodeCooldown('email-target')
      setNotice('')
      notifySuccess(boundEmailDisplay ? t('account.security.emailCodeRebind') : t('account.security.emailCodeBind'))
    })
  }

  async function bindEmail() {
    await run('email-confirm', async () => {
      const payload: Record<string, string> = { email, code: emailCode }
      if (emailRequiresIdentityAuth) {
        payload.auth_method = emailAuthMethod
        payload.auth_code = emailAuthCode
      }
      await api.post('/api/v1/iam/account/bind-email/confirm/', payload)
      await auth.fetchMe()
      setEmailEditing(false)
      setEmail('')
      setEmailCode('')
      setEmailCodeRequested(false)
      setEmailAuthCode('')
      setEmailAuthCodeRequested(false)
      setEmailAuthVerified(false)
      notifySuccess(boundEmailDisplay ? t('account.security.emailRebound') : t('account.security.emailBound'))
    })
  }

  async function requestResetCode() {
    if (resetCodeCooldown > 0) return
    await run('reset-request', async () => {
      await api.post('/api/v1/iam/account/password/reset-code/', { method: resetMethod })
      const message = resetMethod === 'phone' ? t('account.security.resetSmsSent') : t('account.security.resetEmailSent')
      setResetCodeCooldown(30)
      setNotice(message)
      notifySuccess(message)
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
      setNotice(t('account.security.passwordReset'))
    })
  }

  async function submitKyc() {
    await run('kyc-submit', async () => {
      try {
        const submittedName = kycName.trim()
        const submittedIdCard = kycIdCard.trim()
        const r = await api.post('/api/v1/iam/merchant/kyc/start/', {
          name: submittedName,
          id_card: submittedIdCard,
        })
        const nextKyc = (r.data?.data || r.data) as KycStatus
        setKyc(nextKyc)
        if (nextKyc?.verified) {
          setKycMaskedIdCard(maskIdCard(submittedIdCard))
          setKycName('')
          setKycIdCard('')
          setLocalRealNameOverride(true)
          notifySuccess(t('account.security.kycPassed'))
        }
        else
          setError(kycOutcomeMessage(String(nextKyc?.metadata?.outcome || ''), nextKyc?.failure_reason, t))
      }
      catch (err) {
        const axiosErr = err as ApiErrorLike
        const nextKyc = axiosErr.response?.data?.data as KycStatus | undefined
        if (nextKyc) {
          setKyc(nextKyc)
          setError(kycOutcomeMessage(String(nextKyc.metadata?.outcome || ''), nextKyc.failure_reason, t))
          return
        }
        throw err
      }
    })
  }

  async function skipKyc() {
    await run('kyc-skip', async () => {
      const r = await api.post('/api/v1/iam/merchant/kyc/skip/', { reason: 'provider unconfigured from account center' })
      setKyc(r.data?.data || r.data)
      setNotice(t('account.security.kycSkippedNotice'))
    })
  }

  function pickAvatarFile(file: File | undefined) {
    if (!file) return
    setError('')
    setNotice('')
    setAvatarError('')
    if (!file.type.startsWith('image/')) {
      setAvatarError(t('account.security.avatarNotImage'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t('account.security.avatarTooLarge'))
      return
    }
    setAvatarFile(file)
  }

  async function saveProfile() {
    await run('profile-save', async () => {
      let nextAvatar = user?.avatar || ''
      if (avatarFile) {
        const form = new FormData()
        form.append('avatar', avatarFile)
        const uploaded = await api.post('/api/v1/iam/account/profile/avatar/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const uploadedAvatar = uploaded.data?.data?.avatar || uploaded.data?.avatar
        if (uploadedAvatar) {
          nextAvatar = uploadedAvatar
          setAvatarPreview(uploadedAvatar)
        }
      }
      await api.patch('/api/v1/iam/account/profile/', {
        name: profileName.trim(),
        avatar: nextAvatar,
      })
      await auth.fetchMe()
      setAvatarFile(null)
      setAvatarError('')
      setNotice(t('account.security.profileSaved'))
    })
  }

  const phoneIsSameAsCurrent = Boolean(boundPhone && phone.trim() === boundPhone)
  const emailIsSameAsCurrent = Boolean(boundEmail && email.trim().toLowerCase() === boundEmail.toLowerCase())
  const phoneCurrentAuthReady = !boundPhone || phoneAuthVerified
  const emailCurrentAuthReady = !emailRequiresIdentityAuth || emailAuthVerified
  const phoneConfirmDisabled = busy === 'phone-confirm'
    || !phone.trim()
    || !phoneCode
    || phoneIsSameAsCurrent
    || !phoneCurrentAuthReady
  const emailConfirmDisabled = busy === 'email-confirm'
    || !email.trim()
    || !emailCode
    || emailIsSameAsCurrent
    || !emailCurrentAuthReady

  function startCodeCooldown(key: BindCodeKey) {
    setCodeCooldowns(prev => ({ ...prev, [key]: 60 }))
  }

  function codeButtonLabel(key: BindCodeKey, activeLabel: string, requested: boolean) {
    const remaining = codeCooldowns[key] || 0
    if (remaining > 0) return `${remaining}s`
    if (busy === `${key.includes('auth') ? key.replace('-auth', '') : key.replace('-target', '')}-${key.includes('auth') ? 'auth-request' : 'request'}`)
      return t('account.security.sendingCode')
    return requested ? t('account.security.resendCode') : activeLabel
  }

  function cancelPhoneBinding() {
    setPhoneEditing(false)
    setPhone('')
    setPhoneCode('')
    setPhoneCodeRequested(false)
    setPhoneAuthCode('')
    setPhoneAuthCodeRequested(false)
    setPhoneAuthVerified(false)
  }

  function cancelEmailBinding() {
    setEmailEditing(false)
    setEmail('')
    setEmailCode('')
    setEmailCodeRequested(false)
    setEmailAuthCode('')
    setEmailAuthCodeRequested(false)
    setEmailAuthVerified(false)
  }

  function renderIdentityBindCard(options: {
    title: string
    description: string
    boundValue: string
    editing: boolean
    setEditing: (value: boolean) => void
    value: string
    code: string
    codeRequested: boolean
    authMethod: BindAuthMethod
    authCode: string
    authCodeRequested: boolean
    authVerified: boolean
    requireIdentityAuth?: boolean
    currentAuthReady: boolean
    isSameAsCurrent: boolean
    confirmDisabled: boolean
    requestBusy: string
    authRequestBusy: string
    confirmBusy: string
    targetCooldownKey: BindCodeKey
    authCooldownKey: BindCodeKey
    currentLabel: string
    newLabel: string
    inputType?: string
    inputPlaceholder: string
    codeLabel: string
    confirmLabel: string
    bindNowLabel: string
    changeDoneLabel: string
    onChangeValue: (value: string) => void
    onChangeCode: (value: string) => void
    onChangeAuthMethod: (value: BindAuthMethod) => void
    onChangeAuthCode: (value: string) => void
    onCancel: () => void
    onRequestTargetCode: () => void
    onRequestAuthCode: () => void
    onVerifyAuth: () => void
    onConfirm: () => void
  }) {
    const hasBoundValue = Boolean(options.boundValue)
    const needsIdentityAuth = hasBoundValue || Boolean(options.requireIdentityAuth)
    const targetLocked = needsIdentityAuth && !options.currentAuthReady
    const authMethodAvailable = options.authMethod === 'phone' ? Boolean(boundPhone) : Boolean(boundEmail)
    return (
      <section className="acct-settings-card">
        <div className="acct-settings-card-head">
          <Icon name="key" size={16} />
          <div>
            <h2>{options.title}</h2>
            <p>{options.description}</p>
          </div>
        </div>
        {hasBoundValue && !options.editing ? (
          <div className="acct-form-row">
            <label>
              <span>{options.currentLabel}</span>
              <input type={options.inputType || 'text'} value={options.boundValue} readOnly disabled />
            </label>
            <button type="button" onClick={() => options.setEditing(true)}>{t('account.security.changeBinding')}</button>
          </div>
        ) : (
          <>
            {hasBoundValue ? (
              <div className="acct-bind-current">
                <div>
                  <span>{options.currentLabel}</span>
                  <strong>{options.boundValue}</strong>
                </div>
                <button type="button" onClick={options.onCancel}>{t('account.security.cancel')}</button>
              </div>
            ) : null}
            {needsIdentityAuth ? (
              <div className="acct-bind-auth">
                <div className="acct-bind-auth-head">
                  <span>{t('account.security.verifyCurrentIdentity')}</span>
                  <small>{t('account.security.verifyCurrentIdentityHint')}</small>
                </div>
                <div className="acct-reset-methods acct-bind-methods">
                  {bindAuthOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={options.authMethod === option.value ? 'is-active' : ''}
                      disabled={option.disabled}
                      onClick={() => {
                        options.onChangeAuthMethod(option.value)
                        options.onChangeAuthCode('')
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="acct-form-row">
                  <label>
                    <span>{t('account.security.currentAuthCode')}</span>
                    <input
                      value={options.authCode}
                      onChange={e => options.onChangeAuthCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('account.security.codePlaceholder')}
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={options.onRequestAuthCode}
                    disabled={busy === options.authRequestBusy || codeCooldowns[options.authCooldownKey] > 0 || !authMethodAvailable}
                  >
                    {codeButtonLabel(options.authCooldownKey, t('account.security.sendCode'), options.authCodeRequested)}
                  </button>
                  <button
                    type="button"
                    onClick={options.onVerifyAuth}
                    disabled={busy.includes('auth-verify') || options.authCode.length !== 6 || options.authVerified}
                  >
                    {options.authVerified ? t('account.security.verified') : t('account.security.confirmVerify')}
                  </button>
                </div>
              </div>
            ) : null}
            <div className={`acct-form-row${targetLocked ? ' is-disabled' : ''}`}>
              <label>
                <span>{hasBoundValue ? options.newLabel : options.currentLabel}</span>
                <input
                  type={options.inputType || 'text'}
                  value={options.value}
                  onChange={e => options.onChangeValue(e.target.value)}
                  placeholder={targetLocked ? t('account.security.verifyIdentityFirst') : options.inputPlaceholder}
                  autoComplete="off"
                  disabled={targetLocked}
                />
              </label>
              <button
                type="button"
                onClick={options.onRequestTargetCode}
                disabled={busy === options.requestBusy || codeCooldowns[options.targetCooldownKey] > 0 || targetLocked || !options.value.trim() || options.isSameAsCurrent}
              >
                {codeButtonLabel(options.targetCooldownKey, hasBoundValue ? t('account.security.sendCode') : options.bindNowLabel, options.codeRequested)}
              </button>
            </div>
            {options.codeRequested ? (
              <div className="acct-form-row">
                <label>
                  <span>{options.codeLabel}</span>
                  <input
                    value={options.code}
                    onChange={e => options.onChangeCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('account.security.codePlaceholder')}
                    autoComplete="off"
                  />
                </label>
                <button type="button" onClick={options.onConfirm} disabled={options.confirmDisabled}>
                  {busy === options.confirmBusy ? t('account.security.binding') : hasBoundValue ? options.changeDoneLabel : options.confirmLabel}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    )
  }

  return (
    <div className="apage apage--embedded">
      <div className="apage-body acct-settings">
        <section className="acct-settings-card acct-profile-card">
          <div className="acct-settings-card-head">
            <Icon name="user" size={16} />
            <div>
              <h2>{t('account.security.profileTitle')}</h2>
              <p>{t('account.security.profileDesc')}</p>
            </div>
          </div>
          <div className="acct-profile-editor">
            <DefaultAvatar src={avatarPreview} className="acct-profile-avatar" alt="" />
            <div className="acct-profile-fields">
              <label>
                <span>{t('account.security.displayName')}</span>
                <input value={profileName} onChange={e => setProfileName(e.target.value.slice(0, 64))} placeholder={t('account.security.displayNamePlaceholder')} />
              </label>
              <div className="acct-profile-upload-note">
                <span>{t('account.security.avatarLabel')}</span>
                <small>{t('account.security.avatarHint')}</small>
              </div>
            </div>
          </div>
          <div className="acct-profile-actions">
            <label className="acct-file-button">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={e => {
                  pickAvatarFile(e.target.files?.[0])
                  e.currentTarget.value = ''
                }}
              />
              {t('account.security.chooseImage')}
            </label>
            <button type="button" onClick={saveProfile} disabled={busy === 'profile-save' || !profileName.trim() || !profileDirty}>
              {busy === 'profile-save' ? t('account.security.savingProfile') : t('account.security.saveProfile')}
            </button>
          </div>
          {avatarError ? <div className="acct-inline-error">{avatarError}</div> : null}
        </section>

        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="user" size={16} />
            <div>
              <h2>{t('account.security.identityTitle')}</h2>
              <p>{t('account.security.identityDesc')}</p>
            </div>
          </div>
          <div className="acct-identity-grid">
            <div className="acct-identity-item">
              <span>{t('account.security.currentEmail')}</span>
              <strong>{boundEmail || t('account.security.notBound')}</strong>
              <small>{boundEmail ? t('account.security.verified') : t('account.security.notBound')}</small>
            </div>
            <div className="acct-identity-item">
              <span>{t('account.security.currentPhone')}</span>
              <strong>{boundPhone || t('account.security.notBound')}</strong>
              <small>{boundPhone ? t('account.security.verified') : t('account.security.notBound')}</small>
            </div>
            <div className="acct-identity-item">
              <span>{t('account.security.kycStatus')}</span>
              <strong>{kycLabel}</strong>
              <small>{kyc?.provider_configured ? t('account.security.kycProviderConfigured') : t('account.security.kycProviderMissing')}</small>
            </div>
            {showWorkspaceProvider ? (
              <div className="acct-identity-item">
                <span>{t('account.security.workspaceType')}</span>
                <strong>{workspaceProvider}</strong>
                <small>{t('account.security.adminOnly')}</small>
              </div>
            ) : null}
          </div>
        </section>

        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="key" size={16} />
            <div>
              <h2>{t('account.security.kycSectionTitle')}</h2>
              <p>{t('account.security.kycSectionDesc')}</p>
            </div>
          </div>
          {kyc?.verified ? (
            <div className="acct-identity-grid">
              <div className="acct-identity-item">
                <span>{t('account.security.kycName')}</span>
                <strong>{kycMaskedName || t('account.security.kycVerified')}</strong>
                <small>{t('account.security.kycVerified')}</small>
              </div>
              <div className="acct-identity-item">
                <span>{t('account.security.kycIdCard')}</span>
                <strong>{kycMaskedIdCard || t('account.security.kycVerified')}</strong>
                <small>{t('account.security.kycVerified')}</small>
              </div>
            </div>
          ) : (
            <div className="acct-form-stack acct-kyc-form">
              <label>
                <span>{t('account.security.kycName')}</span>
                <input value={kycName} onChange={e => setKycName(e.target.value)} placeholder={t('account.security.kycNamePlaceholder')} autoComplete="off" />
              </label>
              <label>
                <span>{t('account.security.kycIdCard')}</span>
                <input value={kycIdCard} onChange={e => setKycIdCard(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder={t('account.security.kycIdPlaceholder')} autoComplete="off" />
              </label>
              <button type="button" onClick={submitKyc} disabled={busy === 'kyc-submit' || !kycName || !kycIdCard || !kyc?.provider_configured}>
                {busy === 'kyc-submit' ? t('account.security.kycSubmitting') : t('account.security.kycSubmit')}
              </button>
            </div>
          )}
          {!kyc?.provider_configured && (
            <div className="acct-form-row">
              <label>
                <span>{t('account.security.kycCurrentStatus')}</span>
                <input value={t('account.security.kycProviderUnconfigured')} readOnly />
              </label>
              <button type="button" onClick={skipKyc} disabled={busy === 'kyc-skip' || kyc?.verified}>
                {busy === 'kyc-skip' ? t('account.security.kycSkipping') : t('account.security.kycSkip')}
              </button>
            </div>
          )}
          {kyc?.failure_reason ? <div className="acct-settings-message is-error">{kyc.failure_reason}</div> : null}
        </section>

        {renderIdentityBindCard({
          title: t('account.security.bindPhoneTitle'),
          description: t('account.security.bindPhoneDesc'),
          boundValue: boundPhone,
          editing: phoneEditing,
          setEditing: setPhoneEditing,
          value: phone,
          code: phoneCode,
          codeRequested: phoneCodeRequested,
          authMethod: phoneAuthMethod,
          authCode: phoneAuthCode,
          authCodeRequested: phoneAuthCodeRequested,
          authVerified: phoneAuthVerified,
          currentAuthReady: phoneCurrentAuthReady,
          isSameAsCurrent: phoneIsSameAsCurrent,
          confirmDisabled: phoneConfirmDisabled,
          requestBusy: 'phone-request',
          authRequestBusy: 'phone-auth-request',
          confirmBusy: 'phone-confirm',
          targetCooldownKey: 'phone-target',
          authCooldownKey: 'phone-auth',
          currentLabel: t('account.security.phoneLabel'),
          newLabel: t('account.security.newPhoneLabel'),
          inputPlaceholder: t('account.security.phonePlaceholder'),
          codeLabel: boundPhone ? t('account.security.newPhoneCode') : t('account.security.smsCode'),
          confirmLabel: t('account.security.confirmBind'),
          bindNowLabel: t('account.security.bindNow'),
          changeDoneLabel: t('account.security.confirmRebind'),
          onChangeValue: value => setPhone(value.replace(/[^\d+]/g, '').slice(0, 20)),
          onChangeCode: setPhoneCode,
          onChangeAuthMethod: value => {
            setPhoneAuthMethod(value)
            setPhoneAuthCodeRequested(false)
          },
          onChangeAuthCode: setPhoneAuthCode,
          onCancel: cancelPhoneBinding,
          onRequestTargetCode: () => void requestPhoneCode(),
          onRequestAuthCode: () => void requestBindAuthCode('phone', phoneAuthMethod),
          onVerifyAuth: () => void verifyBindAuth('phone', phoneAuthMethod, phoneAuthCode),
          onConfirm: () => void bindPhone(),
        })}

        {renderIdentityBindCard({
          title: t('account.security.bindEmailTitle'),
          description: t('account.security.bindEmailDesc'),
          boundValue: boundEmailDisplay,
          editing: emailEditing || (emailRequiresIdentityAuth && !boundEmailDisplay),
          setEditing: setEmailEditing,
          value: email,
          code: emailCode,
          codeRequested: emailCodeRequested,
          authMethod: emailAuthMethod,
          authCode: emailAuthCode,
          authCodeRequested: emailAuthCodeRequested,
          authVerified: emailAuthVerified,
          requireIdentityAuth: emailRequiresIdentityAuth,
          currentAuthReady: emailCurrentAuthReady,
          isSameAsCurrent: emailIsSameAsCurrent,
          confirmDisabled: emailConfirmDisabled,
          requestBusy: 'email-request',
          authRequestBusy: 'email-auth-request',
          confirmBusy: 'email-confirm',
          targetCooldownKey: 'email-target',
          authCooldownKey: 'email-auth',
          currentLabel: t('account.security.emailLabel'),
          newLabel: t('account.security.newEmailLabel'),
          inputType: 'email',
          inputPlaceholder: t('account.security.emailPlaceholder'),
          codeLabel: boundEmailDisplay ? t('account.security.newEmailCode') : t('account.security.emailCode'),
          confirmLabel: t('account.security.confirmBind'),
          bindNowLabel: t('account.security.bindNow'),
          changeDoneLabel: t('account.security.confirmRebind'),
          onChangeValue: setEmail,
          onChangeCode: setEmailCode,
          onChangeAuthMethod: value => {
            setEmailAuthMethod(value)
            setEmailAuthCodeRequested(false)
          },
          onChangeAuthCode: setEmailAuthCode,
          onCancel: cancelEmailBinding,
          onRequestTargetCode: () => void requestEmailCode(),
          onRequestAuthCode: () => void requestBindAuthCode('email', emailAuthMethod),
          onVerifyAuth: () => void verifyBindAuth('email', emailAuthMethod, emailAuthCode),
          onConfirm: () => void bindEmail(),
        })}

        <section className="acct-settings-card">
          <div className="acct-settings-card-head">
            <Icon name="key" size={16} />
            <div>
              <h2>{t('account.security.resetTitle')}</h2>
              <p>{t('account.security.resetDesc')}</p>
            </div>
          </div>
          <div className="acct-reset-methods">
            <button
              type="button"
              className={resetMethod === 'phone' ? 'is-active' : ''}
              disabled={!canResetByPhone}
              onClick={() => setResetMethod('phone')}
            >
              {t('account.security.resetByPhone')}
            </button>
            <button
              type="button"
              className={resetMethod === 'email' ? 'is-active' : ''}
              disabled={!canResetByEmail}
              onClick={() => setResetMethod('email')}
            >
              {t('account.security.resetByEmail')}
            </button>
          </div>
          <div className="acct-form-row">
            <label>
              <span>{t('account.security.resetCode')}</span>
              <input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={t('account.security.codePlaceholder')} disabled={!canReset} />
            </label>
            <button type="button" onClick={requestResetCode} disabled={busy === 'reset-request' || !canReset || resetCodeCooldown > 0}>
              {busy === 'reset-request' ? t('account.security.sendingCode') : resetCodeCooldown > 0 ? `${resetCodeCooldown}s` : t('account.security.sendResetCode')}
            </button>
          </div>
          <div className="acct-form-row">
            <label>
              <span>{t('account.security.newPassword')}</span>
              <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('account.security.newPasswordPlaceholder')} disabled={!canReset} />
            </label>
            <button type="button" onClick={resetPassword} disabled={busy === 'reset-confirm' || !canReset || !resetCode || newPassword.length < 6}>
              {busy === 'reset-confirm' ? t('account.security.resetting') : t('account.security.confirmReset')}
            </button>
          </div>
        </section>

        {error ? <div className="acct-settings-message is-error">{error}</div> : null}
      </div>
    </div>
  )
}
