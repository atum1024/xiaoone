import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  Fingerprint,
  Lock,
  Mail,
  Phone,
  Send,
  Sparkles,
  UserCog,
  UserRound,
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { ApiError, describeAxiosError } from '../lib/apiErrors'
import { api } from '../lib/httpClient'
import { getPublicSiteHomeHref } from '../lib/publicSite'
import { usePortalPrefs } from '../portal/portalPrefs'
import { portalDict, demoAccountHints } from '../portal/dict'
import { PortalToggleBar } from '../portal/PortalToggleBar'

type IdentifierType = 'phone' | 'email'
type LoginMode = 'password' | 'sms'

interface DemoAccount {
  id: 'fusesim' | 'mall'
  label: string
  identifier: string
  password: string
  type: IdentifierType
  Icon: typeof UserRound
}

/**
 * 用户端登录页（玻璃拟态 + portal glow + motion 入场，与官网 DESIGN.md 保持一致）。
 *
 * 支持运行期切换浅色/深色 + 中文/英文。偏好通过 `usePortalPrefs` 持久化，
 * 同时可由官网带 `?lang=&theme=` 种子。
 */
export function LoginPage() {
  const auth = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | undefined)?.from
  const prefs = usePortalPrefs()
  const { locale, theme, t } = prefs
  const isDark = theme === 'dark'

  const demoAccounts: DemoAccount[] = [
    {
      id: 'fusesim',
      label: 'FuseSim Demo',
      identifier: 'owner@acme.local',
      password: '123456',
      type: 'email',
      Icon: UserRound,
    },
    {
      id: 'mall',
      label: 'Xiaoone Demo',
      identifier: 'owner@demo-shangcheng.local',
      password: '123456',
      type: 'email',
      Icon: UserCog,
    },
  ]

  const [identifierType, setIdentifierType] = useState<IdentifierType>(() =>
    locale === 'zh' ? 'phone' : 'email',
  )
  const [loginMode, setLoginMode] = useState<LoginMode>(() => locale === 'zh' ? 'sms' : 'password')
  const [isLoading, setIsLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsCooldown, setSmsCooldown] = useState(0)
  const [smsSending, setSmsSending] = useState(false)
  const [error, setError] = useState('')

  if (auth.status === 'authed')
    return <Navigate to={from || '/workbench'} replace />

  function applyDemo(acc: DemoAccount) {
    setIdentifier(acc.identifier)
    setPassword(acc.password)
    setIdentifierType(acc.type)
    setLoginMode('password')
    setError('')
  }

  function switchIdentifierType(nextType: IdentifierType) {
    setIdentifierType(nextType)
    setError('')
    if (nextType === 'email')
      setLoginMode('password')
  }

  async function requestSmsCode() {
    const phone = identifier.trim()
    if (!/^\d{11}$/.test(phone)) {
      setError(t(portalDict.loginErrorPhoneInvalid))
      return
    }
    setError('')
    setSmsSending(true)
    try {
      await api.post('/api/v1/iam/public/sms/request/', {
        phone,
        scene: 'login',
      })
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
      setError(describeAxiosError(err, t(portalDict.loginErrorSmsFallback)))
    }
    finally {
      setSmsSending(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      if (identifierType === 'phone' && loginMode === 'sms') {
        await auth.loginBySms(identifier, smsCode)
      }
      else {
        await auth.login({ type: identifierType, identifier, password })
      }
      navigate(from || '/workbench', { replace: true })
    }
    catch (err) {
      if (err instanceof ApiError)
        setError(err.message || t(portalDict.loginErrorFallback))
      else if (err instanceof Error)
        setError(err.message)
      else
        setError(t(portalDict.loginErrorRetry))
    }
    finally {
      setIsLoading(false)
    }
  }

  const publicHome = getPublicSiteHomeHref()

  // ---- 主题相关样式（避免依赖 Tailwind .dark 变体；用户端用 [data-theme]） ----
  const portalBg = isDark ? 'bg-slate-900' : 'bg-slate-50'
  const cardShellBase
    = 'w-full max-w-[1000px] flex flex-col md:flex-row backdrop-blur-2xl border rounded-2xl md:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden relative'
  const cardShell = isDark
    ? 'bg-white/10 border-white/20'
    : 'bg-white/60 border-white/80'
  const cardOverlay = isDark
    ? 'absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl md:rounded-[2.5rem]'
    : 'absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none rounded-2xl md:rounded-[2.5rem]'

  const heroPanel = isDark
    ? 'bg-white/5 border-r border-white/10'
    : 'bg-white/45 border-r border-white/70'
  const heroTitle = isDark ? 'text-white' : 'text-slate-900'
  const heroSub = isDark ? 'text-white/70' : 'text-slate-600'
  const featureChip = isDark
    ? 'text-white/80 bg-white/5 border-white/10'
    : 'text-slate-700 bg-white/70 border-white/80'
  const heroCopyright = isDark ? 'text-white/40' : 'text-slate-500'

  const formPanel = isDark
    ? 'bg-white/10 backdrop-blur-md text-white'
    : 'bg-white/70 backdrop-blur-md text-slate-900'
  const formHeading = isDark ? 'text-white' : 'text-slate-900'
  const formSub = isDark ? 'text-white/70' : 'text-slate-600'
  const demoCard = isDark
    ? 'border-white/15 bg-gradient-to-br from-white/10 to-white/5'
    : 'border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white/40'
  const demoTitle = isDark ? 'text-indigo-200' : 'text-indigo-600'
  const demoChip = isDark
    ? 'bg-white/10 border-white/15 hover:border-indigo-300/60 text-white'
    : 'bg-white/80 border-white hover:border-indigo-300 text-slate-900'
  const demoChipSub = isDark ? 'text-white/60' : 'text-slate-500'
  const labelTone = isDark ? 'text-white/85' : 'text-slate-700'
  const inputTone = isDark
    ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40 hover:border-white/30 focus:ring-indigo-400'
    : 'bg-white/60 border-gray-200 text-slate-900 placeholder:text-slate-400 hover:border-gray-300 focus:ring-indigo-500'
  const passwordHintTone = isDark ? 'text-indigo-200/70' : 'text-indigo-600/70'
  const errorBox = isDark
    ? 'text-red-300 bg-red-500/10 border-red-400/30'
    : 'text-red-600 bg-red-50 border-red-200'
  const tabWrap = isDark
    ? 'bg-white/10 border-white/15'
    : 'bg-white/60 border-white/80'
  const tabActive = 'bg-indigo-600 text-white shadow-md'
  const tabIdle = isDark
    ? 'text-white/70 hover:text-white'
    : 'text-slate-500 hover:text-slate-800'
  const sendBtnTone = isDark
    ? 'bg-white/10 border-white/20 text-indigo-200 hover:bg-white/15'
    : 'bg-white/80 border-gray-200 text-indigo-600 hover:bg-white'
  const footerNote = isDark ? 'text-white/70' : 'text-slate-600'
  const brandPillTone = isDark
    ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
    : 'bg-white/85 text-slate-900 border-white/70 hover:bg-white'

  return (
    <div className={`x1-portal min-h-screen relative overflow-hidden flex flex-col ${portalBg}`}>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between gap-3 px-4 sm:px-6 pointer-events-none">
        <a
          href={publicHome}
          className={`pointer-events-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold tracking-wide shadow-sm backdrop-blur-md border transition-colors ${brandPillTone}`}
          aria-label={t(portalDict.backToSite)}
        >
          <Sparkles size={16} className="text-indigo-400 shrink-0" />
          <span>{t(portalDict.brand)}</span>
        </a>
        <PortalToggleBar prefs={prefs} />
      </header>

      <div className="x1-portal__bg">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full opacity-60 mix-blend-screen blur-[100px]"
          animate={{
            background: isDark
              ? [
                  'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
                  'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
                  'radial-gradient(circle, #2563eb 0%, transparent 70%)',
                  'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
                ]
              : [
                  'radial-gradient(circle, #c7d2fe 0%, transparent 70%)',
                  'radial-gradient(circle, #ddd6fe 0%, transparent 70%)',
                  'radial-gradient(circle, #bae6fd 0%, transparent 70%)',
                  'radial-gradient(circle, #c7d2fe 0%, transparent 70%)',
                ],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-3 pt-[4.5rem] pb-6 sm:p-6 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`${cardShellBase} ${cardShell}`}
        >
          <div className={cardOverlay} />

          {/* Hero panel */}
          <div className={`hidden md:flex md:w-5/12 p-12 flex-col justify-between relative ${heroPanel}`}>
            <div className="relative z-10">
              <div className="max-w-md">
                <h1 className={`text-3xl font-bold leading-tight mb-6 ${heroTitle}`}>
                  {t(portalDict.loginHeroTitle)}
                </h1>
                <p className={`text-base leading-relaxed mb-8 ${heroSub}`}>
                  {t(portalDict.loginHeroDesc)}
                </p>

                <div className="space-y-4">
                  <div className={`flex items-center gap-3 text-sm p-3 rounded-xl border ${featureChip}`}>
                    <Lock size={16} className="text-indigo-400" />
                    <span>{t(portalDict.loginFeatureEncryption)}</span>
                  </div>
                  <div className={`flex items-center gap-3 text-sm p-3 rounded-xl border ${featureChip}`}>
                    <Fingerprint size={16} className="text-indigo-400" />
                    <span>{t(portalDict.loginFeatureAudit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <p className={`text-xs tracking-wider ${heroCopyright}`}>
                {new Date().getFullYear()} · {t(portalDict.loginCopyright)}
              </p>
            </div>
          </div>

          {/* Form panel */}
          <div className={`flex-1 flex flex-col justify-center px-4 py-10 sm:px-8 sm:py-12 md:p-14 relative ${formPanel}`}>
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
              <div className={`flex items-center backdrop-blur-md rounded-full p-1 shadow-sm border ${tabWrap}`}>
                <button
                  type="button"
                  onClick={() => switchIdentifierType('phone')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    identifierType === 'phone' ? tabActive : tabIdle
                  }`}
                >
                  <Phone size={14} />
                  {' '}
                  {t(portalDict.loginIdentifierTabPhone)}
                </button>
                <button
                  type="button"
                  onClick={() => switchIdentifierType('email')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    identifierType === 'email' ? tabActive : tabIdle
                  }`}
                >
                  <Mail size={14} />
                  {' '}
                  {t(portalDict.loginIdentifierTabEmail)}
                </button>
              </div>
            </div>

            <div className="w-full max-w-sm mx-auto">
              <div className="mb-6 md:mb-8">
                <h2 className={`text-2xl font-bold mb-2 ${formHeading}`}>
                  {t(portalDict.loginFormTitle)}
                </h2>
                <p className={`text-sm ${formSub}`}>
                  {t(portalDict.loginFormSub)}
                </p>
              </div>

              <div className={`mb-6 p-3 rounded-2xl border backdrop-blur-md ${demoCard}`}>
                <div className={`text-[11px] font-bold tracking-wider mb-2 ${demoTitle}`}>
                  {t(portalDict.loginDemoTitle)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {demoAccounts.map(acc => (
                    <motion.button
                      type="button"
                      key={acc.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => applyDemo(acc)}
                      className={`text-left px-3 py-2 rounded-xl border shadow-sm hover:shadow-md transition-all ${demoChip}`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <acc.Icon size={13} className="text-indigo-400" />
                        {acc.label}
                      </div>
                      <div className={`text-[11px] font-medium truncate ${demoChipSub}`}>
                        {acc.identifier}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${demoChipSub}`}>
                        {t(demoAccountHints[acc.id])}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.form
                  key={identifierType}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  {identifierType === 'phone' && (
                    <div className={`grid grid-cols-2 gap-1 rounded-xl border p-1 ${tabWrap}`}>
                      <button
                        type="button"
                        onClick={() => setLoginMode('sms')}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${loginMode === 'sms' ? tabActive : tabIdle}`}
                      >
                        {t(portalDict.loginModeSms)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginMode('password')}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${loginMode === 'password' ? tabActive : tabIdle}`}
                      >
                        {t(portalDict.loginModePassword)}
                      </button>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-bold mb-1.5 ${labelTone}`}>
                      {identifierType === 'phone' ? t(portalDict.loginPhoneLabel) : t(portalDict.loginEmailLabel)}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {identifierType === 'phone'
                          ? <Phone size={16} className={isDark ? 'text-white/50' : 'text-gray-400'} />
                          : <Mail size={16} className={isDark ? 'text-white/50' : 'text-gray-400'} />}
                      </div>
                      <input
                        type={identifierType === 'phone' ? 'tel' : 'email'}
                        autoComplete="username"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder={
                          identifierType === 'phone'
                            ? t(portalDict.loginPhonePlaceholder)
                            : t(portalDict.loginEmailPlaceholder)
                        }
                        className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all sm:text-sm outline-none ${inputTone}`}
                        required
                      />
                    </div>
                  </div>

                  {identifierType === 'phone' && loginMode === 'sms'
                    ? (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className={`block text-sm font-bold ${labelTone}`}>
                              {t(portalDict.loginSmsCodeLabel)}
                            </label>
                            <span className={`text-xs font-bold ${passwordHintTone}`}>
                              {t(portalDict.loginSmsCodeHint)}
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Send size={16} className={isDark ? 'text-white/50' : 'text-gray-400'} />
                              </div>
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={smsCode}
                                onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder={t(portalDict.loginSmsCodePlaceholder)}
                                className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all sm:text-sm outline-none ${inputTone}`}
                                required
                              />
                            </div>
                            <button
                              type="button"
                              onClick={requestSmsCode}
                              disabled={smsSending || smsCooldown > 0}
                              className={`px-3 py-3 border rounded-xl text-xs font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${sendBtnTone}`}
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
                            <label className={`block text-sm font-bold ${labelTone}`}>
                              {t(portalDict.loginPasswordLabel)}
                            </label>
                            <span className={`text-xs font-bold ${passwordHintTone}`}>
                              {t(portalDict.loginPasswordHint)}
                            </span>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock size={16} className={isDark ? 'text-white/50' : 'text-gray-400'} />
                            </div>
                            <input
                              type="password"
                              autoComplete="current-password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all sm:text-sm outline-none ${inputTone}`}
                              required
                            />
                          </div>
                        </div>
                      )}

                  {error && (
                    <div className={`text-xs font-bold border rounded-xl px-3 py-2 ${errorBox}`} role="alert">
                      {error}
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading || !identifier || (identifierType === 'phone' && loginMode === 'sms' ? !smsCode : !password)}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-8"
                  >
                    {isLoading
                      ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                <p className={`text-sm font-medium ${footerNote}`}>
                  {t(portalDict.loginGotoRegisterPrefix)}
                  <Link to="/register" className="font-bold text-indigo-500 hover:text-indigo-400 transition-colors ml-1 border-b border-transparent hover:border-indigo-400">
                    {t(portalDict.loginGotoRegisterLink)}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
