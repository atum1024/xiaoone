import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRegion } from '@xiaoone/region'
import { toast } from '@xiaoone/react-ui'
import { api } from '../lib/httpClient'
import { PartnerBrandMark } from './PartnerBrandMark'
import { BindWizardDialog, type BindChannel, type BindingStatusItem } from './BindWizardDialog'
import { partnerBrandCssVars } from '../lib/partnerBrands'
import { usePreferences } from '../app/preferences'
import './ComposerBindRail.css'

function itemFor(items: BindingStatusItem[], channel: BindChannel): BindingStatusItem | null {
  return items.find(item => item.channel === channel) || null
}

function showTelegramForRegion(region: string, localIpRegionOverride: string | null): boolean {
  return region === 'overseas' || localIpRegionOverride === 'overseas'
}

function mapWechatStatus(raw: string | undefined): BindingStatusItem['status'] {
  if (raw === 'bound') return 'bound'
  if (raw === 'binding') return 'pending'
  return 'revoked'
}

export function ComposerBindRail() {
  const { t } = usePreferences()
  const { region, localIpRegionOverride } = useRegion()
  const showTelegram = showTelegramForRegion(region, localIpRegionOverride)

  const statusText = useCallback((item: BindingStatusItem | null): string => {
    if (!item) return t('common.bind.unbound')
    if (item.status === 'bound') return item.external_id_masked || t('common.bind.bound')
    if (item.status === 'pending') return t('common.bind.pending')
    return t('common.bind.unbound')
  }, [t])

  const [items, setItems] = useState<BindingStatusItem[]>([])
  const [wechatItem, setWechatItem] = useState<BindingStatusItem | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [channel, setChannel] = useState<BindChannel | null>(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const [wechatResp, telegramResp] = await Promise.all([
        api.get('/api/v1/ai/workspace/wechat-bind/status/'),
        showTelegram
          ? api.get('/api/v1/ai/workspace/telegram-bind/status/')
          : Promise.resolve(null),
      ])

      const wechatData = wechatResp.data?.data || wechatResp.data || {}
      const wechatRow: BindingStatusItem = {
        channel: 'wechat',
        status: mapWechatStatus(String(wechatData.status || 'unbound')),
        external_id_masked: String(wechatData.account_id_masked || ''),
      }
      setWechatItem(wechatRow)
      setIsOwner(Boolean(wechatData.is_owner))

      const telegramData = telegramResp ? (telegramResp.data?.data || telegramResp.data || {}) : {}
      const telegramRow: BindingStatusItem | null = telegramResp
        ? {
            channel: 'telegram',
            status: mapWechatStatus(String(telegramData.status || 'unbound')),
            external_id_masked: String(telegramData.external_id_masked || telegramData.bot_username || ''),
          }
        : null
      setItems(telegramRow ? [telegramRow] : [])
    } catch {
      setWechatItem(null)
      setItems([])
      setIsOwner(false)
    } finally {
      setLoading(false)
    }
  }, [showTelegram])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const wechat = wechatItem
  const telegram = itemFor(items, 'telegram')
  const telegramAvailable = showTelegram
  const channelTotal = telegramAvailable ? 2 : 1
  const boundCount = useMemo(() => {
    let count = wechat?.status === 'bound' ? 1 : 0
    if (telegramAvailable && telegram?.status === 'bound')
      count += 1
    return count
  }, [wechat, telegram, telegramAvailable])

  const currentBindings = useMemo(
    () => ({ wechat, telegram }),
    [wechat, telegram],
  )

  const openChannelDialog = (next: BindChannel) => {
    if (next === 'wechat' && !isOwner) {
      toast({ title: t('common.bind.permissionDenied'), description: t('common.bind.contactAdmin') })
      return
    }
    if (next === 'telegram' && !isOwner) {
      toast({ title: t('common.bind.permissionDenied'), description: t('common.bind.contactAdmin') })
      return
    }
    setChannel(next)
    setDialogOpen(true)
  }

  return (
    <>
      <section className="composer-bind-rail" aria-label={t('common.bind.personalTitle')}>
        <div className="composer-bind-rail__head">
          <span>{t('common.bind.personalTitle')}</span>
          <em>{boundCount}/{channelTotal}</em>
        </div>
        <div className="composer-bind-rail__actions">
          <button
            type="button"
            className={`composer-bind-rail__btn ${wechat?.status === 'bound' ? 'is-bound' : ''} ${!isOwner ? 'is-disabled' : ''}`}
            style={partnerBrandCssVars('wechat')}
            onClick={() => openChannelDialog('wechat')}
            title={isOwner ? t('common.bind.wechatTitle') : t('common.bind.adminOnly')}
            disabled={loading}
          >
            <PartnerBrandMark brand="wechat" size={14} className="partner-brand-mark--sm" />
            <span>{t('common.bind.wechat')}</span>
            <small>{loading ? t('common.bind.loading') : (isOwner ? statusText(wechat) : t('common.bind.adminOnlyShort'))}</small>
          </button>
          {telegramAvailable && (
            <button
              type="button"
              className={`composer-bind-rail__btn ${telegram?.status === 'bound' ? 'is-bound' : ''} ${!isOwner ? 'is-disabled' : ''}`}
              style={partnerBrandCssVars('telegram')}
              onClick={() => openChannelDialog('telegram')}
              title={isOwner ? t('common.bind.telegramTitle') : t('common.bind.adminOnly')}
              disabled={loading}
            >
              <PartnerBrandMark brand="telegram" size={14} className="partner-brand-mark--sm" />
              <span>{t('common.bind.telegram')}</span>
              <small>{loading ? t('common.bind.loading') : (isOwner ? statusText(telegram) : t('common.bind.adminOnlyShort'))}</small>
            </button>
          )}
          <button
            type="button"
            className="composer-bind-rail__refresh"
            onClick={() => void loadStatus()}
            title={t('common.bind.refresh')}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'is-spinning' : ''} />
          </button>
        </div>
      </section>

      <BindWizardDialog
        open={dialogOpen}
        initialChannel={channel}
        onOpenChange={setDialogOpen}
        onBound={() => void loadStatus()}
        showTelegram={telegramAvailable}
        currentBindings={currentBindings}
      />
    </>
  )
}
