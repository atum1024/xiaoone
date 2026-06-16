import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { PasswordInput, toast } from '@xiaoone/react-ui'
import { api } from '../lib/httpClient'
import { describeAxiosError } from '../lib/apiErrors'
import { usePreferences } from '../app/preferences'
export interface StandaloneAdminStatus {
  configured: boolean
  username: string
  admin_url: string
  subdomain: string
}
interface StandaloneSiteAccountConfigProps {
  onStatusChange?: (status: StandaloneAdminStatus) => void
}
function channelButtonClass(active: boolean): string {
  return active
    ? 'sa-btn sa-btn--compact is-active'
    : 'sa-btn sa-btn--compact'
}
export function StandaloneSiteAccountConfig({ onStatusChange }: StandaloneSiteAccountConfigProps) {
  const { t, tpl } = usePreferences()
  const [status, setStatus] = useState<StandaloneAdminStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changeMode, setChangeMode] = useState(false)
  const [code, setCode] = useState('')
  const [channel, setChannel] = useState<'sms' | 'email'>('sms')
  const [newPassword, setNewPassword] = useState('')

  const updateStatus = useCallback((data: StandaloneAdminStatus) => {
    setStatus(data)
    onStatusChange?.(data)
  }, [onStatusChange])

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/iam/merchant/standalone-admin/status/')
      const data = (res.data?.data || res.data) as StandaloneAdminStatus
      updateStatus(data)
      if (!data.configured) setShowSetup(true)
    } catch (err) {
      toast.error(describeAxiosError(err))
    } finally {
      setLoading(false)
    }
  }, [updateStatus])

  useEffect(() => { void loadStatus() }, [loadStatus])

  const handleSetup = async () => {
    if (password.length < 6 || username.length < 3) {
      toast.error(t('standalone.account.validationLength'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('standalone.account.validationMismatch'))
      return
    }
    try {
      const res = await api.post('/api/v1/iam/merchant/standalone-admin/setup/', { username, password })
      const data = (res.data?.data || res.data) as StandaloneAdminStatus
      toast.success(t('standalone.account.setupSuccess'))
      setShowSetup(false)
      updateStatus(data)
    } catch (err) {
      toast.error(describeAxiosError(err))
    }
  }

  const requestCode = async () => {
    try {
      await api.post('/api/v1/iam/merchant/standalone-admin/request-code/', { channel })
      toast.success(t(channel === 'email' ? 'standalone.account.codeSentEmail' : 'standalone.account.codeSentSms'))
    } catch (err) {
      toast.error(describeAxiosError(err))
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('standalone.account.newPasswordMin'))
      return
    }
    try {
      const res = await api.post('/api/v1/iam/merchant/standalone-admin/change-password/', {
        method: channel, code, password: newPassword,
      })
      const data = (res.data?.data || res.data) as StandaloneAdminStatus
      toast.success(t('standalone.account.passwordUpdated'))
      setChangeMode(false)
      setCode('')
      setNewPassword('')
      updateStatus(data)
    } catch (err) {
      toast.error(describeAxiosError(err))
    }
  }

  if (loading) return <div className="sa-state sa-state--inline"><span className="sa-state__body">{t('standalone.account.loading')}</span></div>

  if (showSetup) {
    return (
      <>
        <p className="sa-form-intro">
          {t('standalone.account.setupIntro')}
        </p>
        <div className="sa-form">
          <label className="sa-field"><span className="sa-label">{t('standalone.account.username')}</span><input className="sa-input" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label className="sa-field"><span className="sa-label">{t('standalone.account.password')}</span><PasswordInput value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="sa-field"><span className="sa-label">{t('standalone.account.confirmPassword')}</span><PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
          <button type="button" className="sa-btn sa-btn--primary sa-btn--fit" onClick={() => void handleSetup()}>{t('standalone.account.save')}</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="sa-account-status"><ShieldCheck className="h-5 w-5 text-emerald-600" /> {t('standalone.account.configured')}</div>
      <p className="sa-form-intro">{tpl('standalone.account.usernameValue', status?.username || '-')}</p>
      <div className="sa-account-actions"><button type="button" className="sa-btn" onClick={() => setChangeMode(v => !v)}>{changeMode ? t('standalone.account.cancelPasswordChange') : t('standalone.account.changePassword')}</button></div>
      {changeMode ? (
        <div className="sa-form sa-form--change">
          <div className="sa-channel-row">
            <button type="button" className={channelButtonClass(channel === 'sms')} onClick={() => setChannel('sms')}>{t('standalone.account.smsVerify')}</button>
            <button type="button" className={channelButtonClass(channel === 'email')} onClick={() => setChannel('email')}>{t('standalone.account.emailVerify')}</button>
            <button type="button" className="sa-btn sa-btn--compact" onClick={() => void requestCode()}>{t('standalone.account.sendCode')}</button>
          </div>
          <input className="sa-input" placeholder={t('standalone.account.code')} value={code} onChange={e => setCode(e.target.value)} />
          <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('standalone.account.newPassword')} />
          <button type="button" className="sa-btn sa-btn--primary sa-btn--fit" onClick={() => void handleChangePassword()}>{t('standalone.account.confirmChange')}</button>
        </div>
      ) : null}
    </>
  )
}
