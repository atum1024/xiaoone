import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@xiaoone/react-ui'
import { getChatKit } from '@xiaoone/chat-kit'
import { useNavigate } from 'react-router'
import { type IconName } from '../components/Icon'
import { RepositoryBusinessCard, type RepositoryCardAction } from '../components/RepositoryBusinessCard'
import { BillingAPI } from '../lib/billingApi'
import { fetchChannelRepositoryPackages, type ChannelSupportPackage } from '../lib/channelRepositoryApi'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { usePreferences } from '../app/preferences'
import { useAuthStore } from '../store/auth'
import { AcceleratorConfigDialog } from './AcceleratorConfigDialog'
import { SharedNetworkAssistantDialog } from './SharedNetworkAssistantDialog'
import { PlanUpgradeDialog } from '../components/PlanUpgradeDialog'
import { PARTNER_BRAND_COLORS } from '../lib/partnerBrands'
import './automation-repository-page.css'

type RepositoryKey = 'crossBorder' | 'app' | 'miniProgram' | 'icp'
type RepositoryTabKey = 'all' | RepositoryKey
type RepositoryAction = RepositoryCardAction
type RepositoryImageKey = 'servers' | 'sms' | 'acceleration' | 'adCard' | 'app' | 'miniProgram' | 'icp'
type RepositoryServiceType = ChannelSupportPackage['service_type']

interface RepositoryTab {
  key: RepositoryKey
  label: string
  title: string
  cards: RepositoryCard[]
}

interface RepositoryCard {
  id?: string
  title: string
  subtitle: string
  price: string
  badge: string
  tone: string
  color?: string
  icon: IconName
  imageKey?: RepositoryImageKey
  flag?: {
    src: string
    alt: string
  }
  specs: string[]
  actions: RepositoryAction[]
  configName?: string
  serviceSkuCode?: string
  packageCode?: string
  serviceType?: RepositoryServiceType
  packageId?: string
  bannerImageUrl?: string
  source?: 'static' | 'channel-support-api'
  externalSkuId?: string
  isComingSoon?: boolean
}

const ALL_REPOSITORY_TAB = {
  key: 'all' as const,
  label: '全部',
  title: '全部市场',
}

const ONE_TIME_PERMANENT_SPEC = '一次开通永久有效'
const APP_STORE_CONSULTATION_SPEC = '99 元咨询费'
const SHARED_NETWORK_SPECS = ['美国原生 IP', 'OpenAI 营销训练', 'TikTok 广告投流']

const BRAND_COLORS = {
  alipay: PARTNER_BRAND_COLORS.alipay,
  wechat: PARTNER_BRAND_COLORS.wechat,
  googleplay: '#414141',
  xiaomi: '#FF6900',
  oppo: '#2D683D',
  vivo: '#415FFF',
  huawei: '#FF0000',
  appstore: '#0D96F6',
  tiktok: '#000000',
  telegram: PARTNER_BRAND_COLORS.telegram,
  visa: '#1A1F71',
  mastercard: '#EB001B',
} as const

const SMS_FLAG_META = {
  us: { src: '/repository-flags/us.svg', alt: '美国国旗', color: '#3C3B6E' },
  gb: { src: '/repository-flags/gb.svg', alt: '英国国旗', color: '#012169' },
  il: { src: '/repository-flags/il.svg', alt: '以色列国旗', color: '#0038B8' },
  id: { src: '/repository-flags/id.svg', alt: '印度尼西亚国旗', color: '#FF0000' },
  nl: { src: '/repository-flags/nl.svg', alt: '荷兰国旗', color: '#21468B' },
  ca: { src: '/repository-flags/ca.svg', alt: '加拿大国旗', color: '#FF0000' },
} as const

function smsFlagMetaForCode(countryCode: string) {
  const code = countryCode.trim().toLowerCase()
  return code in SMS_FLAG_META ? SMS_FLAG_META[code as keyof typeof SMS_FLAG_META] : undefined
}

