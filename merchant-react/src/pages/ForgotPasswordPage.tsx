import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Check, Lock, Mail, Phone, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { useRegion } from '@xiaoone/region'
import { PasswordInput } from '@xiaoone/react-ui'
import { api } from '../lib/httpClient'
import { describeAxiosError, ApiError } from '../lib/apiErrors'
import { runTencentCaptcha } from '../lib/tencentCaptcha'
import { getPublicSiteHomeHref } from '../lib/publicSite'
import { IS_LOCAL_DEPLOY } from '../lib/deployEnv'
import { usePortalPrefs } from '../portal/portalPrefs'
import { portalDict } from '../portal/dict'
import { PortalToggleBar } from '../portal/PortalToggleBar'
import { PortalStyleSwitch } from '../portal/PortalStyleSwitch'
import { usePortalStyleMode } from '../portal/portalStyleMode'
import { AuthChatPage } from '../portal/AuthChatPage'

type Stage = 'identifier' | 'verify' | 'done'
type Channel = 'phone' | 'email' | ''

/**
 * 用户端"忘记密码 → 重置密码"页面（左右分屏）。
 *
 * 流程：
 * 1. 用户输入手机号或邮箱 → 后端 `/api/v1/iam/public/password/reset/request/`
 *    自动按已绑定身份分发 SMS 或邮件验证码。
 * 2. 用户输入 6 位验证码 + 新密码 → 后端 `/api/v1/iam/public/password/reset/confirm/`
 *    校验后更新密码。
 * 3. 完成 → 引导回登录。
 *
 * - 后端 IP 限流 / 账号未注册时返回 404 → 前端显示明确文案。
 */
export function ForgotPasswordPage() {
  const { isChat } = usePortalStyleMode()
  if (isChat)
    return <AuthChatPage initialFlow="reset" />

  return <ForgotPasswordPageClassic />
}

