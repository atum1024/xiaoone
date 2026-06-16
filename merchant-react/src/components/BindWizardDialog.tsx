import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Camera, CheckCircle2, Clipboard, ExternalLink, KeyRound } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { PartnerBrandMark } from './PartnerBrandMark'
import { api } from '../lib/httpClient'
import { authFetch } from '../lib/authFetch'
import { describeAxiosError } from '../lib/apiErrors'
import { usePreferences } from '../app/preferences'
import { partnerBrandCssVars } from '../lib/partnerBrands'
import './BindWizardDialog.css'

export type BindChannel = 'wechat' | 'telegram'

export interface BindingStatusItem {
  channel: BindChannel
  status: 'pending' | 'bound' | 'revoked'
  external_id_masked?: string
}

type WizardStep = 'pick' | 'confirm-replace' | 'flow'
type FlowStatus = 'idle' | 'waiting' | 'pairing' | 'bound' | 'failed' | 'unavailable'

const BOTFATHER_URL = 'https://t.me/BotFather'
const BOTFATHER_COMMAND = '/newbot'
const TELEGRAM_TOKEN_RE = /^\d{3,20}:[A-Za-z0-9_-]{20,}$/

function maskTelegramToken(token: string): string {
  const cleaned = token.trim()
  if (!cleaned.includes(':')) return '123456789:AA...'
  const [prefix, secret] = cleaned.split(':')
  return `${prefix}:${secret.slice(0, 4)}...${secret.slice(-4)}`
}

function telegramBindFailureHint(message: string): string {
  const text = message || 'Telegram 配置失败'
  if (/unauthorized|token|not found|invalid/i.test(text))
    return `${text}。请回到 BotFather 重新复制完整 Bot Token，不要复制 Bot 名称或截图文字。`
  if (/timeout|timed out|connect|network|proxy|unreachable/i.test(text))
    return `${text}。请联系管理员检查 Telegram 网络代理配置。`
  return text
}

interface Props {
  open: boolean
  initialChannel?: BindChannel | null
  onOpenChange: (open: boolean) => void
  onBound?: () => void
  showTelegram?: boolean
  currentBindings?: Partial<Record<BindChannel, BindingStatusItem | null>>
}

function resetFlowState(setters: {
  setToken: (v: string) => void
  setEntryPayload: (v: string) => void
  setQrcodeUrl: (v: string) => void
  setBotUsername: (v: string) => void
  setConfigured: (v: boolean | null) => void
  setBoundMask: (v: string) => void
  setWechatHint: (v: string) => void
  setTelegramBotToken: (v: string) => void
  setTelegramPairingCode: (v: string) => void
  setStatus: (v: FlowStatus) => void
  setLoading: (v: boolean) => void
}) {
  setters.setToken('')
  setters.setEntryPayload('')
  setters.setQrcodeUrl('')
  setters.setBotUsername('')
  setters.setConfigured(null)
  setters.setBoundMask('')
  setters.setWechatHint('')
  setters.setTelegramBotToken('')
  setters.setTelegramPairingCode('')
  setters.setStatus('idle')
  setters.setLoading(false)
}

function wechatStatusHint(status: string): string {
  switch (status) {
    case 'scanned':
      return '已扫码，请在微信中确认登录'
    case 'redirect':
      return '正在切换线路，请稍候'
    case 'expired':
      return '二维码已过期，正在刷新'
    case 'confirmed':
      return '正在写入绑定凭据'
    default:
      return '请使用微信扫描二维码'
  }
}

function telegramStatusHint(status: string): string {
  switch (status) {
    case 'validating':
      return '正在验证 Bot Token'
    case 'writing':
      return '正在写入 Hermes 工作区'
    default:
      return '等待 Hermes 工作区完成配置'
  }
}

function telegramUsername(value: string): string {
  const cleaned = String(value || '').trim().replace(/^@/, '')
  if (!/^[A-Za-z0-9_]{5,32}$/.test(cleaned)) return ''
  return cleaned
}