function metadataText(pkg: ChannelSupportPackage, key: string): string {
  const value = pkg.metadata?.[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function metadataTextList(pkg: ChannelSupportPackage, key: string): string[] {
  const value = pkg.metadata?.[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

function currencyPrefix(currency: string): string {
  if (currency === 'CNY') return '¥'
  if (currency === 'USD') return '$'
  return `${currency} `
}

function displayAmount(value: string): string {
  return value.replace(/\.00$/, '')
}

function periodSuffix(period: string): string {
  if (period === 'monthly') return '月'
  if (period === 'quarterly') return '季'
  if (period === 'yearly') return '年'
  if (period === 'one_time') return '买断'
  if (period === 'starting_one_time') return '起买断'
  if (period === 'consultation') return '咨询费'
  return period || '期'
}

function periodSpec(period: string): string {
  if (period === 'monthly') return '月付套餐'
  if (period === 'quarterly') return '季付套餐'
  if (period === 'yearly') return '年付套餐'
  if (period === 'one_time') return ONE_TIME_PERMANENT_SPEC
  if (period === 'starting_one_time') return ONE_TIME_PERMANENT_SPEC
  if (period === 'consultation') return APP_STORE_CONSULTATION_SPEC
  return `${period || '标准'}套餐`
}

function packagePriceLabel(pkg: ChannelSupportPackage): string {
  const price = `${currencyPrefix(pkg.currency)}${displayAmount(pkg.price_amount)}`
  const suffix = periodSuffix(pkg.billing_period)
  if (pkg.billing_period === 'monthly' || pkg.billing_period === 'quarterly' || pkg.billing_period === 'yearly') {
    return `${price}/${suffix}`
  }
  return `${price} ${suffix}`
}

function isZeroPrice(value: string): boolean {
  const n = Number(value)
  return Number.isFinite(n) && n === 0
}

function smsPackageToCard(pkg: ChannelSupportPackage, index: number): RepositoryCard {
  const countryCode = metadataText(pkg, 'country_code') || pkg.code.replace(/^sms[-_]/, '').slice(0, 8).toUpperCase()
  const country = metadataText(pkg, 'country')
  const price = packagePriceLabel(pkg)
  const flag = smsFlagMetaForCode(countryCode)
  const locationLabel = [country, countryCode].filter(Boolean).join(' · ')
  return {
    id: pkg.id,
    title: pkg.name,
    subtitle: pkg.description || locationLabel || '短信验证码接收',
    price,
    badge: countryCode || 'SMS',
    tone: String((226 + index * 34) % 360),
    color: flag?.color,
    icon: index % 2 === 0 ? 'message' : 'message-square',
    imageKey: 'sms',
    flag,
    specs: [
      periodSpec(pkg.billing_period),
      'OpenAPI 自动开通',
      '订单内查看短信',
    ],
    actions: ['numbers'],
    source: 'channel-support-api',
    serviceType: pkg.service_type,
    packageId: pkg.id,
    packageCode: pkg.code,
    bannerImageUrl: pkg.banner_image_url,
    externalSkuId: pkg.external_sku_id,
  }
}

function isUsSmsPackage(pkg: ChannelSupportPackage): boolean {
  const countryCode = metadataText(pkg, 'country_code').trim().toUpperCase()
  return countryCode === 'US' || pkg.code.toLowerCase().startsWith('sms-us') || pkg.name.includes('美国')
}

function isSharedNetworkPackage(pkg: ChannelSupportPackage): boolean {
  const networkMode = metadataText(pkg, 'network_mode').trim().toLowerCase()
  return networkMode === 'shared' || pkg.code.toLowerCase().includes('shared') || pkg.name.includes('共享')
}

function isDedicatedNetworkPackage(pkg: ChannelSupportPackage): boolean {
  const text = [
    metadataText(pkg, 'network_mode'),
    pkg.code,
    pkg.name,
    pkg.external_sku_id,
  ].join(' ').toLowerCase()
  return text.includes('dedicated')
}

function isGoogleOrAppleAppStorePackage(pkg: ChannelSupportPackage): boolean {
  const text = `${pkg.code} ${pkg.name} ${pkg.external_sku_id}`.toLowerCase()
  return text.includes('google') || text.includes('谷歌') || text.includes('apple') || text.includes('苹果') || text.includes('appstore')
}

function channelPackageToCard(pkg: ChannelSupportPackage, index: number, imageKey: RepositoryImageKey): RepositoryCard {
  const price = packagePriceLabel(pkg)
  const isSharedNetwork = pkg.service_type === 'mkt-cdn' && isSharedNetworkPackage(pkg)
  const sharedNetworkIsFree = isSharedNetwork && isZeroPrice(pkg.price_amount)
  const metadataSpecs = metadataTextList(pkg, 'specs')
  const specs = isSharedNetwork ? SHARED_NETWORK_SPECS : metadataSpecs.length ? metadataSpecs : [
    periodSpec(pkg.billing_period),
    pkg.provider_name || pkg.external_sku_id || pkg.code,
    pkg.external_sku_id ? `SKU ${pkg.external_sku_id}` : '平台渠道支持',
  ].filter(Boolean)
  return {
    id: pkg.id,
    packageId: pkg.id,
    packageCode: pkg.service_type === 'mkt-cdn' && metadataText(pkg, 'network_mode')
      ? metadataText(pkg, 'network_mode')
      : pkg.code,
    title: pkg.name,
    subtitle: pkg.description || pkg.provider_name || '平台已配置渠道服务',
    price: sharedNetworkIsFree ? '会员免费' : price,
    badge: sharedNetworkIsFree ? '会员专属' : (pkg.service_type_label || pkg.code),
    tone: String((210 + index * 28) % 360),
    color: metadataText(pkg, 'brand_color') || undefined,
    icon: iconForServiceType(pkg.service_type),
    imageKey,
    bannerImageUrl: pkg.banner_image_url,
    specs,
    actions: pkg.service_type === 'mkt-cdn'
      ? ['configure', 'download']
      : pkg.service_type === 'ad-card'
        ? ['cards', 'transactions']
        : ['buy', 'chat'],
    configName: metadataText(pkg, 'config_name') || metadataText(pkg, 'ovpn_name') || undefined,
    serviceSkuCode: pkg.service_type === 'mkt-cdn' && metadataText(pkg, 'network_mode')
      ? `network-acceleration-${metadataText(pkg, 'network_mode')}`
      : undefined,
    serviceType: pkg.service_type,
    source: 'channel-support-api',
    externalSkuId: pkg.external_sku_id,
  }
}

function iconForServiceType(serviceType: RepositoryServiceType): IconName {
  if (serviceType === 'server') return 'server'
  if (serviceType === 'sms') return 'message'
  if (serviceType === 'mkt-cdn') return 'globe'
  if (serviceType === 'ad-card') return 'marketing'
  if (serviceType === 'app-store') return 'brand-appstore'
  if (serviceType === 'mini-program') return 'brand-wechat'
  return 'file'
}

const REPOSITORY_TABS: RepositoryTab[] = [
  {
    key: 'crossBorder',
    label: '跨境电商',
    title: '跨境电商市场',
    cards: [
      {
        title: '美国号码',
        subtitle: '国家二字码 US，截图结算价 $5.30',
        price: '$5.30/月',
        badge: 'US',
        tone: '226',
        color: SMS_FLAG_META.us.color,
        icon: 'message',
        imageKey: 'sms',
        flag: SMS_FLAG_META.us,
        specs: ['月付套餐', '外部 API 号码', '订单内查看短信'],
        actions: ['numbers'],
      },
      {
        title: '加速器',
        subtitle: '适合电商团队日常访问广告后台、选品工具、店铺后台和海外站点巡检',
        price: '会员免费',
        badge: '会员专属',
        tone: '198',
        icon: 'globe',
        imageKey: 'acceleration',
        specs: SHARED_NETWORK_SPECS,
        actions: ['configure', 'download'],
        configName: 'xiaoone-ecommerce-shared-network.txt',
        serviceSkuCode: 'network-acceleration-shared',
        packageCode: 'shared',
      },
      {
        title: '支付卡',
        subtitle: '5378 卡段覆盖 AI 云服务、跨境电商、海外办公与主流支付等 41 个平台，可在支付卡中心选择卡段后查看支持清单',
        price: '去支付卡中心',
        badge: '5378 卡段',
        tone: '28',
        icon: 'brand-visa',
        imageKey: 'adCard',
        specs: ['5378 支持平台清单', '跨境支付通道', '开卡与交易管理'],
        actions: ['cards', 'transactions'],
        serviceType: 'ad-card',
      },
    ],
  },
  {
    key: 'app',
    label: 'app上架',
    title: 'app上架市场',
    cards: [
      {
        title: 'Google Play 上架',
        subtitle: '开发者账号、隐私政策、测试轨道与正式发布',
        price: '¥1200 买断',
        badge: 'Google',
        tone: '152',
        color: BRAND_COLORS.googleplay,
        icon: 'brand-googleplay',
        specs: ['资料清单', '审核跟进', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '小米应用商店',
        subtitle: '国内安卓市场基础资料与类目审核',
        price: '¥99 咨询费',
        badge: '小米',
        tone: '44',
        color: BRAND_COLORS.xiaomi,
        icon: 'brand-xiaomi',
        specs: ['账号协助', '软著资料提醒', APP_STORE_CONSULTATION_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: 'OPPO 软件商店',
        subtitle: '应用资质、隐私合规与版本发布',
        price: '¥99 咨询费',
        badge: 'OPPO',
        tone: '166',
        color: BRAND_COLORS.oppo,
        icon: 'brand-oppo',
        specs: ['资料校验', '截图规范', APP_STORE_CONSULTATION_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: 'vivo 应用商店',
        subtitle: '安卓包审核、类目选择与上架跟进',
        price: '¥99 咨询费',
        badge: 'vivo',
        tone: '232',
        color: BRAND_COLORS.vivo,
        icon: 'brand-vivo',
        specs: ['签名检查', '隐私检测', APP_STORE_CONSULTATION_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '华为 AppGallery',
        subtitle: '华为开发者后台、资质材料与版本提交',
        price: '¥99 咨询费',
        badge: '华为',
        tone: '18',
        color: BRAND_COLORS.huawei,
        icon: 'brand-huawei',
        specs: ['账号主体', '应用服务配置', APP_STORE_CONSULTATION_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '苹果 App Store',
        subtitle: '证书、TestFlight、App Review 与商店资料',
        price: '¥1800 买断',
        badge: 'Apple',
        tone: '276',
        color: BRAND_COLORS.appstore,
        icon: 'brand-appstore',
        specs: ['证书检查', '元数据整理', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
    ],
  },
  {
    key: 'miniProgram',
    label: '小程序上架',
    title: '小程序上架市场',
    cards: [
      {
        title: '微信小程序上架',
        subtitle: '主体认证、类目、隐私协议与提审发布',
        price: '¥1200 买断',
        badge: '微信',
        tone: '154',
        color: BRAND_COLORS.wechat,
        icon: 'brand-wechat',
        specs: ['认证资料', '类目选择', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '支付宝小程序上架',
        subtitle: '支付宝开放平台资料、支付能力与审核',
        price: '¥1100 买断',
        badge: '支付宝',
        tone: '226',
        color: BRAND_COLORS.alipay,
        icon: 'brand-alipay',
        specs: ['主体绑定', '能力开通', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '抖音小程序上架',
        subtitle: '抖音开放平台资质、内容合规与发布',
        price: '¥1300 买断',
        badge: '抖音',
        tone: '302',
        color: BRAND_COLORS.tiktok,
        icon: 'brand-tiktok',
        specs: ['类目资质', '内容审核', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: 'TG 机器人发布',
        subtitle: 'Telegram Bot 配置、命令菜单与回调地址',
        price: '¥699 买断',
        badge: 'TG Bot',
        tone: '204',
        color: BRAND_COLORS.telegram,
        icon: 'brand-telegram',
        specs: ['BotFather 配置', 'Webhook', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
    ],
  },
  {
    key: 'icp',
    label: '备案或收款',
    title: '备案或收款市场',
    cards: [
      {
        title: '开通域名',
        subtitle: 'com / cn / net 域名开通、DNS 解析和持有人信息',
        price: '¥99 起买断',
        badge: 'Domain',
        tone: '208',
        icon: 'globe',
        specs: ['域名检索', 'DNS 配置', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '辅助备案',
        subtitle: 'ICP备案资料清单、接入商信息与提交陪跑',
        price: '¥800 买断',
        badge: 'ICP',
        tone: '266',
        icon: 'file',
        specs: ['营业执照', '负责人信息', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '微信支付开通',
        subtitle: '商户号申请、产品权限、API 证书与回调配置',
        price: '¥1200 买断',
        badge: '微信支付',
        tone: '148',
        color: BRAND_COLORS.wechat,
        icon: 'brand-wechat',
        specs: ['商户资料', '支付产品', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '支付宝支付开通',
        subtitle: '应用创建、支付能力签约与密钥配置',
        price: '¥1000 买断',
        badge: '支付宝',
        tone: '232',
        color: BRAND_COLORS.alipay,
        icon: 'brand-alipay',
        specs: ['应用资料', '能力签约', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: '海外 Visa 收款',
        subtitle: '海外卡收款资料、风控清单与结算路径确认',
        price: '¥1800 起买断',
        badge: 'Visa',
        tone: '38',
        color: BRAND_COLORS.visa,
        icon: 'brand-visa',
        specs: ['资料预审', '通道匹配', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
      {
        title: 'Mastercard 收款',
        subtitle: '万事达卡支付能力、商户资料和回调配置',
        price: '¥1800 起买断',
        badge: 'Mastercard',
        tone: '12',
        color: BRAND_COLORS.mastercard,
        icon: 'brand-mastercard',
        specs: ['海外主体', '卡组织支付', ONE_TIME_PERMANENT_SPEC],
        actions: ['buy', 'chat'],
      },
    ],
  },
]

function replaceCardsByImageKey(cards: RepositoryCard[], imageKey: RepositoryImageKey, replacement: RepositoryCard[]) {
  const first = cards.findIndex(card => card.imageKey === imageKey)
  if (first === -1) return cards
  let last = first
  while (last + 1 < cards.length && cards[last + 1].imageKey === imageKey) last += 1
  return [...cards.slice(0, first), ...replacement, ...cards.slice(last + 1)]
}

function replaceTabCards(tabs: RepositoryTab[], tabKey: RepositoryKey, cards: RepositoryCard[]) {
  if (!cards.length) return tabs
  return tabs.map(tab => tab.key === tabKey ? { ...tab, cards } : tab)
}

function replaceTabCardsByImageKey(tabs: RepositoryTab[], tabKey: RepositoryKey, imageKey: RepositoryImageKey, cards: RepositoryCard[]) {
  if (!cards.length) return tabs
  return tabs.map(tab => tab.key === tabKey ? { ...tab, cards: replaceCardsByImageKey(tab.cards, imageKey, cards) } : tab)
}

function imageKeyForCard(tabKey: RepositoryKey, card: RepositoryCard): RepositoryImageKey {
  if (card.imageKey) return card.imageKey
  if (tabKey === 'crossBorder') return 'servers'
  return tabKey
}

function serviceTypeForCard(tabKey: RepositoryKey, card: RepositoryCard): RepositoryServiceType {
  if (card.serviceType) return card.serviceType
  const imageKey = imageKeyForCard(tabKey, card)
  if (imageKey === 'servers') return 'server'
  if (imageKey === 'sms') return 'sms'
  if (imageKey === 'acceleration') return 'mkt-cdn'
  if (imageKey === 'adCard') return 'ad-card'
  if (tabKey === 'app') return 'app-store'
  if (tabKey === 'miniProgram') return 'mini-program'
  return 'icp'
}

function isSharedNetworkCode(code: string | undefined): boolean {
  if (code === 'shared') return true
  const normalized = String(code || '').toLowerCase()
  return normalized.includes('shared')
}

function isSharedNetworkCard(card: RepositoryCard): boolean {
  return String(card.serviceSkuCode || '').toLowerCase().includes('shared') || isSharedNetworkCode(card.packageCode)
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''))
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] ? decodeURIComponent(plainMatch[1]) : fallback
}

export function AutomationRepositoryPage() {
  const { t, tpl } = usePreferences()
  const [activeKey, setActiveKey] = useState<RepositoryTabKey>('all')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [acceleratorDialogOpen, setAcceleratorDialogOpen] = useState(false)
  const [networkUpgradeOpen, setNetworkUpgradeOpen] = useState(false)
  const [resourceTabs, setResourceTabs] = useState<RepositoryTab[]>(() => REPOSITORY_TABS)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const currentMerchantId = useAuthStore(state => state.currentMerchantId)
  const authPlanCode = useAuthStore(state => state.subscriptionPlanCode)
  const mid = Number(currentMerchantId || 0)
  const profilesQ = useQuery({
    queryKey: ['network-acceleration-profiles'],
    queryFn: () => BillingAPI.networkAccelerationProfiles(),
  })
  const subscriptionQ = useQuery({
    enabled: mid > 0,
    queryKey: ['current-subscription', mid],
    queryFn: () => BillingAPI.currentSubscription(mid),
  })
  const repositoryTabs = useMemo(() => [
    {
      ...ALL_REPOSITORY_TAB,
      label: t('automation.repo.all'),
      title: t('automation.repo.allMarket'),
    },
    ...resourceTabs.map(tab => ({
      ...tab,
      label: t(`automation.repo.tab.${tab.key}`),
      title: t(`automation.repo.tab.${tab.key}Title`),
    })),
  ], [resourceTabs, t])
  const activeTab = repositoryTabs.find(tab => tab.key === activeKey) || repositoryTabs[0]
  const activeCards = activeKey === 'all'
    ? resourceTabs.flatMap(tab => tab.cards.map(card => ({ tabKey: tab.key, card })))
    : activeTab.key === 'all'
      ? []
      : activeTab.cards.map(card => ({ tabKey: activeTab.key, card }))
  const sharedProfiles = useMemo(() => {
    const rows = (profilesQ.data?.items || []).filter(item => item.package_code === 'shared')
    return rows.sort((a, b) => a.slot_index - b.slot_index)
  }, [profilesQ.data?.items])
  useLocalizedTopbarSlot(() => ({
    className: 'mr-topbar--repo-tabs',
    leading: (
      <nav className="repo-tabs repo-tabs--topbar" role="tablist" aria-label={t('automation.repo.tabsAria')}>
        {repositoryTabs.map(tab => (
          <button
            key={tab.key}
            ref={node => {
              tabRefs.current[tab.key] = node
            }}
            type="button"
            role="tab"
            className={activeTab.key === tab.key ? 'is-active' : ''}
            aria-selected={activeTab.key === tab.key}
            onClick={() => setActiveKey(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    ),
  }), [activeTab.key, repositoryTabs])

  useEffect(() => {
    tabRefs.current[activeKey]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeKey])

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      fetchChannelRepositoryPackages('sms'),
      fetchChannelRepositoryPackages('mkt-cdn'),
      fetchChannelRepositoryPackages('app-store'),
      fetchChannelRepositoryPackages('mini-program'),
      fetchChannelRepositoryPackages('icp'),
    ])
      .then((results) => {
        if (cancelled) return
        const [sms, acceleration, appStore, miniPrograms, icp] = results.map(result => result.status === 'fulfilled' ? result.value : [])
        const visibleSms = sms.filter(isUsSmsPackage)
        const visibleAcceleration = acceleration.filter(pkg => !isDedicatedNetworkPackage(pkg))
        setResourceTabs((tabs) => {
          let next = tabs
          next = replaceTabCardsByImageKey(next, 'crossBorder', 'sms', visibleSms.map(smsPackageToCard))
          next = replaceTabCardsByImageKey(next, 'crossBorder', 'acceleration', visibleAcceleration.map((pkg, index) => channelPackageToCard(pkg, index, 'acceleration')))
          next = replaceTabCards(next, 'app', appStore.map((pkg, index) => channelPackageToCard(pkg, index, 'app')))
          next = replaceTabCards(next, 'miniProgram', miniPrograms.map((pkg, index) => channelPackageToCard(pkg, index, 'miniProgram')))
          next = replaceTabCards(next, 'icp', icp.map((pkg, index) => channelPackageToCard(pkg, index, 'icp')))
          return next
        })
      })
      .catch(() => {
        // Keep static fallback cards when backend or credentials are not ready.
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRepositoryAction(action: RepositoryAction, card: RepositoryCard, tabKey: RepositoryKey) {
    if (card.isComingSoon) {
      toast({ title: tpl('automation.repo.toast.comingSoon', card.title), description: '该服务正在准备中，可先点击对话登记需求。' })
      return
    }

    if (action === 'numbers') {
      navigate('/workbench/generation-assets?tab=numbers')
      return
    }

    if (action === 'sms') {
      navigate('/workbench/generation-assets?tab=numbers')
      return
    }

    if (action === 'cards') {
      navigate('/workbench/generation-assets?tab=ad-card')
      return
    }

    if (action === 'transactions') {
      navigate('/workbench/generation-assets?tab=ad-card&dcpay=open')
      return
    }

    if (isSharedNetworkCard(card)) {
      if (action === 'buy' || action === 'configure') {
        setAcceleratorDialogOpen(true)
        return
      }
      if (action === 'download') {
        await downloadSharedNetwork()
        return
      }
      if (action === 'chat') {
        setAssistantOpen(true)
        return
      }
    }

    if (action === 'download') {
      toast({ title: t('automation.repo.toast.noOvpn'), description: '当前套餐未开放 3x-ui 配置文件下载，请先通过对话确认接入方式。' })
      return
    }

    if (action === 'chat') {
      await openChannelConversation(card, tabKey)
      return
    }

    if (action === 'buy' && card.serviceType === 'sms') {
      navigate('/workbench/generation-assets?tab=numbers')
      return
    }

    if (action === 'buy' && (card.serviceType === 'ad-card' || card.imageKey === 'adCard')) {
      navigate('/workbench/generation-assets?tab=ad-card')
      return
    }

    if (action === 'buy' && card.serviceSkuCode) {
      toast({
        title: '付费开通即将上线',
        description: '请前往「平台账户」使用优惠码充值，或联系客服协助开通。',
      })
      return
    }

    toast({
      title: `开通：${card.title}`,
      description: card.source === 'channel-support-api'
        ? `${card.price}，已接入渠道市场 SKU：${card.externalSkuId || card.id || '未提供'}。`
        : `${card.price}，已预留开通入口，后续可接入 billing service 下单。`,
    })
  }

  async function downloadSharedNetwork() {
    const profile = sharedProfiles.find(item => item.status === 'active') || sharedProfiles[0]
    if (!profile) {
      toast({ title: '请先智能配置加速器', description: '配置成功后可下载共享加速器 3x-ui 配置文件。' })
      return
    }
    try {
      const response = await BillingAPI.downloadSharedNetworkConfigSlot(profile.slot_index)
      if (response.status === 202) {
        toast({ title: '共享网络准备中', description: '3x-ui 配置文件正在生成，请稍后再试。' })
        return
      }
      const fallbackName = profile.config_filename || profile.ovpn_filename || 'xiaoone-shared-network.txt'
      const fileName = filenameFromDisposition(response.headers['content-disposition'], fallbackName)
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: String(response.headers?.['content-type'] || 'text/plain; charset=utf-8') })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast({ title: '配置文件下载已开始', description: fileName })
      qc.invalidateQueries({ queryKey: ['network-acceleration-profiles'] })
    } catch (e: any) {
      if (e?.response?.status === 402) {
        setNetworkUpgradeOpen(true)
        return
      }
      if (e?.response?.status === 409) {
        toast({ title: '请先开通共享网络', description: '开通成功后即可下载最新 3x-ui 配置文件。' })
        return
      }
      toast({ title: '配置文件下载失败', description: e?.response?.data?.message || e?.message || '请稍后重试' })
    }
  }

  async function openChannelConversation(card: RepositoryCard, tabKey: RepositoryKey) {
    const serviceType = serviceTypeForCard(tabKey, card)
    const title = card.title
    try {
      const { AgentThreadAPI, ServiceCaseAPI } = getChatKit()
      const existing = await AgentThreadAPI.list({ domain: 'support', page_size: 80 })
      let thread = existing.items.find(item => item.plugin_key === serviceType && item.title === title)
      if (!thread) {
        thread = await AgentThreadAPI.create({
          domain: 'support',
          title,
          plugin_key: serviceType,
        })
      }
      try {
        await ServiceCaseAPI.create({
          thread: thread.id,
          service_type: serviceType,
          title,
          domain: 'support',
        })
        toast({ title: `已进入对话：${title}`, description: '服务单已同步到平台端渠道支持处理台。' })
      } catch (e: any) {
        toast({
          title: `已打开对话：${title}`,
          description: e?.response?.data?.message || e?.message || '服务单暂未提交，请在对话页继续补充资料。',
        })
      }
      navigate(`/workbench/support/threads/${encodeURIComponent(thread.id)}`)
    } catch (e: any) {
      toast({ title: t('automation.repo.toast.chatFailed'), description: e?.message || '请稍后重试' })
    }
  }

  return (
    <section className="repo-page">
      <section className="repo-block">
        <div className="repo-card-grid" aria-label={activeTab.title}>
          {activeCards.map(({ tabKey, card }) => (
            <RepositoryBusinessCard
              key={`${tabKey}-${card.title}`}
              card={card}
              imageKey={imageKeyForCard(tabKey, card)}
              onAction={action => handleRepositoryAction(action, card, tabKey)}
            />
          ))}
        </div>
      </section>
      <AcceleratorConfigDialog
        open={acceleratorDialogOpen}
        onOpenChange={setAcceleratorDialogOpen}
        currentPlanCode={String(subscriptionQ.data?.subscription?.plan?.code || authPlanCode || '')}
        sharedReady={profilesQ.data?.shared_ready !== false}
        dedicatedReady={Boolean(profilesQ.data?.dedicated_ready)}
        onConfigured={() => qc.invalidateQueries({ queryKey: ['network-acceleration-profiles'] })}
      />
      <SharedNetworkAssistantDialog open={assistantOpen} onOpenChange={setAssistantOpen} />
      <PlanUpgradeDialog
        open={networkUpgradeOpen}
        onOpenChange={setNetworkUpgradeOpen}
        featureKey="network_acceleration"
        requiredPlanCode="startup"
      />
    </section>
  )
}
