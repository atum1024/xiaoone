import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Cloud,
  ImagePlus,
  Lock,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { api } from '../lib/httpClient'
import { describeAxiosError } from '../lib/apiErrors'
import { runTencentCaptcha } from '../lib/tencentCaptcha'
import { useAuthStore } from '../store/auth'
import { ApiError } from '../lib/apiErrors'
import { getPublicSiteHomeHref, getPublicSiteOrigin } from '../lib/publicSite'
import { merchantSubdomainFqdn, setLocalIpRegionOverride, useRegion } from '@xiaoone/region'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, PasswordInput } from '@xiaoone/react-ui'
import { usePortalPrefs } from '../portal/portalPrefs'
import { portalDict } from '../portal/dict'
import { PortalToggleBar } from '../portal/PortalToggleBar'
import { PortalStyleSwitch } from '../portal/PortalStyleSwitch'
import { usePortalStyleMode } from '../portal/portalStyleMode'
import { AuthChatPage } from '../portal/AuthChatPage'
import { defaultXiaooneUsername } from '../lib/userDisplay'
import { IS_LOCAL_DEPLOY } from '../lib/deployEnv'
import { deriveMerchantSubdomain, isValidMerchantSubdomain } from '../lib/subdomain'
import { resetWorkspacePreparingDismissal } from '../components/WorkspacePreparingModal'
import { DefaultAvatar } from '../components/DefaultAvatar'
import { buildMembershipPath, resolveAuthedLandingPath } from '../lib/membershipRouting'
import { FirstScreenBackdrop } from '../components/FirstScreenBackdrop'

type IdentifierType = 'phone' | 'email'
type WorkspaceProvider = 'tm' | 'cvm'
type SubdomainStatus = 'idle' | 'checking' | 'available' | 'invalid' | 'taken'
type RegisterStep = 'identity' | 'workspace'
type LegalDialogKind = 'terms' | 'privacy'

const REGISTER_STEPS: Array<{ key: RegisterStep; label: string }> = [
  { key: 'identity', label: '账号验证' },
  { key: 'workspace', label: '开通工作站' },
]

export function RegisterPage() {
  const { isChat } = usePortalStyleMode()
  if (isChat)
    return <AuthChatPage initialFlow="register" />

  return <RegisterPageClassic />
}