function ForgotPasswordPageClassic() {
  const navigate = useNavigate()
  const publicHome = getPublicSiteHomeHref()
  const prefs = usePortalPrefs()
  const { theme, t } = prefs
  const { region } = useRegion()
  const lockedChannel: Exclude<Channel, ''> | '' = !IS_LOCAL_DEPLOY && region === 'mainland' ? 'phone' : ''

  const [stage, setStage] = useState<Stage>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [channel, setChannel] = useState<Channel>('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [smsCooldown, setSmsCooldown] = useState(0)
  const [smsSending, setSmsSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!lockedChannel || !identifier.trim())
      return
    const detected = detectChannel(identifier)
    if (detected && detected !== lockedChannel) {
      setIdentifier('')
      setError('')
      setNotice('')
    }
  }, [lockedChannel])

  function detectChannel(value: string): Channel {
    const v = value.trim()
    if (!v) return ''
    if (v.includes('@')) {
      const detected = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'email' : ''
      return lockedChannel && detected !== lockedChannel ? '' : detected
    }
    const detected = /^\d{11}$/.test(v) ? 'phone' : ''
    return lockedChannel && detected !== lockedChannel ? '' : detected
  }

  const identifierPlaceholder = lockedChannel === 'phone'
    ? t(portalDict.loginPhonePlaceholder)
    : t(portalDict.forgotIdentifierPlaceholder)

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

  async function requestResetCode(event?: FormEvent) {
    event?.preventDefault()
    setError('')
    setNotice('')
    const detected = detectChannel(identifier)
    if (!detected) {
      setError(t(portalDict.forgotIdentifierInvalid))
      return
    }
    setSmsSending(true)
    try {
      const captcha = await runTencentCaptcha()
      const r = await api.post('/api/v1/iam/public/password/reset/request/', {
        identifier: identifier.trim(),
        ...captcha,
      })
      const data = r.data?.data || r.data || {}
      const remoteChannel: Channel = (data.channel || detected) as Channel
      setChannel(remoteChannel)
      setNotice(t(remoteChannel === 'phone' ? portalDict.forgotNoticeSentSms : portalDict.forgotNoticeSentEmail))
      startSmsCooldown()
      setStage('verify')
    }
    catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (axiosErr.response?.status === 404) {
        setError(t(portalDict.forgotAccountNotFound))
      }
      else if (err instanceof ApiError && err.message) {
        setError(err.message)
      }
      else {
        setError(describeAxiosError(err, t(portalDict.forgotErrorSendFallback)))
      }
    }
    finally {
      setSmsSending(false)
    }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!code.trim()) {
      setError(t(portalDict.registerErrorCode))
      return
    }
    if ((newPassword || '').length < 6) {
      setError(t(portalDict.registerErrorPassword))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t(portalDict.forgotPasswordMismatch))
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/v1/iam/public/password/reset/confirm/', {
        identifier: identifier.trim(),
        code: code.trim(),
        new_password: newPassword,
      })
      setStage('done')
    }
    catch (err) {
      if (err instanceof ApiError && err.message) {
        setError(err.message)
      }
      else {
        setError(describeAxiosError(err, t(portalDict.forgotErrorFallback)))
      }
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="x1-portal x1-portal--login min-h-screen relative overflow-hidden flex flex-col">
      <div className="x1-portal__ambient" aria-hidden>
        <div className="x1-portal__ambient-center">
          <motion.div
            className="x1-portal__blob-a"
            style={{ width: 'min(800px, 80vw)', height: 'min(800px, 80vw)' }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

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
              <Link to="/login" className="x1-portal__reg-header-link shrink min-w-0">
                {t(portalDict.forgotBackToLogin)}
              </Link>
              <PortalStyleSwitch target="chat" />
              <PortalToggleBar prefs={prefs} />
            </div>
          </div>

          <div className="x1-portal__shell w-full">
            <div className="x1-portal__shell-veil" />

            {/* 左侧展示栏 */}
            <div className="x1-portal__split-aside">
              <div className="relative z-10">
                <div className="max-w-md">
                  <h1 className="x1-portal__title">
                    {t(portalDict.forgotHeroTitle)}
                  </h1>
                  <p className="x1-portal__lead">
                    {t(portalDict.forgotHeroDesc)}
                  </p>

                  <div className="space-y-4">
                    <div className="x1-portal__feature-tile">
                      <Sparkles size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>{t(portalDict.forgotFeatureChannel)}</span>
                    </div>
                    <div className="x1-portal__feature-tile">
                      <ShieldCheck size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                      <span>{t(portalDict.forgotFeatureSecure)}</span>
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
                    {t(portalDict.forgotFormTitle)}
                  </h2>
                  <p className="x1-portal__mini-lead">
                    {t(portalDict.forgotFormSub)}
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {stage === 'identifier' && (
                    <motion.form
                      key="identifier"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      onSubmit={requestResetCode}
                      className="space-y-5"
                    >
                      <div>
                        <label className="x1-portal__label" htmlFor="forgot-id">
                          {t(portalDict.forgotIdentifierLabel)}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {(lockedChannel || detectChannel(identifier)) === 'phone'
                              ? <Phone size={16} className="x1-portal__input-icon" />
                              : <Mail size={16} className="x1-portal__input-icon" />}
                          </div>
                          <input
                            id="forgot-id"
                            type="text"
                            autoComplete="username"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder={identifierPlaceholder}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="x1-portal__alert" role="alert">
                          {error}
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={smsSending || !identifier}
                        className="x1-portal__btn-primary"
                      >
                        {smsSending
                          ? t(portalDict.registerCodeSending)
                          : t(portalDict.forgotSendCode)}
                      </motion.button>
                    </motion.form>
                  )}

                  {stage === 'verify' && (
                    <motion.form
                      key="verify"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      onSubmit={submitReset}
                      className="space-y-5"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="x1-portal__label mb-0" htmlFor="forgot-code">
                            {t(portalDict.forgotCodeLabel)}
                          </label>
                          <span className="x1-portal__hint">
                            {channel === 'phone'
                              ? t(portalDict.loginSmsCodeHint)
                              : t(portalDict.loginEmailCodeHint)}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Send size={16} className="x1-portal__input-icon" />
                            </div>
                            <input
                              id="forgot-code"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              value={code}
                              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder={t(portalDict.forgotCodePlaceholder)}
                              className="x1-portal__input sm:text-sm"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => requestResetCode()}
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
                        <label className="x1-portal__label" htmlFor="forgot-pw">
                          {t(portalDict.forgotNewPasswordLabel)}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="x1-portal__input-icon" />
                          </div>
                          <PasswordInput
                            id="forgot-pw"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder={t(portalDict.forgotNewPasswordPlaceholder)}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="x1-portal__label" htmlFor="forgot-pw2">
                          {t(portalDict.forgotConfirmPasswordLabel)}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="x1-portal__input-icon" />
                          </div>
                          <PasswordInput
                            id="forgot-pw2"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder={t(portalDict.forgotNewPasswordPlaceholder)}
                            className="x1-portal__input sm:text-sm"
                            required
                          />
                        </div>
                      </div>

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
                        disabled={submitting || !code || !newPassword || !confirmPassword}
                        className="x1-portal__btn-primary"
                      >
                        {submitting
                          ? t(portalDict.forgotSubmitting)
                          : t(portalDict.forgotSubmit)}
                      </motion.button>
                    </motion.form>
                  )}

                  {stage === 'done' && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="text-center py-6"
                    >
                      <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-[var(--xiaoone-shadow-lg)] bg-gradient-to-tr from-[color-mix(in_srgb,var(--xiaoone-success)_78%,var(--xiaoone-accent))] to-[color-mix(in_srgb,var(--xiaoone-success)_55%,var(--xiaoone-bg))]">
                        <Check size={28} strokeWidth={3} className="text-[oklch(98%_0.012_264)]" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--xiaoone-fg)]">
                        {t(portalDict.forgotSuccessTitle)}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-[var(--xiaoone-fg-mute)]">
                        {t(portalDict.forgotSuccessDesc)}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/login', { replace: true })}
                        className="x1-portal__btn-primary mt-6"
                      >
                        {t(portalDict.forgotBackToLogin)}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {stage !== 'done' && (
                  <div className="mt-10 text-center">
                    <p className="x1-portal__footer-note">
                      <Link to="/login" className="x1-portal__inline-link">
                        {t(portalDict.forgotBackToLogin)}
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
