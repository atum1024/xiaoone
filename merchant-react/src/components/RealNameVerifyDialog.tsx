import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@xiaoone/react-ui'
import { setLocalRealNameOverride } from '@xiaoone/region'
import { usePreferences } from '../app/preferences'
import { api } from '../lib/httpClient'
import { type ApiErrorLike } from '../lib/apiErrors'
import { kycOutcomeMessage } from '../lib/kycOutcome'
import type { KycStatus } from '../lib/kycTypes'

interface RealNameVerifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureLabel?: string
  onVerified?: () => void | Promise<void>
}

export function RealNameVerifyDialog({
  open,
  onOpenChange,
  featureLabel,
  onVerified,
}: RealNameVerifyDialogProps) {
  const { t, tpl } = usePreferences()
  const label = featureLabel || t('common.dialog.featureDefault')
  const [kyc, setKyc] = useState<KycStatus | null>(null)
  const [kycName, setKycName] = useState('')
  const [kycIdCard, setKycIdCard] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    api.get('/api/v1/iam/merchant/kyc/status/')
      .then(r => setKyc((r.data?.data || r.data) as KycStatus))
      .catch(() => setKyc(null))
  }, [open])

  async function finishVerified(nextKyc: KycStatus) {
    setKyc(nextKyc)
    if (nextKyc.verified) {
      setLocalRealNameOverride(true)
      toast.success(t('account.security.kycPassed'), { duration: 4000 })
    }
    await onVerified?.()
    onOpenChange(false)
  }

  async function submitKyc() {
    if (busy) return
    setBusy('kyc-submit')
    setError('')
    try {
      const r = await api.post('/api/v1/iam/merchant/kyc/start/', {
        name: kycName.trim(),
        id_card: kycIdCard.trim(),
      })
      const nextKyc = (r.data?.data || r.data) as KycStatus
      if (nextKyc?.verified) {
        await finishVerified(nextKyc)
        return
      }
      setKyc(nextKyc)
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
      setError(t('account.security.errorGeneric'))
    }
    finally {
      setBusy('')
    }
  }

  async function skipKyc() {
    if (busy) return
    setBusy('kyc-skip')
    setError('')
    try {
      const r = await api.post('/api/v1/iam/merchant/kyc/skip/', { reason: 'provider unconfigured from inline dialog' })
      const nextKyc = (r.data?.data || r.data) as KycStatus
      await finishVerified(nextKyc)
    }
    catch {
      setError(t('account.security.errorGeneric'))
    }
    finally {
      setBusy('')
    }
  }

  const verified = Boolean(kyc?.verified)
  const providerConfigured = Boolean(kyc?.provider_configured)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('account.security.kycDialogTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm text-[var(--xiaoone-fg-mute)]">
          <p className="m-0">
            {tpl('account.security.kycDialogDesc', label)}
          </p>
          <label className="grid gap-1">
            <span>{t('account.security.kycName')}</span>
            <input
              className="w-full rounded-md border border-[var(--xiaoone-border)] bg-transparent px-3 py-2 text-sm text-[var(--xiaoone-fg)]"
              value={kycName}
              onChange={e => setKycName(e.target.value)}
              placeholder={t('account.security.kycNamePlaceholder')}
              autoComplete="off"
              disabled={verified}
            />
          </label>
          <label className="grid gap-1">
            <span>{t('account.security.kycIdCard')}</span>
            <input
              className="w-full rounded-md border border-[var(--xiaoone-border)] bg-transparent px-3 py-2 text-sm text-[var(--xiaoone-fg)]"
              value={kycIdCard}
              onChange={e => setKycIdCard(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder={t('account.security.kycIdPlaceholder')}
              autoComplete="off"
              disabled={verified}
            />
          </label>
          {!providerConfigured ? (
            <p className="m-0 text-xs">{t('account.security.kycProviderUnconfigured')}</p>
          ) : null}
          {error ? <p className="m-0 text-sm text-[var(--xiaoone-danger,#dc2626)]">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(busy)}>
            {t('common.dialog.later')}
          </Button>
          {!providerConfigured ? (
            <Button variant="outline" onClick={() => void skipKyc()} disabled={Boolean(busy) || verified}>
              {busy === 'kyc-skip' ? t('account.security.kycSkipping') : t('account.security.kycSkip')}
            </Button>
          ) : null}
          <Button
            onClick={() => void submitKyc()}
            disabled={Boolean(busy) || !kycName || !kycIdCard || verified || !providerConfigured}
          >
            {busy === 'kyc-submit' ? t('account.security.kycSubmitting') : t('account.security.kycSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
