import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  Fingerprint,
  Lock,
  Mail,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { ApiError, describeAxiosError } from '../lib/apiErrors'
import { api } from '../lib/httpClient'
import { getPublicSiteHomeHref } from '../lib/publicSite'
import { resolveAuthedLandingPath } from '../lib/membershipRouting'
import { runTencentCaptcha } from '../lib/tencentCaptcha'
import { setLocalIpRegionOverride, useRegion } from '@xiaoone/region'
import { PasswordInput } from '@xiaoone/react-ui'
import { usePortalPrefs } from '../portal/portalPrefs'
import { portalDict } from '../portal/dict'
import { PortalToggleBar } from '../portal/PortalToggleBar'
import { PortalStyleSwitch } from '../portal/PortalStyleSwitch'
import { usePortalStyleMode } from '../portal/portalStyleMode'
import { AuthChatPage } from '../portal/AuthChatPage'
import { IS_LOCAL_DEPLOY } from '../lib/deployEnv'
import { FirstScreenBackdrop } from '../components/FirstScreenBackdrop'

type IdentifierType = 'phone' | 'email'
type LoginMode = 'password' | 'sms'

/**
 * 用户端登录页（左右分屏 + 玻璃拟态 + portal glow + motion 入场，与官网 DESIGN.md 保持一致）。
 *
 * - 预览/正式环境：严格按 IP 区域显示对应的登录框（大陆=手机号、海外=邮箱）。
 * - 本地开发环境：允许在手机号 / 邮箱之间切换，但不破坏分屏排版。
 * - 已删除「演示账号一键填入」功能（所有环境均关闭）。
 * - 「忘记密码」改为可点链接，跳转到 `/forgot-password` 重置密码流程。
 */
export function LoginPage() {
  const { isChat } = usePortalStyleMode()
  if (isChat)
    return <AuthChatPage initialFlow="password" />

  return <LoginPageClassic />
}