function RegisterPageClassic() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const auth = useAuthStore()
  const publicHome = getPublicSiteHomeHref()
  const publicSiteOrigin = getPublicSiteOrigin()
  const prefs = usePortalPrefs()
  const { locale, theme, t } = prefs
  const { region } = useRegion()
  const isOverseas = region === 'overseas'
  const regionDefaultType: IdentifierType = isOverseas ? 'email' : 'phone'

  const [step, setStep] = useState<RegisterStep>('identity')
  const [flowOwnsAuthedSession, setFlowOwnsAuthedSession] = useState(false)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [identifierType, setIdentifierType] = useState<IdentifierType>(regionDefaultType)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>('idle')
  const [workspaceProvider, setWorkspaceProvider] = useState<WorkspaceProvider>('tm')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)
  const [smsSending, setSmsSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [legalDialog, setLegalDialog] = useState<LegalDialogKind | null>(null)

  const legalTermsHref = `${publicSiteOrigin}/terms`
  const legalPrivacyHref = `${publicSiteOrigin}/privacy`
  const legalDialogHref = legalDialog === 'terms' ? legalTermsHref : legalPrivacyHref
  const legalDialogTitle = legalDialog === 'terms'
    ? t(portalDict.registerTermsAgreement).replace(/[《》]/g, '')
    : t(portalDict.registerTermsPrivacy).replace(/[《》]/g, '')
  const normalizedEmail = email.trim().toLowerCase()
  const fallbackNick = defaultXiaooneUsername(
    identifierType === 'email' ? normalizedEmail : undefined,
    identifierType === 'phone' ? phone : undefined,
  )
  const displayNick = nickname.trim() || fallbackNick
  const derivedSubdomain = useMemo(() => {
    const fallback = identifierType === 'phone'
      ? `xiaoone${phone.slice(-4) || 'work'}`
      : `xiaoone-${(normalizedEmail.split('@')[0] || 'work').slice(0, 10)}`
    return deriveMerchantSubdomain(workspaceName, fallback)
  }, [identifierType, normalizedEmail, phone, workspaceName])

  const selectedPlanCode = (() => {
    const raw = String(searchParams.get('plan_code') || '').trim().toLowerCase()
    return raw === 'personal' || raw === 'startup' || raw === 'business' ? raw : ''
  })()
  const selectedTermMonths = (() => {
    const raw = String(searchParams.get('term') || '').trim()
    return raw === '1' || raw === '3' || raw === '6' || raw === '12' ? raw : ''
  })()
  const [partnerCode, setPartnerCode] = useState('')

  useEffect(() => {
    const raw = String(searchParams.get('partner_code') || searchParams.get('referral_code') || '').trim()
    if (raw)
      setPartnerCode(raw.slice(0, 20))
  }, [searchParams])

  useEffect(() => {
    setIdentifierType(regionDefaultType)
    setIdentityVerified(false)
    setCode('')
    setError('')
    setNotice('')
    setSmsCooldown(0)
    setSmsSending(false)
    setStep('identity')
  }, [regionDefaultType])

  useEffect(() => {
    if (!workspaceName.trim()) {
      setSubdomainStatus('idle')
      return
    }
    if (!isValidMerchantSubdomain(derivedSubdomain)) {
      setSubdomainStatus('invalid')
      return
    }
    let alive = true
    setSubdomainStatus('checking')
    const timer = window.setTimeout(async () => {
      try {
        await api.get('/api/v1/iam/public/subdomain/check/', {
          params: { sub: derivedSubdomain, region },
        })
        if (alive) setSubdomainStatus('available')
      }
      catch (err: any) {
        if (!alive) return
        const message = String(err?.response?.data?.message || '')
        setSubdomainStatus(message === 'subdomain_taken' ? 'taken' : 'invalid')
      }
    }, 260)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [derivedSubdomain, region, workspaceName])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return
    }
    const objectUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [avatarFile])

  if (auth.status === 'authed' && !flowOwnsAuthedSession)
    return <Navigate to={resolveAuthedLandingPath(auth.subscriptionPlanCode)} replace />

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  }

  function markIdentityDirty() {
    setIdentityVerified(false)
    if (step !== 'identity') setStep('identity')
  }

  function switchIdentifierType(nextType: IdentifierType) {
    if (!IS_LOCAL_DEPLOY) return
    if (nextType === 'email') setLocalIpRegionOverride('overseas')
    if (nextType === 'phone') setLocalIpRegionOverride('mainland')
    setIdentifierType(nextType)
    setCode('')
    setError('')
    setNotice('')
    setSmsCooldown(0)
    setSmsSending(false)
    setIdentityVerified(false)
  }

  function startSmsCooldown() {
    setSmsCooldown(60)
    const tick = window.setInterval(() => {
      setSmsCooldown(prev => {
        if (prev <= 1) {
          window.clearInterval(tick)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function validateIdentityFields(): boolean {
    if (identifierType === 'phone' && !/^\d{11}$/.test(phone)) {
      setError(t(portalDict.registerErrorPhoneInvalid))
      return false
    }
    if (identifierType === 'email' && !isValidEmail(email)) {
      setError(t(portalDict.registerErrorEmailInvalid))
      return false
    }
    if (!code.trim()) {
      setError(t(portalDict.registerErrorCode))
      return false
    }
    if ((password || '').length < 6) {
      setError(t(portalDict.registerErrorPassword))
      return false
    }
    if (password !== passwordConfirm) {
      setError(t(portalDict.registerErrorPasswordMismatch))
      return false
    }
    if (!acceptedTerms) {
      setError(t(portalDict.registerErrorTerms))
      return false
    }
    return true
  }

  async function requestCode() {
    setError('')
    setNotice('')
    if (identifierType === 'phone' && !/^\d{11}$/.test(phone)) {
      setError(t(portalDict.registerErrorPhoneInvalid))
      return
    }
    if (identifierType === 'email' && !isValidEmail(email)) {
      setError(t(portalDict.registerErrorEmailInvalid))
      return
    }
    setSmsSending(true)
    try {
      const captcha = await runTencentCaptcha()
      if (identifierType === 'phone') {
        await api.post('/api/v1/iam/public/sms/request/', {
          phone,
          scene: 'register',
          ...captcha,
        })
      }
      else {
        await api.post('/api/v1/iam/public/email/request/', {
          email: normalizedEmail,
          scene: 'register',
          ...captcha,
        })
      }
      setNotice(identifierType === 'phone'
        ? (isOverseas ? 'SMS code sent.' : '短信验证码已发送。')
        : (isOverseas ? 'Email code sent.' : '邮箱验证码已发送。'))
      startSmsCooldown()
    }
    catch (err) {
      setError(describeAxiosError(err, t(identifierType === 'phone'
        ? portalDict.registerErrorSmsFallback
        : portalDict.registerErrorEmailFallback)))
    }
    finally {
      setSmsSending(false)
    }
  }

  function describeRegisterError(err: unknown): string {
    const axiosErr = err as {
      response?: {
        data?: {
          message?: unknown
          data?: {
            allowed?: unknown
          }
        }
      }
    }
    const message = typeof axiosErr.response?.data?.message === 'string'
      ? axiosErr.response.data.message.trim()
      : ''
    if (message === 'region_not_supported') {
      const allowed = Array.isArray(axiosErr.response?.data?.data?.allowed)
        ? axiosErr.response.data.data.allowed.map(String)
        : []
      const english = locale === 'en'
      if (allowed.includes('phone')) {
        return english
          ? 'Phone registration only in the current experience. Switch to mainland experience or use a mainland phone number.'
          : '当前体验仅支持手机号注册。请切换为大陆体验或使用大陆手机号。'
      }
      if (allowed.includes('email')) {
        return english
          ? 'Email registration only in the current experience. Switch to global experience to continue.'
          : '当前体验仅支持邮箱注册。请切换为海外体验后继续。'
      }
      return english
        ? 'This registration method is not available in the current experience. Switch region experience and try again.'
        : '当前体验不支持该注册方式。请切换区域体验后重试。'
    }
    if (message === 'terms_acceptance_required')
      return t(portalDict.registerErrorTerms)
    if (err instanceof ApiError && err.message) return err.message
    return describeAxiosError(err, t(portalDict.registerErrorRegisterFallback))
  }

  async function handleIdentityContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!validateIdentityFields()) return
    setVerifying(true)
    try {
      const payload = identifierType === 'phone'
        ? { phone, scene: 'register', code: code.trim() }
        : { email: normalizedEmail, scene: 'register', code: code.trim() }
      const resp = await api.post(
        identifierType === 'phone' ? '/api/v1/iam/public/sms/verify/' : '/api/v1/iam/public/email/verify/',
        payload,
      )
      const data = resp.data?.data || resp.data
      if (!data?.valid) {
        setError(isOverseas ? 'The code is invalid or expired.' : '验证码无效或已过期，请重新获取。')
        return
      }
      const nextNick = nickname.trim() || fallbackNick
      setNickname(nextNick)
      if (!workspaceName.trim()) {
        setWorkspaceName(isOverseas ? `${nextNick}'s workspace` : `${nextNick} 的工作站`)
      }
      setIdentityVerified(true)
      setStep('workspace')
    }
    catch (err) {
      setError(describeAxiosError(err, isOverseas ? 'Code verification failed.' : '验证码校验失败，请稍后重试。'))
    }
    finally {
      setVerifying(false)
    }
  }

  async function uploadAvatarAfterLogin(file: File) {
    const form = new FormData()
    form.append('avatar', file)
    return api.post('/api/v1/iam/account/profile/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!identityVerified) {
      setError(isOverseas ? 'Please verify your code first.' : '请先完成验证码校验。')
      setStep('identity')
      return
    }
    if (!nickname.trim()) {
      setError(isOverseas ? 'Please enter a username.' : '请填写用户名。')
      return
    }
    const trimmedWorkspace = workspaceName.trim()
    if (trimmedWorkspace.length < 2) {
      setError(isOverseas ? 'Workspace name must be at least 2 characters.' : '工作站名称至少 2 个字符。')
      return
    }
    if (!isValidMerchantSubdomain(derivedSubdomain) || subdomainStatus === 'invalid' || subdomainStatus === 'taken') {
      setError(t(subdomainStatus === 'taken' ? portalDict.registerSubdomainTaken : portalDict.registerSubdomainInvalid))
      return
    }
    if (subdomainStatus !== 'available') {
      setError(isOverseas ? 'Subdomain is checking, please wait.' : '二级域名校验中，请稍候。')
      return
    }
    setSubmitting(true)
    try {
      const trimmedNick = nickname.trim()
      const body = {
        verify_type: identifierType === 'phone' ? 'phone' : 'email',
        phone: identifierType === 'phone' ? phone : undefined,
        email: identifierType === 'email' ? normalizedEmail : undefined,
        code: code.trim(),
        password,
        nickname: trimmedNick,
        identity: '',
        intent: '',
        system_name: trimmedWorkspace,
        subdomain: derivedSubdomain,
        workspace_provider: IS_LOCAL_DEPLOY ? workspaceProvider : undefined,
        accepted_terms: acceptedTerms,
        plan_code: selectedPlanCode || undefined,
        partner_code: partnerCode || undefined,
        slogan: '',
        primary_color: '#4f46e5',
      }
      const r = await api.post('/api/v1/iam/public/register/', body)
      const data = r.data?.data || r.data
      const handoff: string | undefined = data?.handoff_token
      if (!handoff) {
        throw new Error(t(portalDict.registerProvisioningLoginRequired))
      }
      setFlowOwnsAuthedSession(true)
      try {
        await auth.redeemHandoff(handoff)
      }
      catch {
        throw new Error(t(portalDict.registerProvisioningLoginRequired))
      }
      const registeredUserId = useAuthStore.getState().user?.id || data?.user?.id
      resetWorkspacePreparingDismissal(registeredUserId)
      let avatarNotice = ''
      if (avatarFile) {
        try {
          const uploaded = await uploadAvatarAfterLogin(avatarFile)
          await auth.fetchMe().catch(() => {})
          const avatarUrl = uploaded?.data?.data?.avatar || uploaded?.data?.avatar || useAuthStore.getState().user?.avatar
          avatarNotice = avatarUrl
            ? '账号已创建，头像已上传。'
            : '账号已创建，头像暂未上传。稍后可到账户中心重新设置。'
        }
        catch {
          avatarNotice = '账号已创建，头像暂未上传。稍后可到账户中心重新设置。'
        }
      }
      else {
        await auth.fetchMe().catch(() => {})
      }
      navigate(
        buildMembershipPath({
          planCode: selectedPlanCode || undefined,
          termMonths: selectedTermMonths || undefined,
        }),
        { replace: true },
      )
    }
    catch (err) {
      setError(describeRegisterError(err))
    }
    finally {
      setSubmitting(false)
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null
    if (!file) {
      setAvatarFile(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件作为头像。')
      return
    }
    setError('')
    setAvatarFile(file)
  }

  const showLocalIdentifierSwitch = IS_LOCAL_DEPLOY
  const showLocalAdvanced = IS_LOCAL_DEPLOY
  const currentStepIndex = REGISTER_STEPS.findIndex(item => item.key === step)
  const registerPortalHomeHref = publicHome

  return (
    <div className="x1-portal x1-portal--login x1-portal--first-screen min-h-screen relative overflow-hidden flex flex-col">
      <FirstScreenBackdrop className="x1-portal__first-screen-bg" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-3 py-6 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="x1-portal__card-stack x1-portal__card-stack--login"
        >
          <div className="x1-portal__card-toolbar">
            <a href={registerPortalHomeHref} className="x1-portal__brand-pill" aria-label={t(portalDict.backToSite)}>
              <img
                src={theme === 'dark' ? '/logo/horizontal-night.png' : '/logo/horizontal-day.png'}
                alt={t(portalDict.brand)}
                className="x1-portal__brand-logo"
              />
            </a>
            <div className="x1-portal__card-toolbar-actions">
              <Link to="/login" className="x1-portal__reg-header-link shrink min-w-0">
                {t(portalDict.signInLink)}
              </Link>
              <PortalStyleSwitch target="chat" />
              <PortalToggleBar
                prefs={prefs}
                identifierSwitch={showLocalIdentifierSwitch && step === 'identity'
                  ? {
                      value: identifierType,
                      onChange: switchIdentifierType,
                      disabled: verifying || smsSending,
                    }
                  : undefined}
              />
            </div>
          </div>

          <div className="x1-portal__shell w-full">
            <div className="x1-portal__shell-veil" />

            <div className="x1-portal__split-aside">
              <div className="relative z-10">
                <div className="max-w-md">
                  <h1 className="x1-portal__title">
                    {t(portalDict.registerSimpleHeroTitle)}
                  </h1>
                  <p className="x1-portal__lead">
                    xiaoone 为商户提供专属智能空间站、独立 Hermes 服务器、客服接待、渠道协同与 AI 文件管理。注册后用户文件会保存在你的专属空间站，开通套餐后即可使用核心业务能力。
                  </p>

                  <div className="space-y-4">
                    <div className="x1-portal__feature-tile">
                      <Sparkles size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>用户文件保存在专属空间站，按账号隔离</span>
                    </div>
                    <div className="x1-portal__feature-tile">
                      <Cloud size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>独立 Hermes 服务器承载 AI 工作流与业务工具</span>
                    </div>
                    <div className="x1-portal__feature-tile">
                      <ShieldCheck size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>客服接待、渠道协同、团队与素材仓库统一管理</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <p className="x1-portal__fine-print">
                  {new Date().getFullYear()} · {t(portalDict.loginCopyright)}
                </p>
              </div>
            </div>

            <div className="x1-portal__split-main">
              <div className="w-full max-w-sm mx-auto">
                <div className="mb-6 md:mb-7">
                  <h2 className="x1-portal__mini-title">
                    {step === 'identity' ? '创建账号' : '开通智能工作站'}
                  </h2>
                  <p className="x1-portal__mini-lead">
                    {step === 'identity'
                      ? '填写手机号或邮箱、验证码、密码，并勾选协议。'
                      : '填写用户名、工作站名称，并可选择头像。点击后才会真实注册。'}
                  </p>
                  {partnerCode ? (
                    <p className="x1-portal__fine-print" style={{ marginTop: 8 }}>
                      你正在通过伙伴推广链接注册，完成后将自动绑定伙伴 <strong>{partnerCode}</strong>。
                    </p>
                  ) : null}
                  <div className="x1-register-steps" aria-label="注册步骤">
                    {REGISTER_STEPS.map((item, index) => {
                      const active = item.key === step
                      const done = index < currentStepIndex
                      return (
                        <div key={item.key} className={`x1-register-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}>
                          <span>{done ? <Check size={13} /> : index + 1}</span>
                          <strong>{item.label}</strong>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {step === 'identity' && (
                    <motion.form
                      key={`identity-${identifierType}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      onSubmit={handleIdentityContinue}
                      className="space-y-5"
                    >
                      <div>
                        <label className="x1-portal__label" htmlFor="reg-id">
                          {identifierType === 'phone' ? t(portalDict.registerPhoneLabel) : t(portalDict.registerEmailLabel)}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {identifierType === 'phone'
                              ? <Phone size={16} className="x1-portal__input-icon" />
                              : <Mail size={16} className="x1-portal__input-icon" />}
                          </div>
                          <input
                            id="reg-id"
                            type={identifierType === 'phone' ? 'tel' : 'email'}
                            autoComplete="username"
                            value={identifierType === 'phone' ? phone : email}
                            onChange={e => {
                              markIdentityDirty()
                              if (identifierType === 'phone') setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                              else setEmail(e.target.value)
                            }}
                            placeholder={identifierType === 'phone' ? t(portalDict.registerPhonePlaceholder) : t(portalDict.registerEmailPlaceholder)}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="x1-portal__label mb-0" htmlFor="reg-code">
                            {t(portalDict.registerCodeLabel)}
                          </label>
                          <span className="x1-portal__hint">
                            {t(identifierType === 'phone' ? portalDict.loginSmsCodeHint : portalDict.loginEmailCodeHint)}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Send size={16} className="x1-portal__input-icon" />
                            </div>
                            <input
                              id="reg-code"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              value={code}
                              onChange={e => {
                                setIdentityVerified(false)
                                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }}
                              placeholder={t(portalDict.registerCodePlaceholder)}
                              className="x1-portal__input sm:text-sm"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={requestCode}
                            disabled={smsSending || smsCooldown > 0}
                            className="x1-portal__btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {smsCooldown > 0
                              ? `${smsCooldown}s${t(portalDict.registerCodeRetry)}`
                              : smsSending
                                ? t(portalDict.registerCodeSending)
                                : t(portalDict.registerCodeSend)}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="x1-portal__label" htmlFor="reg-pw">
                          {t(portalDict.registerPasswordLabel)}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="x1-portal__input-icon" />
                          </div>
                          <PasswordInput
                            id="reg-pw"
                            autoComplete="new-password"
                            value={password}
                            onChange={e => {
                              setIdentityVerified(false)
                              setPassword(e.target.value)
                            }}
                            placeholder={t(portalDict.registerPasswordPlaceholder)}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="x1-portal__label" htmlFor="reg-pw-confirm">
                          {t(portalDict.registerPasswordConfirmLabel)}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="x1-portal__input-icon" />
                          </div>
                          <PasswordInput
                            id="reg-pw-confirm"
                            autoComplete="new-password"
                            value={passwordConfirm}
                            onChange={e => {
                              setIdentityVerified(false)
                              setPasswordConfirm(e.target.value)
                            }}
                            placeholder={t(portalDict.registerPasswordConfirmPlaceholder)}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="x1-portal__consent">
                        <input
                          id="reg-terms"
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={event => {
                            setAcceptedTerms(event.target.checked)
                            if (event.target.checked && error === t(portalDict.registerErrorTerms)) setError('')
                          }}
                          aria-label="我已阅读并同意用户协议和隐私政策"
                        />
                        <span>
                          {t(portalDict.registerTermsPrefix)}
                          <button
                            type="button"
                            className="x1-portal__inline-link x1-portal__inline-button"
                            onClick={() => setLegalDialog('terms')}
                          >
                            {t(portalDict.registerTermsAgreement)}
                          </button>
                          {t(portalDict.registerTermsJoin)}
                          <button
                            type="button"
                            className="x1-portal__inline-link x1-portal__inline-button"
                            onClick={() => setLegalDialog('privacy')}
                          >
                            {t(portalDict.registerTermsPrivacy)}
                          </button>
                        </span>
                      </div>

                      {error && <div className="x1-portal__alert" role="alert">{error}</div>}
                      {notice && <div className="x1-portal__alert x1-portal__alert--info" role="status">{notice}</div>}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={verifying || (identifierType === 'phone' ? !phone : !email) || !code || !password || !passwordConfirm}
                        className="x1-portal__btn-primary"
                      >
                        {verifying ? '正在校验验证码...' : '继续填写工作站'}
                      </motion.button>
                    </motion.form>
                  )}

                  {step === 'workspace' && (
                    <motion.form
                      key="workspace"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      onSubmit={handleRegister}
                      className="space-y-5"
                    >
                      <div className="x1-register-avatar">
                        <DefaultAvatar src={avatarPreview} size={72} square />
                        <div className="x1-register-avatar__meta">
                          <strong>工作站头像</strong>
                          <span>默认使用 xiaoone 方形 logo，也可以先选择本地图片。</span>
                          <label className="x1-register-avatar__button">
                            <ImagePlus size={14} />
                            选择头像
                            <input type="file" accept="image/*" onChange={handleAvatarChange} />
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="x1-portal__label" htmlFor="reg-nick">
                          用户名
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User size={16} className="x1-portal__input-icon" />
                          </div>
                          <input
                            id="reg-nick"
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value.slice(0, 24))}
                            placeholder={t(portalDict.registerNicknamePlaceholder)}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="x1-portal__label" htmlFor="reg-partner-code">
                          推广码（可选）
                        </label>
                        <input
                          id="reg-partner-code"
                          type="text"
                          value={partnerCode}
                          onChange={e => setPartnerCode(e.target.value.slice(0, 20))}
                          placeholder="伙伴推广码，注册后自动绑定"
                          className="x1-portal__input sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="x1-portal__label" htmlFor="reg-ws">
                          工作站名称 / 二级域名
                        </label>
                        <input
                          id="reg-ws"
                          type="text"
                          value={workspaceName}
                          onChange={e => setWorkspaceName(e.target.value.slice(0, 32))}
                          placeholder={t(portalDict.registerWorkspaceNamePlaceholder)}
                          className="x1-portal__input sm:text-sm"
                          required
                        />
                        <div className={`x1-register-domain-preview is-${subdomainStatus}`}>
                          <span>
                            {workspaceName.trim()
                              ? merchantSubdomainFqdn(derivedSubdomain)
                              : '填写工作站名称后自动生成二级域名'}
                          </span>
                          <strong>
                            {subdomainStatus === 'available'
                              ? '可用'
                              : subdomainStatus === 'checking'
                                ? '校验中'
                                : subdomainStatus === 'taken'
                                  ? '已占用'
                                  : subdomainStatus === 'invalid'
                                    ? '不可用'
                                    : '待填写'}
                          </strong>
                        </div>
                        <p className="mt-1 text-xs text-[var(--xiaoone-fg-mute)]">
                          中文或非 ASCII 名称会自动生成稳定的 x1- 前缀二级域名。
                        </p>
                      </div>

                      {showLocalAdvanced && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setAdvancedOpen(open => !open)}
                            className="flex items-center gap-1 text-xs font-bold text-[var(--xiaoone-fg-mute)] hover:text-[var(--xiaoone-fg)] transition-colors"
                            aria-expanded={advancedOpen}
                          >
                            <ChevronDown size={14} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                            {t(portalDict.registerLocalAdvancedToggle)}
                          </button>
                          <AnimatePresence initial={false}>
                            {advancedOpen && (
                              <motion.div
                                key="advanced"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 space-y-3 rounded-xl border border-[var(--portal-edge)] bg-[color-mix(in_srgb,var(--xiaoone-bg-soft)_56%,transparent)] p-3">
                                  <p className="text-[11px] font-medium leading-relaxed text-[var(--xiaoone-fg-faint)]">
                                    {t(portalDict.registerLocalAdvancedHint)}
                                  </p>
                                  <div>
                                    <span className="x1-portal__label">{t(portalDict.registerWorkspaceModeLabel)}</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setWorkspaceProvider('tm')}
                                        className={`x1-portal__pick-card text-left items-start ${workspaceProvider === 'tm' ? 'is-active' : ''}`}
                                      >
                                        <Cloud size={18} className={workspaceProvider === 'tm' ? 'text-[var(--xiaoone-accent-2)]' : 'text-[var(--xiaoone-fg-faint)]'} />
                                        <span className="font-bold text-sm">{t(portalDict.registerWorkspaceModeTm)}</span>
                                        <span className="text-xs font-medium leading-relaxed text-[var(--xiaoone-fg-mute)]">
                                          {t(portalDict.registerWorkspaceModeTmDesc)}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWorkspaceProvider('cvm')}
                                        className={`x1-portal__pick-card text-left items-start ${workspaceProvider === 'cvm' ? 'is-active' : ''}`}
                                      >
                                        <Cloud size={18} className={workspaceProvider === 'cvm' ? 'text-[var(--xiaoone-accent-2)]' : 'text-[var(--xiaoone-fg-faint)]'} />
                                        <span className="font-bold text-sm">{t(portalDict.registerWorkspaceModeCvm)}</span>
                                        <span className="text-xs font-medium leading-relaxed text-[var(--xiaoone-fg-mute)]">
                                          {t(portalDict.registerWorkspaceModeCvmDesc)}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {error && <div className="x1-portal__alert" role="alert">{error}</div>}
                      {notice && <div className="x1-portal__alert x1-portal__alert--info" role="status">{notice}</div>}

                      <div className="x1-register-actions">
                        <button type="button" className="x1-portal__btn-ghost" onClick={() => setStep('identity')}>
                          <ArrowLeft size={14} />
                          返回
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={submitting || !nickname.trim() || !workspaceName.trim() || subdomainStatus !== 'available'}
                          className="x1-portal__btn-primary"
                        >
                          {submitting ? t(portalDict.registerSubmitting) : '开通智能工作站'}
                        </motion.button>
                      </div>
                    </motion.form>
                  )}

                </AnimatePresence>

                <div className="mt-10 text-center">
                  <p className="x1-portal__footer-note">
                    {t(portalDict.registerLoginInsteadLink)}
                    {' · '}
                    <Link to="/login" className="x1-portal__inline-link">
                      {t(portalDict.registerToLogin)}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Dialog open={Boolean(legalDialog)} onOpenChange={open => { if (!open) setLegalDialog(null) }}>
        <DialogContent className="x1-register-legal-dialog max-w-none gap-0 p-0">
          <DialogHeader className="x1-register-legal-dialog__header">
            <DialogTitle>{legalDialogTitle}</DialogTitle>
          </DialogHeader>
          {legalDialog ? (
            <iframe
              title={legalDialogTitle}
              src={legalDialogHref}
              className="x1-register-legal-dialog__frame"
            />
          ) : null}
          <DialogFooter className="x1-register-legal-dialog__footer">
            <Button variant="outline" onClick={() => setLegalDialog(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
