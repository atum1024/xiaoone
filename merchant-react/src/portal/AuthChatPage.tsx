import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUp, Cloud, Fingerprint, ImagePlus, Lock, Mail, Phone, ShieldCheck, Sparkles } from 'lucide-react'
import { merchantSubdomainFqdn, setLocalIpRegionOverride, useRegion } from '@xiaoone/region'
import { useAuthStore } from '../store/auth'
import { ApiError, describeAxiosError } from '../lib/apiErrors'
import { api } from '../lib/httpClient'
import { getPublicSiteHomeHref } from '../lib/publicSite'
import { runTencentCaptcha } from '../lib/tencentCaptcha'
import { IS_LOCAL_DEPLOY } from '../lib/deployEnv'
import { deriveMerchantSubdomain, isValidMerchantSubdomain } from '../lib/subdomain'
import { resetWorkspacePreparingDismissal } from '../components/WorkspacePreparingModal'
import { buildMembershipPath, resolveAuthedLandingPath } from '../lib/membershipRouting'
import { FirstScreenBackdrop } from '../components/FirstScreenBackdrop'
import { usePortalPrefs, type LocalizedCopy } from './portalPrefs'
import { portalDict } from './dict'
import { PortalToggleBar } from './PortalToggleBar'
import { PortalStyleSwitch } from './PortalStyleSwitch'
import {
  finishHomePortalTransition,
  readHomePortalTransitionPayload,
} from './homePortalTransition'

export type AuthChatFlow = 'password' | 'sms' | 'reset' | 'register'

type IdentifierType = 'phone' | 'email'
type InputKind =
  | 'identifier'
  | 'password'
  | 'code'
  | 'text'
  | 'confirm_password'
  | 'none'

type SubdomainStatus = 'idle' | 'checking' | 'available' | 'invalid' | 'taken'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  masked?: boolean
}

interface AuthChatPageProps {
  initialFlow: AuthChatFlow
}

let messageSeq = 0
function nextMessageId() {
  messageSeq += 1
  return `msg-${messageSeq}`
}

function maskSecret(value: string) {
  if (value.length <= 2) return '••••'
  return `${value.slice(0, 1)}${'•'.repeat(Math.min(value.length - 1, 8))}`
}