function LoginPageClassic() {
  const auth = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | undefined)?.from
  const prefs = usePortalPrefs()
  const { locale, theme, t } = prefs
  const { region } = useRegion()
  const isOverseas = region === 'overseas'
  const regionDefaultType: IdentifierType = isOverseas ? 'email' : 'phone'
  const canSwitchIdentifier = IS_LOCAL_DEPLOY || isOverseas
  const showLocalIdentifierSwitch = IS_LOCAL_DEPLOY

  const [identifierType, setIdentifierType] = useState<IdentifierType>(regionDefaultType)
  const [loginMode, setLoginMode] = useState<LoginMode>('password')
  const [isLoading, setIsLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsCooldown, setSmsCooldown] = useState(0)
  const [smsSending, setSmsSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // IP 地区切换时同步默认登录渠道；海外和本地允许手动切换手机号/邮箱。
  useEffect(() => {
    setIdentifierType(regionDefaultType)
  }, [regionDefaultType])

  if (auth.status === 'authed')
    return <Navigate to={resolveAuthedLandingPath(auth.subscriptionPlanCode, from)} replace />

  function switchIdentifierType(nextType: IdentifierType) {
    if (!canSwitchIdentifier) return
    if (IS_LOCAL_DEPLOY && nextType === 'email')
      setLocalIpRegionOverride('overseas')
    if (IS_LOCAL_DEPLOY && nextType === 'phone')
      setLocalIpRegionOverride('mainland')
    setIdentifierType(nextType)
    setIdentifier('')
    setSmsCode('')
    setError('')
    setNotice('')
  }

  async function requestLoginCode() {
    const value = identifier.trim()
    const isPhone = identifierType === 'phone'
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    if (isPhone && !/^\d{11}$/.test(value)) {
      setError(t(portalDict.loginErrorPhoneInvalid))
      return
    }
    if (!isPhone && !isValidEmail) {
      setError(t(portalDict.loginErrorEmailInvalid))
      return
    }
    setError('')
    setNotice('')
    setSmsSending(true)
    try {
      const captcha = await runTencentCaptcha()
      if (isPhone) {
        await api.post('/api/v1/iam/public/sms/request/', {
          phone: value,
          scene: 'login',
          ...captcha,
        })
      }
      else {
        await api.post('/api/v1/iam/public/email/request/', {
          email: value.toLowerCase(),
          scene: 'login',
          ...captcha,
        })
      }
      setNotice(isPhone
        ? (isOverseas ? 'SMS code sent.' : '短信验证码已发送。')
        : (isOverseas ? 'Email code sent.' : '邮箱验证码已发送。'))
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
    catch (err) {
      setError(describeAxiosError(err, t(isPhone ? portalDict.loginErrorSmsFallback : portalDict.loginErrorEmailFallback)))
    }
    finally {
      setSmsSending(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    setNotice('')
    try {
      if (identifierType === 'phone' && loginMode === 'sms') {
        await auth.loginBySms(identifier, smsCode)
      }
      else if (identifierType === 'email' && loginMode === 'sms') {
        await auth.loginByEmailCode(identifier, smsCode)
      }
      else {
        await auth.login({ type: identifierType, identifier, password })
      }
      navigate(from || '/workbench', { replace: true })
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || t(portalDict.loginErrorFallback))
      else
        setError(describeAxiosError(err, t(portalDict.loginErrorRetry)))
    }
    finally {
      setIsLoading(false)
    }
  }

  const publicHome = getPublicSiteHomeHref()

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
            <a
              href={publicHome}
              className="x1-portal__brand-pill"
              aria-label={t(portalDict.backToSite)}
            >
              <img
                src={theme === 'dark' ? '/logo/horizontal-night.png' : '/logo/horizontal-day.png'}
                alt={t(portalDict.brand)}
                className="x1-portal__brand-logo"
              />
            </a>
            <div className="x1-portal__card-toolbar-actions">
              <PortalStyleSwitch target="chat" />
              <PortalToggleBar
                prefs={prefs}
                identifierSwitch={showLocalIdentifierSwitch
                  ? {
                      value: identifierType,
                      onChange: switchIdentifierType,
                      disabled: isLoading || smsSending,
                    }
                  : undefined}
              />
            </div>
          </div>

          <div className="x1-portal__shell w-full">
            <div className="x1-portal__shell-veil" />

            {/* 左侧展示栏 */}
            <div className="x1-portal__split-aside">
              <div className="relative z-10">
                <div className="max-w-md">
                  <h1 className="x1-portal__title">
                    {t(portalDict.loginHeroTitle)}
                  </h1>
                  <p className="x1-portal__lead">
                    {t(portalDict.loginHeroDesc)}
                  </p>

                  <div className="space-y-4">
                    <div className="x1-portal__feature-tile">
                      <Lock size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>{t(portalDict.loginFeatureEncryption)}</span>
                    </div>
                    <div className="x1-portal__feature-tile">
                      <Fingerprint size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>{t(portalDict.loginFeatureAudit)}</span>
                    </div>
                    <div className="x1-portal__feature-tile">
                      <ShieldCheck size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>
                        {isOverseas
                          ? 'Region-aware secure access'
                          : '区域感知 · IP 限流保护'}
                      </span>
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

            {/* 右侧表单栏 */}
            <div className="x1-portal__split-main">
              <div className="w-full max-w-sm mx-auto">
                <div className="mb-6 md:mb-8">
                  <h2 className="x1-portal__mini-title">
                    {t(portalDict.loginFormTitle)}
                  </h2>
                  <p className="x1-portal__mini-lead">
                    {t(portalDict.loginFormSub)}
                  </p>
                </div>

                {/* 海外登录开放邮箱和中国手机号；本地也开放切换用于调试。 */}
                {canSwitchIdentifier && !showLocalIdentifierSwitch && (
                  <div className="x1-portal__form-switch">
                    <div className="x1-portal__segment x1-portal__segment--square shadow-sm">
                      <button
                        type="button"
                        onClick={() => switchIdentifierType('phone')}
                        className={`x1-portal__segment-btn ${identifierType === 'phone' ? 'is-active' : ''}`}
                      >
                        <Phone size={14} />
                        {' '}
                        {t(portalDict.loginIdentifierTabPhone)}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchIdentifierType('email')}
                        className={`x1-portal__segment-btn ${identifierType === 'email' ? 'is-active' : ''}`}
                      >
                        <Mail size={14} />
                        {' '}
                        {t(portalDict.loginIdentifierTabEmail)}
                      </button>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.form
                    key={identifierType}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    onSubmit={handleLogin}
                    className="space-y-5"
                  >
                    <div className="x1-portal__segment x1-portal__segment--square shadow-sm">
                      <button
                        type="button"
                        onClick={() => setLoginMode('sms')}
                        className={`x1-portal__segment-btn ${loginMode === 'sms' ? 'is-active' : ''}`}
                      >
                        {t(portalDict.loginModeSms)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginMode('password')}
                        className={`x1-portal__segment-btn ${loginMode === 'password' ? 'is-active' : ''}`}
                      >
                        {t(portalDict.loginModePassword)}
                      </button>
                    </div>

                    <div>
                      <label className="x1-portal__label" htmlFor="portal-login-id">
                        {identifierType === 'phone' ? t(portalDict.loginPhoneLabel) : t(portalDict.loginEmailLabel)}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {identifierType === 'phone'
                            ? <Phone size={16} className="x1-portal__input-icon" />
                            : <Mail size={16} className="x1-portal__input-icon" />}
                        </div>
                        <input
                          id="portal-login-id"
                          type={identifierType === 'phone' ? 'tel' : 'email'}
                          autoComplete="username"
                          value={identifier}
                          onChange={e => setIdentifier(e.target.value)}
                          placeholder={
                            identifierType === 'phone'
                              ? t(portalDict.loginPhonePlaceholder)
                              : t(portalDict.loginEmailPlaceholder)
                          }
                          className="x1-portal__input sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    {loginMode === 'sms'
                      ? (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="x1-portal__label mb-0" htmlFor="portal-login-sms">
                              {t(identifierType === 'phone' ? portalDict.loginSmsCodeLabel : portalDict.loginEmailCodeLabel)}
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
                                id="portal-login-sms"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={smsCode}
                                onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder={t(portalDict.loginSmsCodePlaceholder)}
                                className="x1-portal__input sm:text-sm"
                                required
                              />
                            </div>
                            <button
                              type="button"
                              onClick={requestLoginCode}
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
                        )
                      : (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="x1-portal__label mb-0" htmlFor="portal-login-pw">
                              {t(portalDict.loginPasswordLabel)}
                            </label>
                            <span className="x1-portal__hint">
                              {t(portalDict.loginPasswordHint)}
                              {' '}
                              <Link to="/forgot-password" className="x1-portal__inline-link">
                                {t(portalDict.loginForgotPasswordLink)}
                              </Link>
                            </span>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock size={16} className="x1-portal__input-icon" />
                            </div>
                            <PasswordInput
                              id="portal-login-pw"
                              autoComplete="current-password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="x1-portal__input sm:text-sm"
                              required
                            />
                          </div>
                        </div>
                        )}

                    {error && (
                      <div className="x1-portal__alert" role="alert">
                        {error}
                      </div>
                    )}
                    {notice && (
                      <div className="x1-portal__alert x1-portal__alert--info" role="status">
                        {notice}
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading || !identifier || (loginMode === 'sms' ? !smsCode : !password)}
                      className="x1-portal__btn-primary"
                    >
                      {isLoading
                        ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" aria-hidden>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {t(portalDict.loginSubmitting)}
                          </span>
                          )
                        : (
                          t(portalDict.loginSubmit)
                          )}
                    </motion.button>
                  </motion.form>
                </AnimatePresence>

                <div className="mt-10 text-center">
                  <p className="x1-portal__footer-note">
                    {t(portalDict.loginGotoRegisterPrefix)}
                    <Link to="/register" className="x1-portal__inline-link">
                      {t(portalDict.loginGotoRegisterLink)}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
