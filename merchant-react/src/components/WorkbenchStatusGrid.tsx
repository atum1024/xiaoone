import { useCallback, useMemo, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Coins,
  Crown,
  Database,
  Globe2,
  HardDrive,
  Headphones,
  MessageCircle,
  Radio,
  Send,
  Share2,
  Users,
  Wifi,
} from 'lucide-react'
import { useRegion } from '@xiaoone/region'
import { getChatKit } from '@xiaoone/chat-kit'
import { toast } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import { useAssistantRuntimeStatusQuery } from '../hooks/agentQueries'
import { isWorkspaceReclaimed } from '../lib/workspaceStatusApi'
import { BillingAPI } from '../lib/billingApi'
import { api } from '../lib/httpClient'
import { displayPlanName } from '../lib/planLabels'
import {
  listSocialAccounts,
  SOCIAL_PLATFORM_OPTIONS,
  type SocialAccount,
} from '../lib/socialApi'
import type { AssistantRuntimeMarker } from '../lib/workspaceStatusApi'
import type { StandaloneAdminStatus } from '../pages/StandaloneSiteAccountConfig'
import { useAuthStore } from '../store/auth'
import { BindWizardDialog, type BindChannel, type BindingStatusItem } from './BindWizardDialog'
import './WorkbenchStatusGrid.css'

type CardTone = 'ok' | 'pending' | 'warn' | 'neutral'

type StatusCategory = 'runtime' | 'business' | 'account' | 'growth'

interface StatusCardModel {
  id: string
  category: StatusCategory
  titleKey: string
  coverClass: string
  icon: ComponentType<{ size?: number; className?: string }>
  tag: string
  desc: string
  meta?: string
  tone: CardTone
  clickable?: boolean
  onClick?: () => void
  loading?: boolean
}

function fmtGbFromBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB'
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`
}

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeSocialPlatform(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function countLinkedSocialPlatforms(accounts: SocialAccount[]): number {
  const linked = new Set<string>()
  accounts.forEach((account) => {
    ;(account.extras?.linked_platforms || []).forEach((platform) => {
      const normalized = normalizeSocialPlatform(platform)
      if (normalized) linked.add(normalized)
    })
    ;(account.extras?.display_names || []).forEach((item) => {
      const normalized = normalizeSocialPlatform(item.platform)
      if (normalized) linked.add(normalized)
    })
  })
  return linked.size
}

function mapWechatStatus(raw: string | undefined): BindingStatusItem['status'] {
  if (raw === 'bound') return 'bound'
  if (raw === 'binding') return 'pending'
  return 'revoked'
}

function runtimeTone(marker: AssistantRuntimeMarker | null | undefined): CardTone {
  if (!marker) return 'neutral'
  if (marker.state === 'ok') return 'ok'
  if (marker.state === 'pending') return 'pending'
  if (marker.state === 'off') return 'warn'
  return 'warn'
}

function localizedMarkerLabel(
  marker: AssistantRuntimeMarker | null | undefined,
  t: (key: string, fallback?: string) => string,
): string {
  if (!marker) return t('common.runtime.loading')
  const code = marker.code?.trim()
  if (code) return t(`common.runtime.marker.${code}`, marker.label)
  return marker.label
}

function formatExpiry(value: string | null | undefined, localeTag: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(localeTag, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function StatusCard({ card, t }: { card: StatusCardModel; t: (key: string, fallback?: string) => string }) {
  const Icon = card.icon
  const body = (
    <div className={`wb-status-card__cover ${card.coverClass}`}>
      <span className="wb-status-card__brand">
        <Icon size={10} aria-hidden="true" />
        xiaoone
      </span>
      <span className="wb-status-card__mark">STATUS</span>
      <span className="wb-status-card__glass wb-status-card__glass--a" aria-hidden="true" />
      <span className="wb-status-card__glass wb-status-card__glass--b" aria-hidden="true" />
      <div className="wb-status-card__panel">
        <div className="wb-status-card__row-title">
          <span className="wb-status-card__title-icon">
            <Icon size={13} aria-hidden="true" />
          </span>
          <strong>{t(card.titleKey)}</strong>
          <span className={`wb-status-card__tag is-${card.tone}`}>
            {card.loading ? t('common.workbench.status.loading') : card.tag}
          </span>
        </div>
        <p className={`wb-status-card__desc${card.loading ? ' is-loading' : ''}`}>
          {card.loading ? t('common.workbench.status.loading') : card.desc}
        </p>
        {card.meta ? <p className="wb-status-card__meta">{card.meta}</p> : null}
      </div>
    </div>
  )

  if (!card.clickable || !card.onClick) {
    return (
      <article className="wb-status-card is-static" aria-label={t(card.titleKey)}>
        {body}
      </article>
    )
  }

  return (
    <button
      type="button"
      className="wb-status-card is-clickable"
      aria-label={t(card.titleKey)}
      onClick={card.onClick}
    >
      {body}
    </button>
  )
}

export function WorkbenchStatusGrid() {
  const navigate = useNavigate()
  const { t, tpl, locale } = usePreferences()
  const localeTag = locale === 'en' ? 'en-US' : 'zh-CN'
  const { region, localIpRegionOverride } = useRegion()
  const showTelegram = region === 'overseas' || localIpRegionOverride === 'overseas'
  const merchantId = useAuthStore(state => Number(state.currentMerchantId || 0))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [bindChannel, setBindChannel] = useState<BindChannel | null>(null)
  const [wechatItem, setWechatItem] = useState<BindingStatusItem | null>(null)
  const [telegramItem, setTelegramItem] = useState<BindingStatusItem | null>(null)
  const [bindIsOwner, setBindIsOwner] = useState(false)
  const [bindLoading, setBindLoading] = useState(false)

  const runtimeQuery = useAssistantRuntimeStatusQuery(true)
  const walletQuery = useQuery({
    queryKey: ['workbench', 'wallet'],
    queryFn: () => BillingAPI.wallet(),
  })
  const subscriptionQuery = useQuery({
    queryKey: ['workbench', 'subscription', merchantId],
    queryFn: () => BillingAPI.currentSubscription(merchantId),
    enabled: merchantId > 0,
  })
  const partnerQuery = useQuery({
    queryKey: ['workbench', 'partner-overview'],
    queryFn: () => BillingAPI.partnerPlanOverview(),
  })
  const standaloneQuery = useQuery({
    queryKey: ['workbench', 'standalone-admin-status'],
    queryFn: async () => {
      const res = await api.get('/api/v1/iam/merchant/standalone-admin/status/')
      return (res.data?.data || res.data) as StandaloneAdminStatus
    },
  })
  const kefuStoresQuery = useQuery({
    queryKey: ['workbench', 'kefu-stores'],
    queryFn: async () => {
      const res = await getChatKit().StoreAPI.list()
      return res.items || []
    },
  })
  const socialAccountsQuery = useQuery({
    queryKey: ['workbench', 'social-accounts'],
    queryFn: () => listSocialAccounts(),
  })

  const loadBindStatus = useCallback(async () => {
    setBindLoading(true)
    try {
      const [wechatResp, telegramResp] = await Promise.all([
        api.get('/api/v1/ai/workspace/wechat-bind/status/'),
        showTelegram
          ? api.get('/api/v1/ai/workspace/telegram-bind/status/')
          : Promise.resolve(null),
      ])
      const wechatData = wechatResp.data?.data || wechatResp.data || {}
      setWechatItem({
        channel: 'wechat',
        status: mapWechatStatus(String(wechatData.status || 'unbound')),
        external_id_masked: String(wechatData.account_id_masked || ''),
      })
      setBindIsOwner(Boolean(wechatData.is_owner))
      if (telegramResp) {
        const telegramData = telegramResp.data?.data || telegramResp.data || {}
        setTelegramItem({
          channel: 'telegram',
          status: mapWechatStatus(String(telegramData.status || 'unbound')),
          external_id_masked: String(
            telegramData.external_id_masked || telegramData.bot_username || '',
          ),
        })
      }
      else {
        setTelegramItem(null)
      }
    }
    catch {
      setWechatItem(null)
      setTelegramItem(null)
      setBindIsOwner(false)
    }
    finally {
      setBindLoading(false)
    }
  }, [showTelegram])

  useQuery({
    queryKey: ['workbench', 'bind-status', showTelegram],
    queryFn: async () => {
      await loadBindStatus()
      return true
    },
  })

  const bindStatusText = useCallback((item: BindingStatusItem | null): string => {
    if (!item) return t('common.bind.unbound')
    if (item.status === 'bound') return item.external_id_masked || t('common.bind.bound')
    if (item.status === 'pending') return t('common.bind.pending')
    return t('common.bind.unbound')
  }, [t])

  const openBindDialog = useCallback((channel: BindChannel) => {
    if (!bindIsOwner) {
      toast({ title: t('common.bind.permissionDenied'), description: t('common.bind.contactAdmin') })
      return
    }
    setBindChannel(channel)
    setDialogOpen(true)
  }, [bindIsOwner, t])

  const runtimeStatus = runtimeQuery.data ?? null
  const wallet = walletQuery.data ?? null
  const subscription = subscriptionQuery.data?.subscription ?? null
  const partnerOverview = partnerQuery.data ?? null
  const standaloneConfigured = Boolean(standaloneQuery.data?.configured)
  const kefuConfigured = (kefuStoresQuery.data?.length || 0) > 0
  const socialAccounts = socialAccountsQuery.data?.items || []
  const socialBound = countLinkedSocialPlatforms(socialAccounts)
  const socialTotal = SOCIAL_PLATFORM_OPTIONS.length

  const networkQuotaGb = Number(wallet?.network?.quota_gb || 0)
  const storageTotalGb = numericOrNull(wallet?.storage?.total_gb)
    ?? (numericOrNull(wallet?.storage?.total_bytes) === null
      ? null
      : Number((Number(wallet?.storage?.total_bytes) / (1024 ** 3)).toFixed(2)))
  const storageAvailableBytes = numericOrNull(wallet?.storage?.available_bytes)

  const cards = useMemo<StatusCardModel[]>(() => {
    const smartSpace = runtimeStatus?.smart_space
    const assistantChannel = runtimeStatus?.assistant_channel
    const planName = displayPlanName(subscription?.plan?.code || '', locale)
    const membershipValue = planName
      ? tpl(
          'common.workbench.status.membershipValue',
          planName,
          formatExpiry(subscription?.current_period_end, localeTag),
        )
      : t('common.workbench.status.membershipNone')

    const pointsValue = tpl(
      'common.workbench.status.pointsValue',
      Number(wallet?.wallet.balance_points || 0).toLocaleString(localeTag),
    )

    const trafficValue = networkQuotaGb > 0
      ? fmtGbFromBytes(Number(wallet?.network?.remaining_bytes || 0))
      : t('account.common.unlimited', '不限')

    let storageValue = t('account.billing.storageNotReported', '未上报')
    if (storageTotalGb !== null && storageTotalGb <= 0) {
      storageValue = t('account.billing.notActivated', '未开通')
    }
    else if (storageAvailableBytes !== null) {
      storageValue = fmtGbFromBytes(storageAvailableBytes)
    }

    const partnerCount = Number(partnerOverview?.referral_reward_summary?.referral_count || 0)
    const smartSpaceTone = runtimeTone(smartSpace)
    const channelTone = runtimeTone(assistantChannel)
    const standaloneTone = standaloneConfigured ? 'ok' : 'warn'
    const kefuTone = kefuConfigured ? 'ok' : 'warn'
    const socialTone = socialBound >= socialTotal && socialTotal > 0 ? 'ok' : socialBound > 0 ? 'pending' : 'warn'
    const wechatTone = wechatItem?.status === 'bound' ? 'ok' : wechatItem?.status === 'pending' ? 'pending' : 'warn'
    const membershipTone = subscription?.status === 'active' || subscription?.status === 'trialing' ? 'ok' : 'warn'
    const pointsTone = Number(wallet?.wallet.balance_points || 0) > 0 ? 'ok' : 'warn'
    const storageTone = storageAvailableBytes !== null && storageAvailableBytes > 0 ? 'ok' : 'neutral'
    const partnersTone = partnerCount > 0 ? 'ok' : 'neutral'

    const list: StatusCardModel[] = [
      {
        id: 'smart-space',
        category: 'runtime',
        titleKey: 'common.workbench.status.smartSpace',
        coverClass: 'is-smart-space',
        icon: Database,
        tag: localizedMarkerLabel(smartSpace, t),
        desc: isWorkspaceReclaimed(runtimeQuery.data)
          ? t('common.workspace.reclaimedDesc', '工作区实例已进入退还状态，续费会员后可恢复使用。')
          : t('common.workbench.status.smartSpaceDesc', '专属智能化工作空间运行状态'),
        meta: isWorkspaceReclaimed(runtimeQuery.data)
          ? t('common.workspace.renewRestoreCta', '续费恢复')
          : undefined,
        tone: isWorkspaceReclaimed(runtimeQuery.data) ? 'warn' : smartSpaceTone,
        clickable: isWorkspaceReclaimed(runtimeQuery.data),
        onClick: isWorkspaceReclaimed(runtimeQuery.data) ? () => navigate('/workbench/pricing') : undefined,
        loading: runtimeQuery.isLoading && !smartSpace,
      },
      {
        id: 'assistant-channel',
        category: 'runtime',
        titleKey: 'common.workbench.status.assistantChannel',
        coverClass: 'is-assistant-channel',
        icon: Radio,
        tag: localizedMarkerLabel(assistantChannel, t),
        desc: t('common.workbench.status.assistantChannelDesc', 'Hermes 对话通道连接状态'),
        tone: channelTone,
        loading: runtimeQuery.isLoading && !assistantChannel,
      },
      {
        id: 'standalone-site',
        category: 'business',
        titleKey: 'common.workbench.status.standaloneSite',
        coverClass: 'is-standalone-site',
        icon: Globe2,
        tag: standaloneConfigured
          ? t('common.workbench.status.configured')
          : t('common.workbench.status.notConfigured'),
        desc: t('common.workbench.status.standaloneSiteDesc', '独立站管理账户与官网配置'),
        meta: t('common.workbench.status.actionStandalone', '前往独立站'),
        tone: standaloneTone,
        clickable: true,
        loading: standaloneQuery.isLoading,
        onClick: () => navigate('/workbench/standalone-site'),
      },
      {
        id: 'kefu',
        category: 'business',
        titleKey: 'common.workbench.status.kefu',
        coverClass: 'is-kefu',
        icon: Headphones,
        tag: kefuConfigured
          ? t('common.workbench.status.configured')
          : t('common.workbench.status.notConfigured'),
        desc: t('common.workbench.status.kefuDesc', '客服店铺与接入配置'),
        meta: t('common.workbench.status.actionKefu', '前往客服设置'),
        tone: kefuTone,
        clickable: true,
        loading: kefuStoresQuery.isLoading,
        onClick: () => navigate('/workbench/kefu/settings'),
      },
      {
        id: 'social-posting',
        category: 'business',
        titleKey: 'common.workbench.status.socialPosting',
        coverClass: 'is-social-posting',
        icon: Share2,
        tag: tpl('common.workbench.status.socialBound', String(socialBound), String(socialTotal)),
        desc: socialBound >= socialTotal
          ? t('common.workbench.status.socialComplete')
          : t('common.workbench.status.socialIncomplete'),
        meta: t('common.workbench.status.actionSocial', '前往站外绑定'),
        tone: socialTone,
        clickable: true,
        loading: socialAccountsQuery.isLoading,
        onClick: () => navigate('/workbench/automation/social'),
      },
      {
        id: 'wechat-bind',
        category: 'business',
        titleKey: 'common.workbench.status.wechatBind',
        coverClass: 'is-wechat-bind',
        icon: MessageCircle,
        tag: bindLoading ? t('common.bind.loading') : bindStatusText(wechatItem),
        desc: t('common.workbench.status.wechatBindDesc', 'Hermes 微信个人消息通道'),
        meta: t('common.workbench.status.actionBind', '点击绑定'),
        tone: wechatTone,
        clickable: true,
        onClick: () => openBindDialog('wechat'),
      },
      {
        id: 'membership',
        category: 'account',
        titleKey: 'common.workbench.status.membership',
        coverClass: 'is-membership',
        icon: Crown,
        tag: planName || t('common.workbench.status.membershipNone'),
        desc: membershipValue,
        meta: t('common.workbench.status.actionPricing', '前往套餐充值'),
        tone: membershipTone,
        clickable: true,
        loading: subscriptionQuery.isLoading,
        onClick: () => navigate('/workbench/pricing'),
      },
      {
        id: 'points',
        category: 'account',
        titleKey: 'common.workbench.status.points',
        coverClass: 'is-points',
        icon: Coins,
        tag: pointsValue,
        desc: t('common.workbench.status.pointsDesc', '可用于平台 AI 与服务消耗'),
        tone: pointsTone,
        loading: walletQuery.isLoading,
      },
      {
        id: 'traffic',
        category: 'account',
        titleKey: 'common.workbench.status.traffic',
        coverClass: 'is-traffic',
        icon: Wifi,
        tag: trafficValue,
        desc: t('common.workbench.status.trafficDesc', '当前计费周期剩余网络流量'),
        tone: 'neutral',
        loading: walletQuery.isLoading,
      },
      {
        id: 'storage',
        category: 'account',
        titleKey: 'common.workbench.status.storage',
        coverClass: 'is-storage',
        icon: HardDrive,
        tag: storageValue,
        desc: t('common.workbench.status.storageDesc', '素材与文件可用储存空间'),
        tone: storageTone,
        loading: walletQuery.isLoading,
      },
      {
        id: 'partners',
        category: 'growth',
        titleKey: 'common.workbench.status.partners',
        coverClass: 'is-partners',
        icon: Users,
        tag: tpl('common.workbench.status.partnersCount', String(partnerCount)),
        desc: t('common.workbench.status.partnersDesc', '通过你的邀请码注册的伙伴'),
        meta: t('common.workbench.status.actionPartner', '前往伙伴计划'),
        tone: partnersTone,
        clickable: true,
        loading: partnerQuery.isLoading,
        onClick: () => navigate('/workbench/account?section=partner'),
      },
    ]

    if (showTelegram) {
      const telegramTone = telegramItem?.status === 'bound' ? 'ok' : telegramItem?.status === 'pending' ? 'pending' : 'warn'
      list.splice(6, 0, {
        id: 'telegram-bind',
        category: 'business',
        titleKey: 'common.workbench.status.telegramBind',
        coverClass: 'is-telegram-bind',
        icon: Send,
        tag: bindLoading ? t('common.bind.loading') : bindStatusText(telegramItem),
        desc: t('common.workbench.status.telegramBindDesc', 'Hermes Telegram 个人消息通道'),
        meta: t('common.workbench.status.actionBind', '点击绑定'),
        tone: telegramTone,
        clickable: true,
        onClick: () => openBindDialog('telegram'),
      })
    }

    return list
  }, [
    runtimeStatus,
    runtimeQuery.isLoading,
    standaloneConfigured,
    standaloneQuery.isLoading,
    kefuConfigured,
    kefuStoresQuery.isLoading,
    socialBound,
    socialTotal,
    socialAccountsQuery.isLoading,
    wechatItem,
    telegramItem,
    bindLoading,
    bindStatusText,
    subscription,
    subscriptionQuery.isLoading,
    wallet,
    walletQuery.isLoading,
    networkQuotaGb,
    storageTotalGb,
    storageAvailableBytes,
    partnerOverview,
    partnerQuery.isLoading,
    showTelegram,
    locale,
    localeTag,
    t,
    tpl,
    navigate,
    openBindDialog,
  ])

  const categorySections: Array<{ id: StatusCategory; titleKey: string }> = [
    { id: 'runtime', titleKey: 'common.workbench.status.category.runtime' },
    { id: 'business', titleKey: 'common.workbench.status.category.business' },
    { id: 'account', titleKey: 'common.workbench.status.category.account' },
    { id: 'growth', titleKey: 'common.workbench.status.category.growth' },
  ]

  return (
    <>
      <div className="wb-status-sections" aria-label={t('common.workbench.status.gridAria')}>
        {categorySections.map(section => {
          const sectionCards = cards.filter(card => card.category === section.id)
          if (sectionCards.length === 0) return null
          return (
            <section key={section.id} className="wb-status-section">
              <h2 className="wb-status-section__title">{t(section.titleKey)}</h2>
              <div className="wb-status-grid" role="list">
                {sectionCards.map(card => (
                  <StatusCard key={card.id} card={card} t={t} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <BindWizardDialog
        open={dialogOpen}
        initialChannel={bindChannel}
        onOpenChange={setDialogOpen}
        onBound={() => void loadBindStatus()}
        showTelegram={showTelegram}
        currentBindings={{ wechat: wechatItem, telegram: telegramItem }}
      />
    </>
  )
}
