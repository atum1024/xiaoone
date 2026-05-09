import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Cloud,
  Gamepad2,
  GraduationCap,
  Grid,
  Mail,
  Send,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/httpClient'
import { describeAxiosError } from '../lib/apiErrors'
import { useAuthStore } from '../store/auth'
import { getPublicSiteHomeHref } from '../lib/publicSite'
import { usePortalPrefs } from '../portal/portalPrefs'
import { portalDict } from '../portal/dict'
import { PortalToggleBar } from '../portal/PortalToggleBar'

type Industry = 'ecommerce' | 'saas' | 'game' | 'edu' | 'other' | ''
type Goal = 'support' | 'sales' | 'collab' | 'insights' | string

interface FormData {
  industry: Industry
  goal: Goal
  workspaceName: string
  plan: 'free' | 'pro' | ''
  phone: string
  email: string
  code: string
  password: string
  nickname: string
}

/**
 * 用户端注册向导（与官网 DESIGN.md 同语言）。
 *
 * Step5 调 /api/v1/iam/public/sms/request + /public/register；
 * Step6 调 auth.redeemHandoff(handoff_token) 自动登录并跳 /workbench。
 *
 * 顶部切换栏支持运行期切浅色/深色 + 中/英；偏好持久化在 portalPrefs。
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const auth = useAuthStore()
  const publicHome = getPublicSiteHomeHref()
  const prefs = usePortalPrefs()
  const { locale, theme, t } = prefs
  const isDark = theme === 'dark'
  const isOverseas = locale === 'en'

  const stepLabels = [
    t(portalDict.registerStep.industry),
    t(portalDict.registerStep.goal),
    t(portalDict.registerStep.workspace),
    t(portalDict.registerStep.plan),
    isOverseas ? t(portalDict.registerStep.emailVerify) : t(portalDict.registerStep.verify),
    t(portalDict.registerStep.done),
  ]

  const industries: Array<{ id: Industry; icon: typeof ShoppingCart; label: string }> = [
    { id: 'ecommerce', icon: ShoppingCart, label: t(portalDict.registerIndustry.ecommerce) },
    { id: 'saas', icon: Cloud, label: t(portalDict.registerIndustry.saas) },
    { id: 'game', icon: Gamepad2, label: t(portalDict.registerIndustry.game) },
    { id: 'edu', icon: GraduationCap, label: t(portalDict.registerIndustry.edu) },
    { id: 'other', icon: Grid, label: t(portalDict.registerIndustry.other) },
  ]

  const goalOptions: Array<{ id: Goal; title: string }> = [
    { id: 'support', title: t(portalDict.registerGoal.support) },
    { id: 'sales', title: t(portalDict.registerGoal.sales) },
    { id: 'collab', title: t(portalDict.registerGoal.collab) },
    { id: 'insights', title: t(portalDict.registerGoal.insights) },
  ]

  const [currentStep, setCurrentStep] = useState(1)
  const progressStepCount = stepLabels.length - 1
  const progressStep = Math.min(currentStep, progressStepCount)
  const [formData, setFormData] = useState<FormData>({
    industry: '',
    goal: '',
    workspaceName: '',
    plan: '',
    phone: '',
    email: '',
    code: '',
    password: '',
    nickname: '',
  })
  const [smsCooldown, setSmsCooldown] = useState(0)
  const [smsSending, setSmsSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const next = () => setCurrentStep(p => Math.min(p + 1, 6))
  const prev = () => setCurrentStep(p => Math.max(p - 1, 1))

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  async function requestVerificationCode() {
    if (isOverseas && !isValidEmail(formData.email)) {
      setError(t(portalDict.registerErrorEmailInvalid))
      return
    }
    if (!isOverseas && !/^\d{11}$/.test(formData.phone)) {
      setError(t(portalDict.registerErrorPhoneInvalid))
      return
    }
    setError('')
    setSmsSending(true)
    try {
      if (isOverseas) {
        await api.post('/api/v1/iam/public/email/request/', {
          email: formData.email.trim().toLowerCase(),
          scene: 'register',
        })
      }
      else {
        await api.post('/api/v1/iam/public/sms/request/', {
          phone: formData.phone,
          scene: 'register',
        })
      }
      setSmsCooldown(60)
      const tick = setInterval(() => {
        setSmsCooldown(prev => {
          if (prev <= 1) {
            clearInterval(tick)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    catch (e) {
      setError(describeAxiosError(e, t(isOverseas ? portalDict.registerErrorEmailFallback : portalDict.registerErrorSmsFallback)))
    }
    finally {
      setSmsSending(false)
    }
  }

  async function submitRegister() {
    setError('')
    if (isOverseas && !isValidEmail(formData.email)) {
      setError(t(portalDict.registerErrorEmailInvalid))
      return
    }
    if (!isOverseas && !/^\d{11}$/.test(formData.phone)) {
      setError(t(portalDict.registerErrorPhoneInvalid))
      return
    }
    if (!formData.code.trim()) {
      setError(t(portalDict.registerErrorCode))
      return
    }
    if ((formData.password || '').length < 6) {
      setError(t(portalDict.registerErrorPassword))
      return
    }
    setSubmitting(true)
    try {
      const body = {
        verify_type: isOverseas ? 'email' : 'phone',
        phone: isOverseas ? undefined : formData.phone,
        email: isOverseas ? formData.email.trim().toLowerCase() : undefined,
        code: formData.code,
        password: formData.password,
        nickname: formData.nickname || (isOverseas ? formData.email.trim().split('@')[0] : formData.phone),
        identity: industries.find(x => x.id === formData.industry)?.label || '',
        intent: goalOptions.find(x => x.id === formData.goal)?.title || String(formData.goal || ''),
        system_name: formData.workspaceName,
        slogan: '',
        primary_color: '#4f46e5',
        plan_code: formData.plan === 'pro' ? '199' : 'free',
      }
      const r = await api.post('/api/v1/iam/public/register/', body)
      const data = r.data?.data || r.data
      const handoff: string | undefined = data?.handoff_token
      if (handoff) {
        try {
          await auth.redeemHandoff(handoff)
        }
        catch {
          // ignore handoff-redeem failure; user can still log in manually
        }
      }
      next()
    }
    catch (e) {
      setError(describeAxiosError(e, t(portalDict.registerErrorRegisterFallback)))
    }
    finally {
      setSubmitting(false)
    }
  }

  // ---- 主题样式 ----
  const portalBg = isDark ? 'bg-slate-900' : 'bg-slate-50'
  const headerBar = isDark
    ? 'bg-white/10 border-white/15'
    : 'bg-white/40 border-white/60'
  const headerLink = isDark
    ? 'text-slate-200 hover:text-indigo-300'
    : 'text-gray-700 hover:text-indigo-600'
  const brandPill = isDark
    ? 'bg-white/15 text-white border-white/30 hover:bg-white/25'
    : 'bg-white/90 text-slate-900 border-white/80 hover:bg-white'

  const cardShell = isDark
    ? 'bg-white/10 border-white/20 text-white'
    : 'bg-white/60 border-white/80 text-slate-900'
  const stepIdleCircle = isDark
    ? 'bg-white/5 border-2 border-white/15 text-white/40'
    : 'bg-white/80 border-2 border-white text-gray-400'
  const stepLabelDone = isDark ? 'text-white/85' : 'text-gray-800'
  const stepLabelTodo = isDark ? 'text-white/40' : 'text-gray-400'
  const stepTrackBase = isDark ? 'bg-white/15' : 'bg-white/50'
  const stepperFooter = isDark
    ? 'border-t border-white/15 bg-white/5'
    : 'border-t border-white/40 bg-white/30'
  const headingTone = isDark ? 'text-white' : 'text-slate-900'
  const subTone = isDark ? 'text-white/70' : 'text-slate-600'
  const labelTone = isDark ? 'text-white/85' : 'text-slate-700'
  const inputTone = isDark
    ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-indigo-400'
    : 'bg-white/60 border-gray-200 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-500'
  const cardOptionIdle = isDark
    ? 'border-white/15 bg-white/5 text-white hover:border-indigo-300/40 hover:bg-white/10'
    : 'border-white bg-white/50 text-gray-700 hover:border-indigo-200 hover:bg-white/80 shadow-sm'
  const cardOptionActive = isDark
    ? 'border-indigo-400 bg-indigo-500/15 text-white shadow-md'
    : 'border-indigo-500 bg-indigo-50/80 text-indigo-700 shadow-md'
  const errorBox = isDark
    ? 'text-red-300 bg-red-500/10 border-red-400/30'
    : 'text-red-600 bg-red-50 border-red-200'
  const codeBadge = isDark
    ? 'bg-indigo-400/15 text-indigo-200'
    : 'bg-indigo-100 text-indigo-700'
  const sendBtnTone = isDark
    ? 'bg-white/10 border-white/20 text-indigo-200 hover:bg-white/15'
    : 'bg-white/80 border-gray-200 text-indigo-600 hover:bg-white'
  const stepBackTone = isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-800'
  const stepNumberPill = isDark ? 'bg-white/10 text-white/70' : 'bg-white/60 text-gray-500'

  return (
    <div className={`x1-portal min-h-screen relative overflow-hidden flex flex-col ${portalBg}`}>
      {/* Dynamic creation background */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        <motion.div
          className="absolute top-[10%] left-[20%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full opacity-60 mix-blend-multiply blur-[80px]"
          animate={{
            background: isDark
              ? [
                  'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
                  'radial-gradient(circle, #6366f1 0%, transparent 70%)',
                  'radial-gradient(circle, #2563eb 0%, transparent 70%)',
                  'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
                ]
              : [
                  'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
                  'radial-gradient(circle, #818cf8 0%, transparent 70%)',
                  'radial-gradient(circle, #34d399 0%, transparent 70%)',
                  'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
                ],
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full opacity-50 mix-blend-multiply blur-[80px]"
          animate={{
            background: isDark
              ? [
                  'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
                  'radial-gradient(circle, #ec4899 0%, transparent 70%)',
                  'radial-gradient(circle, #6366f1 0%, transparent 70%)',
                  'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
                ]
              : [
                  'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
                  'radial-gradient(circle, #f472b6 0%, transparent 70%)',
                  'radial-gradient(circle, #818cf8 0%, transparent 70%)',
                  'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
                ],
            scale: [1, 1.2, 1],
            x: [0, -40, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <header className={`backdrop-blur-xl border-b z-20 shadow-sm relative ${headerBar}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-3">
            <Link to="/login" className={`text-xs sm:text-sm font-bold transition-colors shrink min-w-0 ${headerLink}`}>
              {t(portalDict.signInLink)}
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <PortalToggleBar prefs={prefs} />
              <a
                href={publicHome}
                className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-2.5 py-2 sm:px-3 font-bold tracking-wide text-xs sm:text-sm shadow-sm border transition-colors ${brandPill}`}
                aria-label={t(portalDict.backToSite)}
              >
                <Sparkles size={16} className="text-indigo-400 shrink-0" />
                <span>{t(portalDict.brand)}</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`w-full max-w-2xl backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border overflow-hidden flex flex-col min-h-[min(550px,calc(100vh-8rem))] sm:min-h-[550px] ${cardShell}`}
        >
          {currentStep < 6 && (
            <div className="px-4 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-6 overflow-x-auto">
              <div className="flex justify-between items-center relative min-w-[min(100%,520px)] mx-auto">
                <div className={`absolute left-0 right-0 top-1/2 h-1 rounded-full -z-10 ${stepTrackBase}`} />
                <div
                  className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full -z-10 transition-all duration-500 ease-out"
                  style={{ width: `${((progressStep - 1) / (progressStepCount - 1)) * 100}%` }}
                />
                {stepLabels.slice(0, progressStepCount).map((label, index) => (
                  <div key={label} className="flex flex-col items-center relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                      progressStep > index + 1
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-indigo-500/30'
                        : progressStep === index + 1
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-4 ring-indigo-200/50 shadow-indigo-600/40 scale-110'
                          : stepIdleCircle
                    }`}
                    >
                      {progressStep > index + 1 ? <Check size={16} strokeWidth={3} /> : index + 1}
                    </div>
                    <span className={`text-[11px] mt-2 font-bold absolute -bottom-6 w-20 text-center transition-colors ${progressStep >= index + 1 ? stepLabelDone : stepLabelTodo}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 sm:p-8 md:p-12 pt-4 sm:pt-6 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
                  <div className="mb-8">
                    <h2 className={`text-2xl font-bold mb-2 ${headingTone}`}>{t(portalDict.registerStep1Title)}</h2>
                    <p className={`font-medium ${subTone}`}>{t(portalDict.registerStep1Sub)}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {industries.map(ind => (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        key={ind.id}
                        onClick={() => { update('industry', ind.id); next() }}
                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                          formData.industry === ind.id ? cardOptionActive : cardOptionIdle
                        }`}
                      >
                        <ind.icon size={32} className={`mb-3 ${formData.industry === ind.id ? 'text-indigo-400' : isDark ? 'text-white/50' : 'text-gray-400'}`} />
                        <span className="font-bold">{ind.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
                  <div className="flex flex-col flex-1 pb-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-start gap-4 mb-6"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-md mt-1">
                        <Bot size={20} className="text-white" />
                      </div>
                      <div className={`backdrop-blur-md px-5 py-4 rounded-2xl rounded-tl-sm border shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] max-w-[85%] font-bold leading-relaxed ${
                        isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-white/90 border-white text-gray-800'
                      }`}
                      >
                        {t(portalDict.registerStep2Bot)}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-wrap gap-3 ml-14 mb-8"
                    >
                      {goalOptions.map(g => (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          key={g.id as string}
                          onClick={() => { update('goal', g.id); next() }}
                          className={`px-4 py-2.5 rounded-full border-2 text-sm font-bold transition-all ${
                            formData.goal === g.id
                              ? 'border-indigo-500 bg-indigo-500 text-white shadow-md'
                              : isDark
                                ? 'border-white/15 bg-white/5 text-white hover:border-indigo-300/40 hover:bg-white/10'
                                : 'border-white bg-white/70 text-gray-700 hover:border-indigo-300 hover:bg-white shadow-sm'
                          }`}
                        >
                          {g.title}
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-auto relative flex items-center"
                  >
                    <input
                      type="text"
                      placeholder={t(portalDict.registerStep2InputPlaceholder)}
                      className={`w-full pl-5 pr-14 py-4 rounded-2xl backdrop-blur-md border-2 outline-none font-bold transition-all shadow-sm ${
                        isDark
                          ? 'bg-white/10 border-white/15 placeholder-white/40 text-white focus:border-indigo-300 focus:bg-white/15'
                          : 'bg-white/70 border-white placeholder-gray-400 text-gray-800 focus:border-indigo-400 focus:bg-white'
                      }`}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                          update('goal', e.currentTarget.value)
                          next()
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
                      onClick={() => next()}
                    >
                      <Send size={18} className="ml-[2px]" />
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
                  <div className="mb-8">
                    <h2 className={`text-2xl font-bold mb-2 ${headingTone}`}>{t(portalDict.registerStep3Title)}</h2>
                    <p className={`font-medium ${subTone}`}>{t(portalDict.registerStep3Sub)}</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${labelTone}`}>{t(portalDict.registerStep3WsLabel)}</label>
                      <input
                        type="text"
                        value={formData.workspaceName}
                        onChange={e => update('workspaceName', e.target.value)}
                        className={`w-full px-4 py-4 rounded-xl border outline-none transition-all font-bold focus:ring-2 focus:border-transparent ${inputTone}`}
                        placeholder={t(portalDict.registerStep3WsPlaceholder)}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${labelTone}`}>{t(portalDict.registerStep3NickLabel)}</label>
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={e => update('nickname', e.target.value)}
                        className={`w-full px-4 py-4 rounded-xl border outline-none transition-all font-bold focus:ring-2 focus:border-transparent ${inputTone}`}
                        placeholder={t(portalDict.registerStep3NickPlaceholder)}
                      />
                    </div>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={next}
                        disabled={!formData.workspaceName.trim()}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                      >
                        {t(portalDict.registerNext)}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
                  <div className="mb-8">
                    <h2 className={`text-2xl font-bold mb-2 ${headingTone}`}>{t(portalDict.registerStep4Title)}</h2>
                    <p className={`font-medium ${subTone}`}>{t(portalDict.registerStep4Sub)}</p>
                  </div>
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      onClick={() => update('plan', 'free')}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.plan === 'free' ? cardOptionActive : cardOptionIdle
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-bold text-lg ${headingTone}`}>{t(portalDict.registerPlanFreeName)}</h3>
                        <span className={`text-xl font-bold ${headingTone}`}>¥0</span>
                      </div>
                      <p className={`text-sm font-medium ${subTone}`}>{t(portalDict.registerPlanFreeDesc)}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      onClick={() => update('plan', 'pro')}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.plan === 'pro' ? cardOptionActive : cardOptionIdle
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-bold text-lg flex items-center gap-1.5 ${headingTone}`}>
                          <Sparkles size={18} className="text-amber-500" />
                          {' '}
                          {t(portalDict.registerPlanProName)}
                        </h3>
                        <span className={`text-xl font-bold ${headingTone}`}>
                          ¥199
                          <span className={`text-sm font-normal ${subTone}`}>{t(portalDict.registerPlanProPriceUnit)}</span>
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${subTone}`}>{t(portalDict.registerPlanProDesc)}</p>
                    </motion.div>

                    <div className="mt-8 pt-2">
                      <button
                        type="button"
                        onClick={next}
                        disabled={!formData.plan}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 hover:shadow-lg transition-all"
                      >
                        {t(portalDict.registerConfirmPlan)}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
                  <div className="mb-8">
                    <h2 className={`text-2xl font-bold mb-2 ${headingTone}`}>{t(isOverseas ? portalDict.registerStep5EmailTitle : portalDict.registerStep5Title)}</h2>
                    <p className={`font-medium ${subTone}`}>
                      {t(isOverseas ? portalDict.registerStep5EmailSubPrefix : portalDict.registerStep5SubPrefix)}
                      {' '}
                      {t(isOverseas ? portalDict.registerStep5EmailSubSuffix : portalDict.registerStep5SubSuffix)}
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className={`block text-sm font-bold mb-1.5 ${labelTone}`}>{t(isOverseas ? portalDict.registerEmailLabel : portalDict.registerPhoneLabel)}</label>
                      <div className="relative">
                        {isOverseas && <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />}
                        <input
                          type={isOverseas ? 'email' : 'tel'}
                          value={isOverseas ? formData.email : formData.phone}
                          onChange={e => {
                            if (isOverseas)
                              update('email', e.target.value)
                            else
                              update('phone', e.target.value.replace(/\D/g, '').slice(0, 11))
                          }}
                          className={`w-full px-4 py-3 rounded-xl border outline-none font-bold focus:ring-2 focus:border-transparent ${isOverseas ? 'pl-11' : ''} ${inputTone}`}
                          placeholder={t(isOverseas ? portalDict.registerEmailPlaceholder : portalDict.registerPhonePlaceholder)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-1.5 ${labelTone}`}>{t(portalDict.registerCodeLabel)}</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={formData.code}
                          onChange={e => update('code', e.target.value.trim())}
                          className={`flex-1 px-4 py-3 rounded-xl border outline-none font-bold focus:ring-2 ${inputTone}`}
                          placeholder={t(portalDict.registerCodePlaceholder)}
                        />
                        <button
                          type="button"
                          disabled={smsSending || smsCooldown > 0}
                          onClick={requestVerificationCode}
                          className={`px-4 py-3 border rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${sendBtnTone}`}
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
                      <label className={`block text-sm font-bold mb-1.5 ${labelTone}`}>{t(portalDict.registerPasswordLabel)}</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={e => update('password', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border outline-none font-bold focus:ring-2 ${inputTone}`}
                        placeholder={t(portalDict.registerPasswordPlaceholder)}
                      />
                    </div>

                    {error && (
                      <div className={`text-xs font-bold border rounded-xl px-3 py-2 ${errorBox}`} role="alert">
                        {error}
                      </div>
                    )}

                    <div className="mt-6 pt-2">
                      <button
                        type="button"
                        onClick={submitRegister}
                        disabled={submitting || !(isOverseas ? formData.email : formData.phone) || !formData.code || !formData.password}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                      >
                        {submitting ? t(portalDict.registerSubmitting) : t(portalDict.registerSubmit)}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 6 && (
                <motion.div key="step6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                    <Check size={48} className="text-white" strokeWidth={3} />
                  </div>
                  <h2 className={`text-3xl font-bold mb-4 ${headingTone}`}>{t(portalDict.registerStep6Title)}</h2>
                  <p className={`mb-10 max-w-sm font-medium leading-relaxed ${subTone}`}>
                    {t(portalDict.registerStep6DescPrefix)}
                    {' '}
                    <strong className={`text-lg ${headingTone}`}>{formData.workspaceName || t(portalDict.registerStep6DescDefaultName)}</strong>
                    {t(portalDict.registerStep6DescSuffix)}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/workbench', { replace: true })}
                    className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 hover:shadow-xl transition-all w-full max-w-xs group"
                  >
                    {t(portalDict.registerEnterWorkbench)}
                    {' '}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {currentStep < 6 && (
            <div className={`px-4 sm:px-8 py-4 sm:py-5 backdrop-blur-md flex justify-between items-center gap-2 z-10 ${stepperFooter}`}>
              <button
                type="button"
                onClick={prev}
                className={`flex items-center text-sm font-bold transition-colors ${currentStep === 1 ? 'invisible' : stepBackTone}`}
              >
                <ChevronRight size={16} className="rotate-180 mr-1" />
                {' '}
                {t(portalDict.registerStepBack)}
              </button>
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${stepNumberPill}`}>
                {progressStep}
                /
                {progressStepCount}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