export function AuthChatPage({ initialFlow }: AuthChatPageProps) {
  const auth = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = (location.state as { from?: string } | undefined)?.from
  const fromHomePortal = Boolean(
    (location.state as { fromHomePortal?: boolean } | undefined)?.fromHomePortal,
  )
  const [portalReveal, setPortalReveal] = useState(!fromHomePortal)
  const homeIntentRef = useRef<string | null>(null)
  const prefs = usePortalPrefs()
  const { locale, theme, t } = prefs
  const { region } = useRegion()
  const isOverseas = region === 'overseas'
  const regionDefaultType: IdentifierType = isOverseas ? 'email' : 'phone'
  const publicHome = getPublicSiteHomeHref()

  const [flow, setFlow] = useState<AuthChatFlow>(initialFlow)
  const canInferIdentifierType = IS_LOCAL_DEPLOY || (isOverseas && flow !== 'register')
  const [identifierType, setIdentifierType] = useState<IdentifierType>(regionDefaultType)
  const [inputKind, setInputKind] = useState<InputKind>('identifier')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)
  const registeringRef = useRef(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [awaitingTerms, setAwaitingTerms] = useState(false)

  const identifierRef = useRef('')
  const passwordRef = useRef('')
  const codeRef = useRef('')
  const newPasswordRef = useRef('')
  const nicknameRef = useRef('')
  const workspaceNameRef = useRef('')
  const avatarFileRef = useRef<File | null>(null)
  const acceptedTermsRef = useRef(false)
  const resetChannelRef = useRef<'phone' | 'email' | ''>('')
  const identityVerifiedRef = useRef(false)
  const [registerStep, setRegisterStep] = useState<'nickname' | 'workspace' | 'done'>('nickname')

  const listRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const selectedPlanCode = useMemo(() => {
    const raw = String(searchParams.get('plan_code') || '').trim().toLowerCase()
    return raw === 'personal' || raw === 'startup' || raw === 'business' ? raw : ''
  }, [searchParams])

  const selectedTermMonths = useMemo(() => {
    const raw = String(searchParams.get('term') || '').trim()
    return raw === '1' || raw === '3' || raw === '6' || raw === '12' ? raw : ''
  }, [searchParams])

  const partnerCode = useMemo(() => {
    const raw = String(searchParams.get('partner_code') || searchParams.get('referral_code') || '').trim()
    return raw ? raw.slice(0, 20) : ''
  }, [searchParams])

  const appendAssistant = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: nextMessageId(), role: 'assistant', text }])
  }, [])

  const appendUser = useCallback((text: string, masked = false) => {
    setMessages(prev => [...prev, { id: nextMessageId(), role: 'user', text, masked }])
  }, [])

  const appendError = useCallback((text: string) => {
    appendAssistant(text)
  }, [appendAssistant])

  const restartLoginIdentityFlow = useCallback((errorText: string) => {
    identifierRef.current = ''
    passwordRef.current = ''
    codeRef.current = ''
    appendError(errorText)
    setInputKind('identifier')
    appendAssistant(
      identifierType === 'phone'
        ? t(portalDict.chatAskIdentifierPhone)
        : t(portalDict.chatAskIdentifierEmail),
    )
  }, [appendAssistant, appendError, identifierType, t])

  const lastMessageId = messages.at(-1)?.id || ''

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [lastMessageId, showAvatarPicker, awaitingTerms, inputKind, scrollToBottom])

  useEffect(() => {
    inputRef.current?.focus()
  }, [inputKind, flow, showAvatarPicker, awaitingTerms])

  useEffect(() => {
    setIdentifierType(regionDefaultType)
  }, [regionDefaultType])

  const startSmsCooldown = useCallback(() => {
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
  }, [])

  const resetSessionData = useCallback(() => {
    identifierRef.current = ''
    passwordRef.current = ''
    codeRef.current = ''
    newPasswordRef.current = ''
    nicknameRef.current = ''
    workspaceNameRef.current = ''
    avatarFileRef.current = null
    acceptedTermsRef.current = false
    resetChannelRef.current = ''
    identityVerifiedRef.current = false
    setRegisterStep('nickname')
    setDraft('')
    setShowAvatarPicker(false)
    setAwaitingTerms(false)
    setSmsCooldown(0)
  }, [])

  const flowIntro = useCallback((nextFlow: AuthChatFlow) => {
    if (nextFlow === 'password') return t(portalDict.chatFlowPasswordIntro)
    if (nextFlow === 'sms') return t(portalDict.chatFlowSmsIntro)
    if (nextFlow === 'reset') return t(portalDict.chatFlowResetIntro)
    return t(portalDict.chatFlowRegisterIntro)
  }, [t])

  const askIdentifier = useCallback(() => {
    setInputKind('identifier')
    appendAssistant(
      identifierType === 'phone'
        ? t(portalDict.chatAskIdentifierPhone)
        : t(portalDict.chatAskIdentifierEmail),
    )
  }, [appendAssistant, identifierType, t])

  const bootstrapFlow = useCallback((nextFlow: AuthChatFlow, resetMessages = true) => {
    resetSessionData()
    setFlow(nextFlow)
    if (resetMessages) {
      setMessages([
        { id: nextMessageId(), role: 'assistant', text: t(portalDict.chatWelcome) },
        { id: nextMessageId(), role: 'assistant', text: flowIntro(nextFlow) },
      ])
    }
    askIdentifier()
  }, [askIdentifier, flowIntro, resetSessionData, t])

  useEffect(() => {
    bootstrapFlow(initialFlow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!fromHomePortal) {
      setPortalReveal(true)
      return
    }
    const payload = readHomePortalTransitionPayload()
    homeIntentRef.current = payload?.intent.trim() || null
    finishHomePortalTransition()
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setPortalReveal(true))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [fromHomePortal])

  useEffect(() => {
    const seed = homeIntentRef.current
    if (!seed || !fromHomePortal)
      return
    homeIntentRef.current = null
    const timer = window.setTimeout(() => {
      appendUser(seed)
      scrollToBottom()
    }, 480)
    return () => window.clearTimeout(timer)
  }, [appendUser, fromHomePortal, scrollToBottom])

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  const isValidPhone = (value: string) => /^\d{11}$/.test(value.trim())

  const detectIdentifierType = (value: string): IdentifierType | null => {
    const trimmed = value.trim()
    if (trimmed.includes('@')) return isValidEmail(trimmed) ? 'email' : null
    if (/^\d+$/.test(trimmed)) return isValidPhone(trimmed) ? 'phone' : null
    return isValidEmail(trimmed) ? 'email' : null
  }

  const validateIdentifier = (value: string): boolean => {
    if (canInferIdentifierType) {
      const detected = detectIdentifierType(value)
      if (!detected) return false
      if (IS_LOCAL_DEPLOY && detected === 'email') setLocalIpRegionOverride('overseas')
      if (IS_LOCAL_DEPLOY && detected === 'phone') setLocalIpRegionOverride('mainland')
      setIdentifierType(detected)
      return true
    }
    if (identifierType === 'phone') return isValidPhone(value)
    return isValidEmail(value)
  }



  const requestCode = async (scene: 'login' | 'register' | 'reset') => {
    appendAssistant(t(portalDict.chatSendingCode))
    const captcha = await runTencentCaptcha()
    const id = identifierRef.current.trim()
    const type = identifierType
    if (type === 'phone') {
      await api.post('/api/v1/iam/public/sms/request/', {
        phone: id,
        scene,
        ...captcha,
      })
    }
    else {
      await api.post('/api/v1/iam/public/email/request/', {
        email: id.toLowerCase(),
        scene,
        ...captcha,
      })
    }
    appendAssistant(type === 'phone' ? t(portalDict.chatCodeSentPhone) : t(portalDict.chatCodeSentEmail))
    startSmsCooldown()
  }

  const sendResetCode = async () => {
    appendAssistant(t(portalDict.chatSendingCode))
    const captcha = await runTencentCaptcha()
    const r = await api.post('/api/v1/iam/public/password/reset/request/', {
      identifier: identifierRef.current.trim(),
      ...captcha,
    })
    const data = r.data?.data || r.data || {}
    resetChannelRef.current = (data.channel || identifierType) as 'phone' | 'email'
    appendAssistant(
      resetChannelRef.current === 'phone'
        ? t(portalDict.chatCodeSentPhone)
        : t(portalDict.chatCodeSentEmail),
    )
    startSmsCooldown()
  }

  const verifyRegisterCode = async () => {
    const payload = identifierType === 'phone'
      ? { phone: identifierRef.current.trim(), scene: 'register', code: codeRef.current.trim() }
      : { email: identifierRef.current.trim().toLowerCase(), scene: 'register', code: codeRef.current.trim() }
    const resp = await api.post(
      identifierType === 'phone' ? '/api/v1/iam/public/sms/verify/' : '/api/v1/iam/public/email/verify/',
      payload,
    )
    const data = resp.data?.data || resp.data
    if (!data?.valid) throw new Error('invalid_code')
    identityVerifiedRef.current = true
  }

  const submitRegisterWithSubdomain = async (subdomain: string) => {
    registeringRef.current = true
    try {
    const trimmedNick = nicknameRef.current.trim()
    const trimmedWorkspace = workspaceNameRef.current.trim()
    const body = {
      verify_type: identifierType === 'phone' ? 'phone' : 'email',
      phone: identifierType === 'phone' ? identifierRef.current.trim() : undefined,
      email: identifierType === 'email' ? identifierRef.current.trim().toLowerCase() : undefined,
      code: codeRef.current.trim(),
      password: passwordRef.current,
      nickname: trimmedNick,
      identity: '',
      intent: '',
      system_name: trimmedWorkspace,
      subdomain,
      accepted_terms: acceptedTermsRef.current,
      plan_code: selectedPlanCode || undefined,
      partner_code: partnerCode || undefined,
      slogan: '',
      primary_color: '#4f46e5',
    }
    const r = await api.post('/api/v1/iam/public/register/', body)
    const data = r.data?.data || r.data
    const handoff: string | undefined = data?.handoff_token
    if (!handoff) throw new Error(t(portalDict.registerProvisioningLoginRequired))
    await auth.redeemHandoff(handoff)
    const registeredUserId = useAuthStore.getState().user?.id || data?.user?.id
    resetWorkspacePreparingDismissal(registeredUserId)
    if (avatarFileRef.current) {
      try {
        const form = new FormData()
        form.append('avatar', avatarFileRef.current)
        const uploaded = await api.post('/api/v1/iam/account/profile/avatar/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        await auth.fetchMe().catch(() => {})
        const avatarUrl = uploaded.data?.data?.avatar || uploaded.data?.avatar || useAuthStore.getState().user?.avatar
        if (avatarUrl) {
          appendAssistant(locale === 'en'
            ? 'Account created. Avatar uploaded successfully.'
            : '账号已创建，头像已上传。')
        }
      }
      catch {
        appendAssistant(locale === 'en'
          ? 'Account created. Avatar upload failed; you can set it later in account settings.'
          : '账号已创建，头像暂未上传，可稍后在账户中心设置。')
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
    finally {
      registeringRef.current = false
    }
  }

  const finishLogin = async () => {
    appendAssistant(t(portalDict.chatLoggingIn))
    if (flow === 'password') {
      await auth.login({ type: identifierType, identifier: identifierRef.current, password: passwordRef.current })
    }
    else if (identifierType === 'phone') {
      await auth.loginBySms(identifierRef.current, codeRef.current)
    }
    else {
      await auth.loginByEmailCode(identifierRef.current, codeRef.current)
    }
    appendAssistant(t(portalDict.chatLoginSuccess))
    navigate(resolveAuthedLandingPath(useAuthStore.getState().subscriptionPlanCode, from), { replace: true })
  }

  const handleIdentifierSubmit = async (value: string) => {
    if (!validateIdentifier(value)) {
      appendError(t(portalDict.chatInvalidIdentifier))
      return
    }
    identifierRef.current = value.trim()
    if (flow === 'password') {
      setInputKind('password')
      appendAssistant(t(portalDict.chatAskPassword))
      return
    }
    if (flow === 'sms') {
      setBusy(true)
      try {
        await requestCode('login')
        setInputKind('code')
        appendAssistant(t(portalDict.chatAskCode))
      }
      catch (err) {
        appendError(describeAxiosError(err, t(portalDict.loginErrorSmsFallback)))
      }
      finally {
        setBusy(false)
      }
      return
    }
    if (flow === 'reset') {
      setBusy(true)
      try {
        await sendResetCode()
        setInputKind('code')
        appendAssistant(t(portalDict.chatAskCode))
      }
      catch (err) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr.response?.status === 404) appendError(t(portalDict.forgotAccountNotFound))
        else appendError(describeAxiosError(err, t(portalDict.forgotErrorSendFallback)))
      }
      finally {
        setBusy(false)
      }
      return
    }
    // register
    setBusy(true)
    try {
      await requestCode('register')
      setInputKind('code')
      appendAssistant(t(portalDict.chatAskCode))
    }
    catch (err) {
      appendError(describeAxiosError(err, t(portalDict.registerErrorSmsFallback)))
    }
    finally {
      setBusy(false)
    }
  }

  const handlePasswordSubmit = async (value: string) => {
    if (value.length < 6) {
      appendError(t(portalDict.chatInvalidPassword))
      return
    }
    if (flow === 'reset') {
      newPasswordRef.current = value
      setInputKind('confirm_password')
      appendAssistant(t(portalDict.chatAskConfirmPassword))
      return
    }
    if (flow === 'register') {
      passwordRef.current = value
      setAwaitingTerms(true)
      setInputKind('none')
      appendAssistant(t(portalDict.chatAskTerms))
      return
    }
    passwordRef.current = value
    setBusy(true)
    try {
      await finishLogin()
    }
    catch (err) {
      restartLoginIdentityFlow(err instanceof ApiError
        ? (err.message || t(portalDict.loginErrorFallback))
        : describeAxiosError(err, t(portalDict.loginErrorRetry)))
    }
    finally {
      setBusy(false)
    }
  }

  const handleConfirmPasswordSubmit = async (value: string) => {
    if (value !== newPasswordRef.current) {
      appendError(t(portalDict.chatPasswordMismatch))
      return
    }
    setBusy(true)
    try {
      appendAssistant(t(portalDict.chatResetting))
      await api.post('/api/v1/iam/public/password/reset/confirm/', {
        identifier: identifierRef.current.trim(),
        code: codeRef.current.trim(),
        new_password: newPasswordRef.current,
      })
      appendAssistant(t(portalDict.chatResetSuccess))
      setInputKind('none')
    }
    catch (err) {
      appendError(err instanceof ApiError
        ? err.message
        : describeAxiosError(err, t(portalDict.forgotErrorFallback)))
      setInputKind('confirm_password')
    }
    finally {
      setBusy(false)
    }
  }

  const handleCodeSubmit = async (value: string) => {
    if (!/^\d{6}$/.test(value.trim())) {
      appendError(t(portalDict.chatInvalidCode))
      return
    }
    codeRef.current = value.trim()
    if (flow === 'sms') {
      setBusy(true)
      try {
        await finishLogin()
      }
      catch (err) {
        restartLoginIdentityFlow(describeAxiosError(err, t(portalDict.loginErrorFallback)))
      }
      finally {
        setBusy(false)
      }
      return
    }
    if (flow === 'reset') {
      setInputKind('password')
      appendAssistant(t(portalDict.chatAskNewPassword))
      return
    }
    // register verify then password
    setBusy(true)
    try {
      await verifyRegisterCode()
      setInputKind('password')
      appendAssistant(t(portalDict.chatAskRegisterPassword))
    }
    catch (err) {
      appendError(describeAxiosError(err, locale === 'en' ? 'Code verification failed.' : '验证码校验失败。'))
    }
    finally {
      setBusy(false)
    }
  }

  const checkSubdomain = async (workspaceName: string): Promise<{ sub: string; status: SubdomainStatus }> => {
    const fallback = identifierType === 'phone'
      ? `xiaoone${identifierRef.current.slice(-4) || 'work'}`
      : `xiaoone-${(identifierRef.current.split('@')[0] || 'work').slice(0, 10)}`
    const sub = deriveMerchantSubdomain(workspaceName, fallback)
    if (!isValidMerchantSubdomain(sub))
      return { sub, status: 'invalid' }
    try {
      await api.get('/api/v1/iam/public/subdomain/check/', {
        params: { sub, region },
      })
      return { sub, status: 'available' }
    }
    catch (err: any) {
      const message = String(err?.response?.data?.message || '')
      return { sub, status: message === 'subdomain_taken' ? 'taken' : 'invalid' }
    }
  }

  const handleTextSubmit = async (value: string) => {
    const trimmed = value.trim()
    if (flow !== 'register' || inputKind !== 'text') return

    if (registerStep === 'nickname') {
      if (!trimmed) {
        appendError(locale === 'en' ? 'Please enter a display name.' : '请填写用户名。')
        return
      }
      nicknameRef.current = trimmed
      setShowAvatarPicker(true)
      setInputKind('none')
      appendAssistant(t(portalDict.chatAskAvatar))
      return
    }

    if (registerStep !== 'workspace') return

    if (trimmed.length < 2) {
      appendError(locale === 'en' ? 'Workspace name must be at least 2 characters.' : '工作站名称至少 2 个字符。')
      return
    }
    workspaceNameRef.current = trimmed
    appendAssistant(t(portalDict.chatSubdomainChecking))
    setBusy(true)
    try {
      const { sub, status } = await checkSubdomain(trimmed)
      if (status === 'taken') {
        appendError(t(portalDict.chatSubdomainTaken))
        workspaceNameRef.current = ''
        return
      }
      if (status !== 'available') {
        appendError(t(portalDict.chatSubdomainInvalid))
        workspaceNameRef.current = ''
        return
      }
      appendAssistant(`${t(portalDict.chatSubdomainAvailable)} (${merchantSubdomainFqdn(sub)})`)
      await submitRegisterWithSubdomain(sub)
      appendAssistant(t(portalDict.chatRegisterSuccess))
      setRegisterStep('done')
      setInputKind('none')
    }
    catch (err) {
      appendError(describeAxiosError(err, t(portalDict.registerErrorRegisterFallback)))
      workspaceNameRef.current = ''
    }
    finally {
      setBusy(false)
    }
  }

  const acceptTerms = () => {
    acceptedTermsRef.current = true
    setAwaitingTerms(false)
    appendUser(t(portalDict.chatComposerAcceptTerms))
    setRegisterStep('nickname')
    setInputKind('text')
    appendAssistant(t(portalDict.chatAskNickname))
  }

  const skipAvatar = () => {
    appendUser(t(portalDict.chatComposerSkip))
    setShowAvatarPicker(false)
    setRegisterStep('workspace')
    setInputKind('text')
    appendAssistant(t(portalDict.chatAskWorkspace))
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (!file) return
    if (!file.type.startsWith('image/')) {
      appendError(locale === 'en' ? 'Please choose an image file.' : '请选择图片文件。')
      return
    }
    avatarFileRef.current = file
    appendUser(locale === 'en' ? 'Avatar selected' : '已选择头像')
    setShowAvatarPicker(false)
    setRegisterStep('workspace')
    setInputKind('text')
    appendAssistant(t(portalDict.chatAskWorkspace))
  }

  const handleResendCode = async () => {
    if (smsCooldown > 0 || busy) return
    setBusy(true)
    try {
      if (flow === 'reset') await sendResetCode()
      else if (flow === 'register') await requestCode('register')
      else await requestCode('login')
      appendAssistant(t(portalDict.chatAskCode))
    }
    catch (err) {
      appendError(describeAxiosError(err, t(portalDict.chatGenericError)))
    }
    finally {
      setBusy(false)
    }
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const value = draft.trim()
    if (!value || busy || inputKind === 'none') return
    appendUser(
      inputKind === 'password' || inputKind === 'confirm_password' ? maskSecret(value) : value,
      inputKind === 'password' || inputKind === 'confirm_password',
    )
    setDraft('')
    if (inputKind === 'identifier') await handleIdentifierSubmit(value)
    else if (inputKind === 'password') await handlePasswordSubmit(value)
    else if (inputKind === 'confirm_password') await handleConfirmPasswordSubmit(value)
    else if (inputKind === 'code') await handleCodeSubmit(value)
    else if (inputKind === 'text') await handleTextSubmit(value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const switchFlow = (nextFlow: AuthChatFlow) => {
    bootstrapFlow(nextFlow)
  }

  const switchIdentifierType = (nextType: IdentifierType) => {
    if (!canInferIdentifierType || nextType === identifierType) return
    if (IS_LOCAL_DEPLOY && nextType === 'email') setLocalIpRegionOverride('overseas')
    if (IS_LOCAL_DEPLOY && nextType === 'phone') setLocalIpRegionOverride('mainland')
    setIdentifierType(nextType)
    appendAssistant(
      nextType === 'phone'
        ? t(portalDict.chatAskIdentifierPhone)
        : t(portalDict.chatAskIdentifierEmail),
    )
    setInputKind('identifier')
  }

  const inputPlaceholder = useMemo(() => {
    if (inputKind === 'password' || inputKind === 'confirm_password') return '••••••••'
    if (inputKind === 'code') return t(portalDict.loginSmsCodePlaceholder)
    if (inputKind === 'identifier') {
      return identifierType === 'phone'
        ? t(portalDict.loginPhonePlaceholder)
        : t(portalDict.loginEmailPlaceholder)
    }
    if (inputKind === 'text' && registerStep === 'nickname') return t(portalDict.registerNicknamePlaceholder)
    if (inputKind === 'text' && registerStep === 'workspace') return t(portalDict.registerWorkspaceNamePlaceholder)
    return t(portalDict.chatComposerPlaceholder)
  }, [identifierType, inputKind, registerStep, t])

  const inputType = inputKind === 'password' || inputKind === 'confirm_password' ? 'password' : inputKind === 'code' ? 'text' : 'text'
  const inputMode = inputKind === 'code' ? 'numeric' : inputKind === 'identifier' && identifierType === 'phone' ? 'tel' : 'text'
  const showLocalIdentifierSwitch = IS_LOCAL_DEPLOY
  const showInlineIdentifierSwitch = !IS_LOCAL_DEPLOY && isOverseas && flow !== 'register'
  const chatPortalHomeHref = publicHome

  const flowChips: Array<{ key: AuthChatFlow; label: LocalizedCopy }> = [
    { key: 'sms', label: portalDict.chatChipSmsLogin },
    { key: 'password', label: portalDict.chatChipPasswordLogin },
    { key: 'reset', label: portalDict.chatChipResetPassword },
    { key: 'register', label: portalDict.chatChipRegister },
  ]

  const heroPanel = useMemo(() => {
    if (flow === 'register') {
      return {
        title: t(portalDict.registerSimpleHeroTitle),
        lead: locale === 'en'
          ? 'Register your smart workspace through a guided conversation.'
          : '通过对话引导，完成账号验证并开通智能空间站。',
        features: [
          { icon: Sparkles, text: locale === 'en' ? 'Files stored in your dedicated space' : '用户文件保存在专属空间站，按账号隔离' },
          { icon: Cloud, text: locale === 'en' ? 'Independent Hermes server for AI workflows' : '独立 Hermes 服务器承载 AI 工作流与业务工具' },
          { icon: ShieldCheck, text: locale === 'en' ? 'Unified customer service and channel ops' : '客服接待、渠道协同、团队与素材仓库统一管理' },
        ],
        formTitle: locale === 'en' ? 'Create your workspace' : '创建智能空间站',
        formSub: locale === 'en' ? 'Follow the assistant prompts below' : '跟随助手提示，逐步完成注册',
      }
    }
    if (flow === 'reset') {
      return {
        title: t(portalDict.forgotHeroTitle),
        lead: t(portalDict.forgotHeroDesc),
        features: [
          { icon: Sparkles, text: t(portalDict.forgotFeatureChannel) },
          { icon: ShieldCheck, text: t(portalDict.forgotFeatureSecure) },
        ],
        formTitle: t(portalDict.forgotFormTitle),
        formSub: t(portalDict.forgotFormSub),
      }
    }
    return {
      title: t(portalDict.loginHeroTitle),
      lead: t(portalDict.loginHeroDesc),
      features: [
        { icon: Lock, text: t(portalDict.loginFeatureEncryption) },
        { icon: Fingerprint, text: t(portalDict.loginFeatureAudit) },
        { icon: ShieldCheck, text: isOverseas ? 'Region-aware secure access' : '区域感知 · IP 限流保护' },
      ],
      formTitle: t(portalDict.loginFormTitle),
      formSub: locale === 'en' ? 'Follow the assistant prompts below' : '跟随助手提示，安全登录工作站',
    }
  }, [flow, isOverseas, locale, t])

  if (auth.status === 'authed' && !registeringRef.current)
    return <Navigate to={resolveAuthedLandingPath(auth.subscriptionPlanCode, from)} replace />

  return (
    <div
      className={`x1-portal x1-portal--login x1-portal--first-screen x1-chat-portal min-h-screen relative overflow-hidden flex flex-col ${fromHomePortal ? 'x1-chat-portal--from-home' : ''}`}
    >
      <FirstScreenBackdrop className="x1-portal__first-screen-bg" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-3 py-6 sm:p-6">
        <motion.div
          initial={
            fromHomePortal
              ? { opacity: 0, y: 20 }
              : { opacity: 0, y: 30, scale: 0.95 }
          }
          animate={
            portalReveal
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 20, scale: fromHomePortal ? 1 : 0.95 }
          }
          transition={{
            duration: fromHomePortal ? 0.48 : 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="x1-portal__card-stack x1-portal__card-stack--login"
        >
          <div className="x1-portal__card-toolbar">
            <a href={chatPortalHomeHref} className="x1-portal__brand-pill" aria-label={t(portalDict.backToSite)}>
              <img
                src={theme === 'dark' ? '/logo/horizontal-night.png' : '/logo/horizontal-day.png'}
                alt={t(portalDict.brand)}
                className="x1-portal__brand-logo"
              />
            </a>
            <div className="x1-portal__card-toolbar-actions">
              <PortalStyleSwitch target="classic" />
              <PortalToggleBar
                prefs={prefs}
                identifierSwitch={showLocalIdentifierSwitch
                  ? {
                      value: identifierType,
                      onChange: switchIdentifierType,
                      disabled: busy,
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
                  <h1 className="x1-portal__title">{heroPanel.title}</h1>
                  <p className="x1-portal__lead">{heroPanel.lead}</p>
                  <div className="space-y-4">
                    {heroPanel.features.map(item => {
                      const Icon = item.icon
                      return (
                        <div key={item.text} className="x1-portal__feature-tile">
                          <Icon size={16} className="text-[var(--xiaoone-accent-2)] shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="x1-portal__fine-print">
                  {new Date().getFullYear()} · {t(portalDict.loginCopyright)}
                </p>
              </div>
            </div>

            <div className="x1-portal__split-main x1-chat-portal__split-main">
              <div className="x1-chat-portal__head">
                <h2 className="x1-portal__mini-title">{heroPanel.formTitle}</h2>
                <p className="x1-portal__mini-lead">{heroPanel.formSub}</p>
              </div>

              <div ref={listRef} className="x1-chat-portal__messages" aria-live="polite">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`x1-chat-portal__bubble-row ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}
                  >
                    <div className={`x1-chat-portal__bubble ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
                <span ref={messagesEndRef} className="x1-chat-portal__messages-end" aria-hidden="true" />
              </div>

              <div className="x1-chat-portal__composer-wrap">
                <div className="x1-chat-portal__fixed-controls">
                  {showInlineIdentifierSwitch && (
                    <div className="x1-chat-portal__identifier-switch">
                      <span className="x1-chat-portal__inline-label">{t(portalDict.chatSwitchIdentifierHint)}</span>
                      <div
                        className="x1-portal__segment x1-chat-portal__inline-segment"
                        role="group"
                        aria-label={t(portalDict.chatSwitchIdentifierHint)}
                      >
                        <button
                          type="button"
                          onClick={() => switchIdentifierType('phone')}
                          className={`x1-portal__segment-btn ${identifierType === 'phone' ? 'is-active' : ''}`}
                          aria-pressed={identifierType === 'phone'}
                          disabled={busy}
                        >
                          <Phone size={14} />
                          {t(portalDict.loginIdentifierTabPhone)}
                        </button>
                        <button
                          type="button"
                          onClick={() => switchIdentifierType('email')}
                          className={`x1-portal__segment-btn ${identifierType === 'email' ? 'is-active' : ''}`}
                          aria-pressed={identifierType === 'email'}
                          disabled={busy}
                        >
                          <Mail size={14} />
                          {t(portalDict.loginIdentifierTabEmail)}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="x1-portal__segment x1-chat-portal__flow-segment" role="toolbar" aria-label="Auth shortcuts">
                    {flowChips.map(chip => (
                      <button
                        key={chip.key}
                        type="button"
                        className={`x1-portal__segment-btn ${flow === chip.key ? 'is-active' : ''}`}
                        onClick={() => switchFlow(chip.key)}
                        disabled={busy}
                      >
                        {t(chip.label)}
                      </button>
                    ))}
                  </div>
                </div>

                {awaitingTerms && (
                  <div className="x1-chat-portal__composer-actions">
                    <button type="button" className="x1-portal__btn-primary x1-chat-portal__action-primary" onClick={acceptTerms}>
                      {t(portalDict.chatComposerAcceptTerms)}
                    </button>
                  </div>
                )}

                {showAvatarPicker && (
                  <div className="x1-chat-portal__composer-actions">
                    <label className="x1-portal__btn-ghost x1-chat-portal__action-ghost">
                      <ImagePlus size={14} />
                      {locale === 'en' ? 'Choose avatar' : '选择头像'}
                      <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    </label>
                    <button type="button" className="x1-portal__btn-ghost x1-chat-portal__action-ghost" onClick={skipAvatar}>
                      {t(portalDict.chatComposerSkip)}
                    </button>
                  </div>
                )}

                {(inputKind === 'code' && (flow === 'sms' || flow === 'reset' || flow === 'register')) && (
                  <div className="x1-chat-portal__composer-actions">
                    <button
                      type="button"
                      className="x1-portal__btn-ghost x1-chat-portal__action-ghost"
                      disabled={smsCooldown > 0 || busy}
                      onClick={() => void handleResendCode()}
                    >
                      {smsCooldown > 0
                        ? `${smsCooldown}${t(portalDict.chatResendCooldown)}`
                        : t(portalDict.chatResendCode)}
                    </button>
                  </div>
                )}

                {inputKind !== 'none' && !awaitingTerms && !showAvatarPicker && (
                  <form className="x1-chat-portal__composer" onSubmit={handleSubmit}>
                    <input
                      ref={inputRef}
                      type={inputType}
                      inputMode={inputMode}
                      autoComplete={
                        inputKind === 'password' || inputKind === 'confirm_password'
                          ? 'current-password'
                          : inputKind === 'code'
                            ? 'one-time-code'
                            : 'username'
                      }
                      value={draft}
                      onChange={e => {
                        const next = e.target.value
                        if (inputKind === 'code') setDraft(next.replace(/\D/g, '').slice(0, 6))
                        else if (inputKind === 'identifier' && identifierType === 'phone') setDraft(next.replace(/\D/g, '').slice(0, 11))
                        else setDraft(next)
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={inputPlaceholder}
                      className="x1-portal__input x1-chat-portal__composer-field"
                      disabled={busy}
                      aria-label={inputPlaceholder}
                    />
                    <button
                      type="submit"
                      className="x1-chat-portal__composer-send"
                      disabled={busy || !draft.trim()}
                      aria-label={t(portalDict.chatComposerSend)}
                    >
                      <ArrowUp size={18} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