export function BindWizardDialog({
  open,
  initialChannel = null,
  onOpenChange,
  onBound,
  showTelegram = true,
  currentBindings,
}: Props) {
  const { t, tpl, locale } = usePreferences()
  const [channel, setChannel] = useState<BindChannel | null>(initialChannel)
  const [wizardStep, setWizardStep] = useState<WizardStep>('pick')
  const [token, setToken] = useState('')
  const [entryPayload, setEntryPayload] = useState('')
  const [qrcodeUrl, setQrcodeUrl] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [boundMask, setBoundMask] = useState('')
  const [wechatHint, setWechatHint] = useState('')
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramPairingCode, setTelegramPairingCode] = useState('')
  const [status, setStatus] = useState<FlowStatus>('idle')
  const [loading, setLoading] = useState(false)
  const sseAbortRef = useRef<AbortController | null>(null)

  const flowResetters = {
    setToken,
    setEntryPayload,
    setQrcodeUrl,
    setBotUsername,
    setConfigured,
    setBoundMask,
    setWechatHint,
    setTelegramBotToken,
    setTelegramPairingCode,
    setStatus,
    setLoading,
  }

  const stopWechatSse = () => {
    sseAbortRef.current?.abort()
    sseAbortRef.current = null
  }

  const cancelWechatBind = async (bindSessionId: string) => {
    if (!bindSessionId) return
    try {
      await api.post('/api/v1/ai/workspace/wechat-bind/cancel/', { bind_session_id: bindSessionId })
    } catch {
      // ignore cancel errors on close
    }
  }

  const cancelActiveWechatBind = () => {
    if (channel === 'wechat' && token && status === 'waiting') {
      void cancelWechatBind(token)
    }
  }

  const consumeWechatBindSse = async (eventsUrl: string, bindSessionId: string): Promise<'complete' | 'failed' | 'closed'> => {
    stopWechatSse()
    const controller = new AbortController()
    sseAbortRef.current = controller
    const resp = await authFetch(eventsUrl, { signal: controller.signal })
    if (!resp.ok || !resp.body) {
      throw new Error(`绑定事件流失败: ${resp.status}`)
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (controller.signal.aborted) return 'closed'
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const blocks = buf.split('\n\n')
      buf = blocks.pop() || ''
      for (const block of blocks) {
        const dataLine = block.split('\n').find(line => line.startsWith('data: '))
        if (!dataLine) continue
        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(dataLine.slice(6)) as Record<string, unknown>
        } catch {
          continue
        }
        const type = String(evt.type || '')
        if (type === 'wechat_bind_qrcode') {
          const url = String(evt.qrcode_url || '')
          if (url) {
            setQrcodeUrl(url)
            setEntryPayload(url)
            setConfigured(true)
          }
          setWechatHint(wechatStatusHint('waiting'))
          continue
        }
        if (type === 'wechat_bind_status') {
          const mapped = String(evt.status || 'waiting')
          setWechatHint(wechatStatusHint(mapped))
          continue
        }
        if (type === 'wechat_bind_complete') {
          setBoundMask(String(evt.account_id_masked || evt.user_id_masked || ''))
          setStatus('bound')
          setWechatHint(
            evt.home_channel_set === false
              ? '绑定成功，请先给机器人发送一条消息以确认默认投递聊天。'
              : '绑定成功，默认投递聊天已设置。'
          )
          onBound?.()
          return 'complete'
        }
        if (type === 'wechat_bind_failed') {
          const message = String(evt.message || evt.error_code || '绑定失败')
          setStatus('failed')
          setWechatHint(message)
          void cancelWechatBind(bindSessionId)
          return 'failed'
        }
      }
    }
    return 'closed'
  }

  const consumeTelegramBindSse = async (eventsUrl: string, bindSessionId: string): Promise<'complete' | 'failed' | 'closed'> => {
    stopWechatSse()
    const controller = new AbortController()
    sseAbortRef.current = controller
    const resp = await authFetch(eventsUrl, { signal: controller.signal })
    if (!resp.ok || !resp.body) {
      throw new Error(`绑定事件流失败: ${resp.status}`)
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (controller.signal.aborted) return 'closed'
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const blocks = buf.split('\n\n')
      buf = blocks.pop() || ''
      for (const block of blocks) {
        const dataLine = block.split('\n').find(line => line.startsWith('data: '))
        if (!dataLine) continue
        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(dataLine.slice(6)) as Record<string, unknown>
        } catch {
          continue
        }
        const type = String(evt.type || '')
        if (type === 'telegram_bind_status') {
          setWechatHint(telegramStatusHint(String(evt.status || 'waiting')))
          const username = String(evt.bot_username || '').replace(/^@/, '')
          if (username) setBotUsername(username)
          continue
        }
        if (type === 'telegram_bind_complete') {
          const username = String(evt.bot_username || '').replace(/^@/, '')
          setBotUsername(username)
          setBoundMask(username ? `@${username}` : String(evt.bot_id || ''))
          setStatus('pairing')
          setWechatHint('Telegram Bot 已写入 Hermes 工作区。请打开 Bot 发送 /start，把返回的配对码填到这里。')
          return 'complete'
        }
        if (type === 'telegram_bind_failed') {
          const message = String(evt.message || evt.error_code || 'Telegram 配置失败')
          setStatus('failed')
          setWechatHint(message)
          return 'failed'
        }
      }
    }
    return 'closed'
  }

  const consumeTelegramPairingSse = async (eventsUrl: string): Promise<'complete' | 'failed' | 'closed'> => {
    stopWechatSse()
    const controller = new AbortController()
    sseAbortRef.current = controller
    const resp = await authFetch(eventsUrl, { signal: controller.signal })
    if (!resp.ok || !resp.body) {
      throw new Error(`配对事件流失败: ${resp.status}`)
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (controller.signal.aborted) return 'closed'
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const blocks = buf.split('\n\n')
      buf = blocks.pop() || ''
      for (const block of blocks) {
        const dataLine = block.split('\n').find(line => line.startsWith('data: '))
        if (!dataLine) continue
        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(dataLine.slice(6)) as Record<string, unknown>
        } catch {
          continue
        }
        const type = String(evt.type || '')
        if (type === 'telegram_pairing_status') {
          setWechatHint('正在批准 Telegram 用户')
          continue
        }
        if (type === 'telegram_pairing_approved') {
          setStatus('bound')
          setWechatHint(
            evt.home_channel_set === false
              ? 'Telegram 用户已配对，请重新发送一条消息以确认默认投递聊天。'
              : 'Telegram 用户已配对，默认投递聊天已设置。'
          )
          onBound?.()
          return 'complete'
        }
        if (type === 'telegram_pairing_failed') {
          const message = String(evt.message || evt.error_code || '配对失败')
          if (await refreshTelegramBoundStatus(message))
            return 'complete'
          setStatus('pairing')
          setWechatHint(message)
          return 'failed'
        }
      }
    }
    return 'closed'
  }

  async function refreshTelegramBoundStatus(fallbackHint = ''): Promise<boolean> {
    try {
      const resp = await api.get('/api/v1/ai/workspace/telegram-bind/status/')
      const data = resp.data?.data || resp.data || {}
      if (String(data.status || '') !== 'bound') return false
      const username = telegramUsername(String(data.bot_username || data.external_id_masked || ''))
      const mask = String(data.external_id_masked || (username ? `@${username}` : '') || '')
      if (username) setBotUsername(username)
      setBoundMask(mask)
      setStatus('bound')
      setWechatHint('Telegram 已绑定，请发送新消息测试默认投递聊天。')
      onBound?.()
      return true
    } catch {
      if (fallbackHint) setWechatHint(fallbackHint)
      return false
    }
  }

  async function startWechatBind() {
    const resp = await api.post('/api/v1/ai/workspace/wechat-bind/start/', {})
    const data = resp.data?.data || resp.data || {}
    const bindSessionId = String(data.bind_session_id || '')
    const eventsUrl = String(data.events_url || `/api/v1/ai/workspace/wechat-bind/${bindSessionId}/events/`)
    if (!bindSessionId) {
      throw new Error('未返回绑定会话 ID')
    }
    setToken(bindSessionId)
    setConfigured(true)
    setQrcodeUrl('')
    setEntryPayload('')
    setWechatHint('正在生成二维码…')
    const outcome = await consumeWechatBindSse(eventsUrl, bindSessionId)
    if (outcome === 'closed') {
      setStatus(prev => (prev === 'waiting' ? 'failed' : prev))
      setWechatHint(prev => prev || '绑定连接已结束，请重试')
    }
  }

  async function submitTelegramBind() {
    const cleanToken = telegramBotToken.trim()
    if (!cleanToken) {
      toast({ title: '请输入 Bot Token' })
      return
    }
    if (!TELEGRAM_TOKEN_RE.test(cleanToken)) {
      toast({ title: 'Bot Token 格式不正确', description: '请复制 BotFather 返回的完整 Token。' })
      return
    }
    setLoading(true)
    setStatus('waiting')
    setConfigured(true)
    setWechatHint('正在提交到 Hermes 工作区')
    stopWechatSse()
    try {
      const resp = await api.post('/api/v1/ai/workspace/telegram-bind/start/', {
        bot_token: cleanToken,
      })
      const data = resp.data?.data || resp.data || {}
      const bindSessionId = String(data.bind_session_id || '')
      const eventsUrl = String(data.events_url || `/api/v1/ai/workspace/telegram-bind/${bindSessionId}/events/`)
      if (!bindSessionId) {
        throw new Error('未返回绑定会话 ID')
      }
      setToken(bindSessionId)
      const outcome = await consumeTelegramBindSse(eventsUrl, bindSessionId)
      if (outcome === 'closed') {
        setStatus(prev => (prev === 'waiting' ? 'failed' : prev))
        setWechatHint(prev => prev || '绑定连接已结束，请重试')
      }
    } catch (err: any) {
      const code = err?.response?.data?.data?.code || err?.response?.data?.code
      if (code === 'FORBIDDEN_OWNER_ONLY') {
        toast({ title: '权限不足', description: '请联系商户管理员' })
        onOpenChange(false)
        return
      }
      if (code === 'WORKSPACE_NOT_READY') {
        setStatus('unavailable')
        setWechatHint(String(err?.response?.data?.message || '智能空间未就绪'))
        return
      }
      setStatus('failed')
      const message = telegramBindFailureHint(describeAxiosError(err, t('common.bind.retryToken'), undefined, locale))
      setWechatHint(message)
      toast({ title: 'Telegram 配置失败', description: message })
    } finally {
      setLoading(false)
    }
  }

  async function submitTelegramPairingCode() {
    const pairingCode = telegramPairingCode.trim().replace(/\s+/g, '').toUpperCase()
    if (!pairingCode) {
      toast({ title: '请输入配对码' })
      return
    }
    if (!/^[A-Z0-9]{6,16}$/.test(pairingCode)) {
      toast({ title: '配对码格式不正确', description: '请填写 Bot 返回的那串大写字母和数字。' })
      return
    }
    setLoading(true)
    setWechatHint('正在提交配对码')
    stopWechatSse()
    try {
      const resp = await api.post('/api/v1/ai/workspace/telegram-bind/pairing/approve/', {
        pairing_code: pairingCode,
      })
      const data = resp.data?.data || resp.data || {}
      const bindSessionId = String(data.bind_session_id || '')
      const eventsUrl = String(data.events_url || `/api/v1/ai/workspace/telegram-bind/${bindSessionId}/events/`)
      if (!bindSessionId) {
        throw new Error('未返回配对会话 ID')
      }
      setToken(bindSessionId)
      const outcome = await consumeTelegramPairingSse(eventsUrl)
      if (outcome === 'closed') {
        setWechatHint(prev => prev || '配对连接已结束，请重试')
      }
    } catch (err: any) {
      const code = err?.response?.data?.data?.code || err?.response?.data?.code
      if (code === 'WORKSPACE_NOT_READY') {
        setStatus('unavailable')
        setWechatHint(String(err?.response?.data?.message || '智能空间未就绪'))
        return
      }
      if (code === 'TELEGRAM_BOT_NOT_BOUND') {
        setStatus('failed')
        setWechatHint('请先写入 Telegram Bot Token')
        return
      }
      if (await refreshTelegramBoundStatus())
        return
      const message = describeAxiosError(err, t('common.bind.retryPair'), undefined, locale)
      setWechatHint(message)
      toast({ title: 'Telegram 配对失败', description: message })
    } finally {
      setLoading(false)
    }
  }

  async function startChannelBind(nextChannel: BindChannel) {
    setLoading(true)
    setStatus(nextChannel === 'telegram' ? 'idle' : 'waiting')
    setChannel(nextChannel)
    setWizardStep('flow')
    setToken('')
    setEntryPayload('')
    setQrcodeUrl('')
    setBotUsername('')
    setConfigured(null)
    setBoundMask('')
    setWechatHint('')
    setTelegramBotToken('')
    setTelegramPairingCode('')
    stopWechatSse()
    try {
      if (nextChannel === 'wechat') {
        await startWechatBind()
        return
      }
      setConfigured(true)
    } catch (err: any) {
      const code = err?.response?.data?.data?.code || err?.response?.data?.code
      if (code === 'FORBIDDEN_OWNER_ONLY') {
        toast({ title: '权限不足', description: '请联系商户管理员' })
        onOpenChange(false)
        return
      }
      if (code === 'WORKSPACE_NOT_READY') {
        setStatus('unavailable')
        setWechatHint(String(err?.response?.data?.message || '智能空间未就绪'))
        return
      }
      setStatus('failed')
      toast({ title: t('common.bind.initFailed'), description: describeAxiosError(err, t('common.bind.retryLater'), undefined, locale) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      stopWechatSse()
      cancelActiveWechatBind()
      setChannel(initialChannel)
      setWizardStep('pick')
      resetFlowState(flowResetters)
      return
    }

    setChannel(initialChannel)
    resetFlowState(flowResetters)

    if (initialChannel) {
      const existing = currentBindings?.[initialChannel]
      if (existing?.status === 'bound') {
        setBoundMask(String(existing.external_id_masked || ''))
        setWizardStep('confirm-replace')
        return
      }
      setWizardStep('flow')
      void startChannelBind(initialChannel)
      return
    }

    setWizardStep('pick')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when dialog opens or target channel changes
  }, [open, initialChannel])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      stopWechatSse()
      cancelActiveWechatBind()
    }
    onOpenChange(next)
  }

  const channelLabel = channel === 'wechat' ? t('common.bind.wechat') : t('common.bind.telegram')

  const title = useMemo(() => {
    if (wizardStep === 'confirm-replace') {
      return channel === 'wechat' ? t('common.bind.replaceWechat') : t('common.bind.replaceTelegram')
    }
    if (wizardStep === 'pick') return t('common.bind.pickChannel')
    return channel === 'wechat' ? t('common.bind.bindHermesWechat') : t('common.bind.bindHermesTelegram')
  }, [wizardStep, channel, t])
  const activeTelegramUsername = channel === 'telegram' ? telegramUsername(botUsername || boundMask) : ''
  const activeTelegramUrl = activeTelegramUsername ? `https://t.me/${activeTelegramUsername}` : ''

  const copyPayload = async () => {
    const text = entryPayload || token
    if (!text) return
    await copyText(text, t('common.bind.copiedBindInfo'))
  }

  const copyText = async (text: string, toastTitle = t('common.bind.copied')) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: toastTitle })
    } catch {
      toast({ title: t('common.bind.copyFailed'), description: t('common.bind.copyManual') })
    }
  }

  const confirmReplace = () => {
    if (!channel) return
    void startChannelBind(channel)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="x1-bind-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {wizardStep === 'pick' && (
          <div className={`x1-bind-picks ${showTelegram ? '' : 'x1-bind-picks--single'}`}>
            <button type="button" className="x1-bind-pick" style={partnerBrandCssVars('wechat')} onClick={() => void startChannelBind('wechat')} disabled={loading}>
              <PartnerBrandMark brand="wechat" size={20} />
              <strong>微信</strong>
              <span>扫码绑定商户 Hermes 个人微信机器人</span>
            </button>
            {showTelegram && (
              <button type="button" className="x1-bind-pick" style={partnerBrandCssVars('telegram')} onClick={() => void startChannelBind('telegram')} disabled={loading}>
                <PartnerBrandMark brand="telegram" size={20} />
                <strong>Telegram</strong>
                <span>使用自己的 BotFather Token 配置商户 Hermes</span>
              </button>
            )}
          </div>
        )}

        {wizardStep === 'confirm-replace' && channel && (
          <div className="x1-bind-confirm-replace">
            <p className="x1-bind-confirm-replace__lead">
              已绑定{boundMask ? ` ${boundMask}` : ''}，重新{channel === 'wechat' ? '扫码' : '绑定 Bot'}后旧绑定将被替换。是否继续？
            </p>
            {activeTelegramUrl && (
              <a className="x1-bind-link" href={activeTelegramUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                打开 @{activeTelegramUsername}
              </a>
            )}
          </div>
        )}

        {wizardStep === 'flow' && channel && (
          <div className="x1-bind-flow">
            <div className={`x1-bind-status x1-bind-status--${status}`}>
              <strong>
                {status === 'bound'
                  ? `${channelLabel}绑定成功`
                  : status === 'pairing'
                    ? '完成 Telegram 用户配对'
                  : status === 'unavailable'
                    ? `${channelLabel}绑定暂不可用`
                    : status === 'idle' && channel === 'telegram'
                      ? '填写 Bot 配置'
                    : loading
                      ? '正在生成绑定入口'
                      : '等待完成绑定'}
              </strong>
              <span>
                {status === 'unavailable'
                  ? channel === 'wechat'
                    ? (wechatHint || '智能空间未就绪，请稍后再试')
                    : (wechatHint || '智能空间未就绪，请稍后再试')
                    : status === 'bound'
                      ? channel === 'wechat'
                        ? (wechatHint || '商户微信机器人已写入 Hermes 工作区，默认投递聊天已设置。')
                      : (wechatHint || 'Telegram Bot 已写入 Hermes 工作区，默认投递聊天已设置。')
                    : status === 'pairing'
                      ? (wechatHint || '打开 Bot 发送 /start，把 Bot 返回的 pairing code 填到这里。')
                    : status === 'idle' && channel === 'telegram'
                      ? '先从 BotFather 复制 Token；如果要让同事或客服协助，只截取 BotFather 返回 Token 的那条消息。'
                    : channel === 'wechat'
                      ? (wechatHint || '请使用微信扫描二维码，页面会自动刷新状态。')
                      : (wechatHint || '请等待 Hermes 工作区验证并重载 Telegram Bot。')}
              </span>
            </div>

            {channel === 'wechat' && configured !== false && qrcodeUrl && (
              <div className="x1-bind-qrcode-wrap">
                <QRCodeSVG value={qrcodeUrl} size={200} level="M" className="x1-bind-qrcode" />
              </div>
            )}

            {channel === 'wechat' && configured !== false && !qrcodeUrl && !loading && (
              <div className="x1-bind-fallback">
                正在等待 Hermes 工作区返回二维码…
              </div>
            )}

            {channel === 'telegram' && configured !== false && botUsername && (
              <div className="x1-bind-bot">
                <span>Bot</span>
                <strong>@{botUsername}</strong>
              </div>
            )}

            {channel === 'telegram' && !['pairing', 'bound'].includes(status) && (
              <div className="x1-tg-flow">
                <div className="x1-tg-guide" aria-label="Telegram 绑定步骤">
                  <ol className="x1-tg-guide__steps">
                    <li>
                      <span className="x1-tg-guide__index">1</span>
                      <div>
                        <strong>打开 BotFather</strong>
                        <p>在 Telegram 搜索 @BotFather，发送 <code>/newbot</code>，按提示设置 Bot 名称和用户名。</p>
                        <div className="x1-tg-guide__actions">
                          <a className="x1-bind-mini-action" href={BOTFATHER_URL} target="_blank" rel="noreferrer">
                            <ExternalLink size={13} />
                            打开 BotFather
                          </a>
                          <button type="button" className="x1-bind-mini-action" onClick={() => void copyText(BOTFATHER_COMMAND, '已复制 /newbot')}>
                            <Clipboard size={13} />
                            复制 /newbot
                          </button>
                        </div>
                      </div>
                    </li>
                    <li>
                      <span className="x1-tg-guide__index">2</span>
                      <div>
                        <strong>复制或截图 Token</strong>
                        <p>Token 长得像 <code>{maskTelegramToken(telegramBotToken)}</code>。截图只保留 BotFather 的 Token 消息，裁掉无关聊天和验证码。</p>
                      </div>
                    </li>
                    <li>
                      <span className="x1-tg-guide__index">3</span>
                      <div>
                        <strong>写入 Hermes 后测试</strong>
                        <p>提交后保持弹窗打开。写入成功后，打开你的 Bot 发送 <code>/start</code>，把 Bot 返回的配对码填回来。</p>
                      </div>
                    </li>
                  </ol>

                  <div className="x1-tg-shot" aria-label="截图方式">
                    <div className="x1-tg-shot__phone">
                      <div className="x1-tg-shot__top">@BotFather</div>
                      <div className="x1-tg-shot__bubble">Use this token to access the HTTP API:</div>
                      <div className="x1-tg-shot__token">{maskTelegramToken(telegramBotToken)}</div>
                    </div>
                    <div className="x1-tg-shot__note">
                      <strong><Camera size={14} />截图方式</strong>
                      <p>Mac 用 <code>Shift + Command + 4</code> 框选 Token 消息；Windows 用 <code>Win + Shift + S</code>；手机直接截屏后裁剪。</p>
                      <p>截图仅用于定位 Token。最终提交前仍要核对输入框里的完整 Token。</p>
                    </div>
                  </div>
                </div>

                <div className="x1-bind-form">
                  <label>
                    <span><KeyRound size={13} /> Bot Token</span>
                    <input
                      value={telegramBotToken}
                      onChange={event => setTelegramBotToken(event.target.value)}
                      placeholder="123456789:AA..."
                      autoComplete="off"
                      disabled={loading || status === 'waiting'}
                    />
                  </label>
                </div>
              </div>
            )}
            {channel === 'telegram' && status === 'pairing' && (
              <div className="x1-tg-pairing">
                <div className="x1-tg-pairing__steps">
                  <div>
                    <span className="x1-tg-guide__index">1</span>
                    <p>打开 @{activeTelegramUsername || botUsername}，发送 <code>/start</code>。</p>
                  </div>
                  <div>
                    <span className="x1-tg-guide__index">2</span>
                    <p>复制 Bot 返回的 <code>Here's your pairing code</code> 后面的配对码。</p>
                  </div>
                  <div>
                    <span className="x1-tg-guide__index">3</span>
                    <p>把配对码填入下方，系统会自动批准当前 Telegram 用户。</p>
                  </div>
                </div>
                {activeTelegramUrl && (
                  <a className="x1-bind-link" href={activeTelegramUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    打开 @{activeTelegramUsername}
                  </a>
                )}
                <div className="x1-bind-form">
                  <label>
                    <span><KeyRound size={13} /> Pairing Code</span>
                    <input
                      value={telegramPairingCode}
                      onChange={event => setTelegramPairingCode(event.target.value.toUpperCase())}
                      placeholder="LJPQMFBG"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </label>
                </div>
              </div>
            )}
            {channel === 'telegram' && status === 'bound' && (
              <div className="x1-tg-next-test">
                <CheckCircle2 size={16} />
              <div>
                <strong>下一步测试</strong>
                  <span>{botUsername ? `打开 @${botUsername}，发送“你好”。` : '打开刚绑定的 Bot，发送“你好”。'}如果仍提示默认聊天未设置，请重新配对；如果 20 秒内没有回复，联系管理员检查网络代理。</span>
                  {activeTelegramUrl && (
                    <a className="x1-bind-mini-action x1-tg-next-test__action" href={activeTelegramUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} />
                      打开 @{activeTelegramUsername}
                    </a>
                  )}
                </div>
              </div>
            )}
            {channel === 'wechat' ? (
              <ol className="x1-bind-steps">
                {configured === false ? (
                  <>
                    <li>请确认智能空间已开通且 Hermes 通道在线。</li>
                    <li>配置就绪后点击“重新发起”生成新的扫码入口。</li>
                  </>
                ) : (
                  <>
                    <li>使用微信扫描上方二维码（商户 Hermes 个人微信通道）。</li>
                    <li>按微信提示确认登录；换绑不会删除旧账号历史文件。</li>
                    <li>绑定由腾讯 iLink 提供，请遵守相关服务条款。</li>
                  </>
                )}
              </ol>
            ) : configured === false ? (
              <ol className="x1-bind-steps">
                <li>请确认智能空间已开通且 Hermes 通道在线。</li>
                <li>配置就绪后重新提交 Bot Token。</li>
              </ol>
            ) : (
              <p className="x1-bind-token-note">
                Token 只写入当前商户自己的 Hermes 工作区；截图只用于协助定位 Token，不要发到公开群或工单之外。
              </p>
            )}
            {boundMask && status === 'bound' && (
              <p className="x1-bind-tip x1-bind-tip--ok">绑定对象：{boundMask}</p>
            )}
            {status === 'waiting' && <p className="x1-bind-tip">已发起绑定，完成后会自动更新状态。</p>}
            {status === 'pairing' && <p className="x1-bind-tip">已写入 Bot Token，等待填写配对码。</p>}
            {status === 'bound' && <p className="x1-bind-tip x1-bind-tip--ok">绑定成功。</p>}
            {status === 'failed' && <p className="x1-bind-tip x1-bind-tip--err">绑定已失效或发起失败，请重试。</p>}
            {status === 'unavailable' && <p className="x1-bind-tip x1-bind-tip--err">请稍后重试或联系管理员。</p>}
          </div>
        )}

        <DialogFooter>
          {wizardStep === 'confirm-replace' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                取消
              </Button>
              <Button onClick={confirmReplace} disabled={loading}>
                确认更换
              </Button>
            </>
          )}
          {wizardStep === 'flow' && (
            <>
              {channel === 'wechat' && (
                <Button variant="outline" onClick={copyPayload} disabled={!entryPayload && !token}>
                  复制绑定信息
                </Button>
              )}
              {status !== 'bound' && channel === 'wechat' && (
                <Button variant="outline" onClick={() => void startChannelBind(channel || 'wechat')} disabled={loading}>
                  重新发起
                </Button>
              )}
              {!['pairing', 'bound'].includes(status) && channel === 'telegram' && (
                <Button onClick={() => void submitTelegramBind()} disabled={loading || status === 'waiting'}>
                  {status === 'failed' ? '重新提交' : '写入 Hermes'}
                </Button>
              )}
              {status === 'pairing' && channel === 'telegram' && (
                <Button onClick={() => void submitTelegramPairingCode()} disabled={loading || !telegramPairingCode.trim()}>
                  批准配对码
                </Button>
              )}
              <Button className={status === 'bound' ? undefined : 'x1-bind-secondary-close'} onClick={() => handleOpenChange(false)}>
                {status === 'bound' ? '完成' : '关闭'}
              </Button>
            </>
          )}
          {wizardStep === 'pick' && (
            <Button onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
