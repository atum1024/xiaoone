import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Globe, Settings2 } from 'lucide-react'
import { Button, toast } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import { AcceleratorConfigDialog } from './AcceleratorConfigDialog'
import { BillingAPI, type NetworkAccelerationProfile } from '../lib/billingApi'
import { SharedNetworkAssistantDialog } from './SharedNetworkAssistantDialog'
import { useAuthStore } from '../store/auth'

const PROFILE_STATUS_KEYS: Record<string, string> = {
  provisioning: 'automation.accelerator.status.provisioning',
  active: 'automation.accelerator.status.active',
  provision_failed: 'automation.accelerator.status.provision_failed',
  revoking: 'automation.accelerator.status.revoking',
  released: 'automation.accelerator.status.released',
  revoke_failed: 'automation.accelerator.status.revoke_failed',
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''))
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] ? decodeURIComponent(plainMatch[1]) : fallback
}

function formatTime(input?: string | null) {
  if (!input) return '—'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return d.toLocaleString('zh-CN', { hour12: false })
}

function sortProfiles(items: NetworkAccelerationProfile[]): NetworkAccelerationProfile[] {
  return items.slice().sort((a, b) => {
    const pa = a.package_code === 'shared' ? 0 : 1
    const pb = b.package_code === 'shared' ? 0 : 1
    if (pa !== pb) return pa - pb
    if (a.slot_index !== b.slot_index) return a.slot_index - b.slot_index
    return String(a.id).localeCompare(String(b.id))
  })
}

function triggerDownload(response: any, fallbackName: string) {
  const fileName = filenameFromDisposition(response.headers?.['content-disposition'], fallbackName)
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: response.headers?.['content-type'] || 'text/plain; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return fileName
}

export function WarehouseAcceleratorPanel() {
  const { t } = usePreferences()
  const qc = useQueryClient()
  const currentMerchantId = useAuthStore(state => state.currentMerchantId)
  const authPlanCode = useAuthStore(state => state.subscriptionPlanCode)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const mid = Number(currentMerchantId || 0)

  const packageLabel = (code: string) => (
    code === 'dedicated' ? t('automation.accelerator.package.dedicated') : t('automation.accelerator.package.shared')
  )

  const profileStatusLabel = (status: string) => {
    const key = PROFILE_STATUS_KEYS[status]
    return key ? t(key) : status
  }

  const profilesQ = useQuery({
    queryKey: ['network-acceleration-profiles'],
    queryFn: () => BillingAPI.networkAccelerationProfiles(),
  })
  const subscriptionQ = useQuery({
    enabled: mid > 0,
    queryKey: ['current-subscription', mid],
    queryFn: () => BillingAPI.currentSubscription(mid),
  })

  const downloadM = useMutation({
    mutationFn: async (profile: NetworkAccelerationProfile) => {
      if (profile.package_code === 'shared')
        return BillingAPI.downloadSharedNetworkConfigSlot(profile.slot_index)
      return BillingAPI.downloadDedicatedNetworkOvpn(profile.slot_index)
    },
    onSuccess: (response, profile) => {
      if (response.status === 202) {
        toast({
          title: t('automation.accelerator.toast.preparing'),
          description: t('automation.accelerator.toast.preparingDesc'),
        })
        return
      }
      const fallback = profile.config_filename || profile.ovpn_filename || `${profile.username || `${profile.package_code}-${profile.slot_index}`}.${profile.package_code === 'shared' ? 'txt' : 'ovpn'}`
      const fileName = triggerDownload(response, fallback)
      toast({
        title: t('automation.accelerator.toast.downloadStarted'),
        description: fileName,
      })
      qc.invalidateQueries({ queryKey: ['network-acceleration-profiles'] })
    },
    onError: (e: any) => {
      if (e?.response?.status === 409 && e?.response?.data?.message === 'dedicated_server_not_ready') {
        toast({
          title: t('automation.accelerator.toast.waitOps'),
          description: t('automation.accelerator.toast.waitOpsDesc'),
        })
        return
      }
      toast({
        title: t('automation.accelerator.toast.downloadFailed'),
        description: e?.response?.data?.message || e?.message || t('automation.accelerator.toast.retryLater'),
      })
    },
  })

  const profiles = useMemo(() => sortProfiles(profilesQ.data?.items || []), [profilesQ.data?.items])
  const currentPlanCode = String(subscriptionQ.data?.subscription?.plan?.code || authPlanCode || '')
  const sharedReady = profilesQ.data?.shared_ready !== false
  const dedicatedReady = Boolean(profilesQ.data?.dedicated_ready)

  return (
    <div className="gap-accelerator" aria-label={t('automation.accelerator.aria')}>
      <section className="gap-accelerator-hero">
        <div>
          <span className="gap-accelerator-kicker"><Globe size={14} /> {t('automation.accelerator.kicker')}</span>
          <h2>{t('automation.accelerator.title')}</h2>
          <p>{t('automation.accelerator.description')}</p>
        </div>
        <div className="gap-accelerator-hero__actions">
          <Button onClick={() => setDialogOpen(true)}>
            <Settings2 size={14} />
            {t('automation.accelerator.configure')}
          </Button>
          <Button variant="secondary" onClick={() => setAssistantOpen(true)}>
            {t('automation.accelerator.assistant')}
          </Button>
        </div>
      </section>

      <section className="gap-accelerator-downloads" aria-label={t('automation.accelerator.downloadsAria')}>
        <div className="gap-accelerator-downloads__head">
          <h3>{t('automation.accelerator.downloadsTitle')}</h3>
        </div>
        {profilesQ.isLoading ? <p className="gap-accelerator-empty">{t('automation.accelerator.loadingProfiles')}</p> : null}
        {!profilesQ.isLoading && profiles.length === 0 ? (
          <p className="gap-accelerator-empty">{t('automation.accelerator.emptyProfiles')}</p>
        ) : null}
        {profiles.length > 0 ? (
          <ul className="gap-accelerator-download-list">
            {profiles.map(profile => (
              <li key={profile.id}>
                <div>
                  <strong>{profile.config_filename || profile.ovpn_filename || `${profile.username || 'config'}.${profile.package_code === 'shared' ? 'txt' : 'ovpn'}`}</strong>
                  <span>
                    {packageLabel(profile.package_code)} · {t('automation.accelerator.slot')} {profile.slot_index} · {profileStatusLabel(profile.status)}
                  </span>
                  <span>{formatTime(profile.provisioned_at || profile.updated_at)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={profile.status !== 'active' || downloadM.isPending}
                  onClick={() => downloadM.mutate(profile)}
                >
                  <Download size={14} />
                  {t('automation.accelerator.download')}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <AcceleratorConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentPlanCode={currentPlanCode}
        sharedReady={sharedReady}
        dedicatedReady={dedicatedReady}
        onConfigured={() => qc.invalidateQueries({ queryKey: ['network-acceleration-profiles'] })}
      />
      <SharedNetworkAssistantDialog open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  )
}
