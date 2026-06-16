import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { getChatKit, type AgentMaterialAsset } from '@xiaoone/chat-kit'
import { authFetch } from '../lib/authFetch'
import { describeAxiosError } from '../lib/apiErrors'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { Icon } from '../components/Icon'
import { SocialPlatformLogo } from '../components/SocialPlatformLogo'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { usePreferences } from '../app/preferences'
import {
  createSocialPack,
  deleteSocialPack,
  fetchPostAnalytics,
  fetchPostComments,
  listSocialPacks,
  postComment,
  publishSocialPack,
  quickPublishSocialPack,
  replyComment,
  scheduleSocialPack,
  updateSocialPack,
  type PlatformOptions,
  type SocialMaterialItem,
  type SocialMaterialItemPayload,
  type SocialMaterialPack,
  type SocialPackStatus,
  type SocialPostRecord,
} from '../lib/socialPackApi'
import {
  deleteSocialAccount,
  getPlatformCaps,
  listSocialAccounts,
  PLATFORM_BRAND_ICONS,
  PLATFORM_LABELS,
  PLATFORM_POST_CAPS,
  SOCIAL_PLATFORM_OPTIONS,
  startSocialLink,
  type SocialAccount,
} from '../lib/socialApi'
import { guidePrompt } from '../lib/socialBindGuide'
import { resolveWarehouseAssetPreview } from '../lib/warehouseAssets'
import './social-posting-page.css'

const STATUS_TAB_KEYS: { value: SocialPackStatus | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'automation.social.status.all' },
  { value: 'draft', labelKey: 'automation.social.status.draft' },
  { value: 'pending', labelKey: 'automation.social.status.pending' },
  { value: 'sent', labelKey: 'automation.social.status.sent' },
]

type AssetPickerTab = 'ai-image' | 'ai-video' | 'space'

const ASSET_PICKER_TAB_KEYS: { value: AssetPickerTab; labelKey: string }[] = [
  { value: 'ai-image', labelKey: 'automation.warehouse.tab.image' },
  { value: 'ai-video', labelKey: 'automation.warehouse.tab.video' },
  { value: 'space', labelKey: 'automation.warehouse.tab.space' },
]

interface QuickPostItem extends SocialMaterialItemPayload {
  preview_url?: string
  display_name?: string
}

interface QuickPostDraft {
  titleEnabled: boolean
  title: string
  bodyEnabled: boolean
  text: string
  mediaMode: 'image' | 'video'
  items: QuickPostItem[]
  platforms: string[]
  platformOptions: PlatformOptions
  channelAccountId: string
  scheduledAt: string
}

interface SocialAccountBinding {
  account: SocialAccount
  accountIndex: number
}

interface SocialPlatformAccountBinding extends SocialAccountBinding {
  platform: string
  username: string
}

function mediaItemKey(item: QuickPostItem, index: number): string {
  return item.attachment_id || item.text_content || `item-${index}`
}

function resolvePreviewSource(item: QuickPostItem): string {
  if (item.preview_url) return item.preview_url
  if (item.attachment_id) return `/api/v1/agent/attachments/${item.attachment_id}/download/`
  return ''
}

function activeMediaItems(draft: QuickPostDraft): QuickPostItem[] {
  return draft.items.filter(item => item.kind === draft.mediaMode)
}

const EMPTY_QUICK_POST: QuickPostDraft = {
  titleEnabled: true,
  title: '',
  bodyEnabled: true,
  text: '',
  mediaMode: 'image',
  items: [],
  platforms: [],
  platformOptions: {},
  channelAccountId: '',
  scheduledAt: '',
}

const STATUS_META: Record<SocialPackStatus, { label: string; hint: string }> = {
  draft: { label: '草稿', hint: '可继续编辑' },
  pending: { label: '待发送', hint: '已提交排期' },
  sent: { label: '已发送', hint: '发布完成' },
}

function platformLabel(value: string): string {
  return SOCIAL_PLATFORM_OPTIONS.find(option => option.value === value)?.label || value
}

function normalizeSocialPlatform(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

function cleanSocialUsername(value: unknown): string {
  return String(value || "").trim().replace(/^@+/, "")
}

function formatSocialUsername(username: string): string {
  const clean = cleanSocialUsername(username)
  return clean ? "@" + clean : ""
}

function socialAccountDisplayName(index: number, tr: (k: string, f?: string) => string, tplFn: (k: string, ...p: string[]) => string) {
  return index === 0 ? tr("automation.social.accountPrimary") : tplFn("automation.social.accountNth", String(index + 1))
}

function socialAccountPlatformUsername(account: SocialAccount, platform: string): string {
  const normalized = normalizeSocialPlatform(platform)
  const displayName = (account.extras?.display_names || []).find(item => normalizeSocialPlatform(item.platform) === normalized)
  return cleanSocialUsername(displayName?.username)
}

function socialAccountFallbackName(account: SocialAccount, index: number, tr: (k: string, f?: string) => string, tplFn: (k: string, ...p: string[]) => string): string {
  const title = String(account.extras?.title || "").trim()
  if (title && title !== "Ayrshare Primary Profile" && !title.startsWith("xiaoone-merchant-")) return title
  const name = String(account.name || "").trim()
  if (name && name !== "Ayrshare Primary Profile" && !/^merchant-\d+$/i.test(name)) return name
  return socialAccountDisplayName(index, tr, tplFn)
}

function socialPlatformBindingDetail(platform: string, binding: SocialPlatformAccountBinding | null | undefined, tr: (k: string, f?: string) => string, tplFn: (k: string, ...p: string[]) => string): string {
  if (!binding) return ""
  return formatSocialUsername(binding.username) || socialAccountFallbackName(binding.account, binding.accountIndex, tr, tplFn)
}

function packPostAccountDetail(
  pack: SocialMaterialPack,
  binding: SocialAccountBinding | null | undefined,
  fallbackBindings: SocialPlatformAccountBinding[],
  tr: (k: string, f?: string) => string,
  tplFn: (k: string, ...p: string[]) => string,
): string {
  if (!pack.channel_account_id) return "发布账号 未选择"
  const platformAccounts = (pack.platforms || [])
    .map(platform => {
      const explicitBinding: SocialPlatformAccountBinding | null = binding
        ? {
          ...binding,
          platform,
          username: socialAccountPlatformUsername(binding.account, platform),
        }
        : null
      const fallbackBinding = fallbackBindings.find(item => normalizeSocialPlatform(item.platform) === normalizeSocialPlatform(platform))
      const platformBinding = explicitBinding || fallbackBinding
      if (!platformBinding) return ""
      const detail = socialPlatformBindingDetail(platform, platformBinding, tr, tplFn)
      return detail ? platformLabel(platform) + " " + detail : ""
    })
    .filter(Boolean)
  const unique = Array.from(new Set(platformAccounts))
  if (unique.length === 1) return "发布账号 " + unique[0]
  if (unique.length > 1) {
    return "发布账号 " + unique.slice(0, 2).join("、") + (unique.length > 2 ? " 等 " + unique.length + " 个平台" : "")
  }
  if (binding) return "发布账号 " + socialAccountFallbackName(binding.account, binding.accountIndex, tr, tplFn)
  const fallbackBinding = fallbackBindings[0]
  if (fallbackBinding) return "发布账号 " + socialPlatformBindingDetail(fallbackBinding.platform, fallbackBinding, tr, tplFn)
  return "发布账号 未同步"
}

function socialAccountDetail(account: SocialAccount, tr: (k: string, f?: string) => string, tplFn: (k: string, ...p: string[]) => string): string {
  const displayNames = (account.extras?.display_names || [])
    .map(item => {
      const username = formatSocialUsername(cleanSocialUsername(item.username))
      if (!username) return ""
      const label = item.platform ? platformLabel(item.platform) : ""
      return label ? label + "：" + username : username
    })
    .filter(Boolean)
  if (displayNames.length) return displayNames.slice(0, 2).join(" · ")
  const platforms = account.extras?.linked_platforms || []
  if (platforms.length) return tplFn("automation.social.linkedPlatforms", platforms.map(platformLabel).slice(0, 3).join("、"))
  return tr("automation.social.waitAuth")
}

function formatSocialDate(value: string | null | undefined, tr: (k: string) => string): string {
  if (!value) return tr('automation.social.unscheduled')
  return new Date(value).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '--'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}m`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function latestPostForPack(pack: SocialMaterialPack): SocialPostRecord | null {
  return pack.latest_post || null
}

function normalizeSocialComment(raw: any, fallbackPlatform = ''): any {
  const source = raw && typeof raw === 'object' ? raw : {}
  const author = source.user || source.from || source.author || {}
  const sourceCommentId = source.commentId || source.comment_id || source.commentID || ''
  const ayrshareCommentId = source.id || source.ayrshareCommentId || ''
  const replies = Array.isArray(source.replies)
    ? source.replies.map((reply: any) => normalizeSocialComment(reply, fallbackPlatform))
    : []
  return {
    ...source,
    id: ayrshareCommentId || sourceCommentId,
    commentId: sourceCommentId,
    platform: source.platform || fallbackPlatform,
    text: source.text || source.comment || source.message || '',
    username: source.username || source.userName || source.displayName || author.username || author.name || author.screen_name || '',
    created: source.created || source.createdAt || source.created_at || source.date || '',
    likeCount: source.likeCount ?? source.likes ?? source.like_count,
    replies,
  }
}

const COMMENT_SNAPSHOT_SKIP_KEYS = new Set(['status', 'mock', 'id', 'refId', 'message', 'errors', 'commentCount'])

function extractCommentsFromSnapshotValue(value: unknown, platform = ''): any[] {
  if (Array.isArray(value)) {
    return value.map((comment: any) => normalizeSocialComment(comment, platform))
  }
  if (!value || typeof value !== 'object') return []
  const row = value as Record<string, unknown>
  if (Array.isArray(row.comments)) {
    return row.comments.map((comment: any) => normalizeSocialComment(comment, platform))
  }
  return []
}

function commentsFromSnapshot(snapshot: any): any[] {
  if (!snapshot || typeof snapshot !== 'object') return []
  if (Array.isArray(snapshot)) {
    return snapshot.map((comment: any) => normalizeSocialComment(comment))
  }
  if (Array.isArray(snapshot.comments)) {
    return snapshot.comments.map((comment: any) => normalizeSocialComment(comment))
  }
  const merged: any[] = []
  for (const [key, value] of Object.entries(snapshot)) {
    if (COMMENT_SNAPSHOT_SKIP_KEYS.has(key)) continue
    merged.push(...extractCommentsFromSnapshotValue(value, key))
  }
  return merged
}

function commentTimestamp(comment: any): number {
  const ts = Date.parse(String(comment?.created || ''))
  return Number.isFinite(ts) ? ts : 0
}

function flattenCommentsForDisplay(comments: any[]): any[] {
  const flat: any[] = []
  const walk = (items: any[], depth = 0) => {
    for (const item of items) {
      const replies = Array.isArray(item.replies) ? item.replies : []
      flat.push({ ...item, depth, replies })
      if (replies.length) walk(replies, depth + 1)
    }
  }
  walk(comments)
  return flat.sort((a, b) => commentTimestamp(b) - commentTimestamp(a))
}

function countDisplayComments(comments: any[]): number {
  return flattenCommentsForDisplay(comments).length
}

function platformPostUrlFromResult(result: Record<string, unknown>): string {
  const platform = String(result.platform || '').trim().toLowerCase()
  const directUrl = String(result.postUrl || result.post_url || result.url || '').trim()
  if (directUrl) return directUrl
  const statusId = String(result.id || '').trim()
  if (!statusId) return ''
  if (platform === 'twitter') return `https://x.com/i/status/${statusId}`
  if (platform === 'threads') return `https://www.threads.net/@_/post/${statusId}`
  return ''
}

function platformPostLinks(
  post: SocialPostRecord | null,
  analyticsSnap: Record<string, unknown>,
  platforms: string[],
): Array<{ platform: string; url: string }> {
  const links = new Map<string, string>()
  for (const result of post?.results || []) {
    if (!result || typeof result !== 'object') continue
    const platform = String(result.platform || '').trim().toLowerCase()
    const url = platformPostUrlFromResult(result as Record<string, unknown>)
    if (platform && url) links.set(platform, url)
  }
  for (const [platform, value] of Object.entries(analyticsSnap)) {
    if (!value || typeof value !== 'object') continue
    const row = value as Record<string, unknown>
    const url = String(row.postUrl || row.post_url || row.url || '').trim()
    if (url) links.set(platform.toLowerCase(), url)
  }
  return platforms
    .map(platform => {
      const url = links.get(platform.toLowerCase())
      return url ? { platform, url } : null
    })
    .filter((item): item is { platform: string; url: string } => Boolean(item))
}

function analyticsMetricValue(analytics: any, key: string): number | null {
  const value =
    analytics?.[key] ??
    analytics?.publicMetrics?.[key] ??
    analytics?.organicMetrics?.[key] ??
    analytics?.nonPublicMetrics?.[key]
  return typeof value === 'number' ? value : null
}

function materialKindLabel(item: SocialMaterialItem | SocialMaterialItemPayload, tr: (k: string) => string): string {
  if (item.kind === 'video') return tr('automation.social.kind.video')
  if (item.kind === 'text') return tr('automation.social.kind.text')
  return tr('automation.social.kind.image')
}

function platformEligibility(
  platform: string,
  draft: QuickPostDraft,
  linked: boolean,
): { eligible: boolean; reason: string } {
  if (!linked) return { eligible: false, reason: '未绑定' }
  const caps = getPlatformCaps(platform)
  const imageCount = draft.mediaMode === 'image'
    ? draft.items.filter(i => i.kind === 'image').length
    : 0
  const videoCount = draft.mediaMode === 'video'
    ? draft.items.filter(i => i.kind === 'video').length
    : 0

  if (draft.mediaMode === 'image') {
    if (!caps.videoSupported && imageCount === 0) {
      // ok, some platforms accept text-only
    }
    if (imageCount > caps.maxImages) {
      return { eligible: false, reason: `图片数 ${imageCount} 超过上限 ${caps.maxImages}` }
    }
    if (caps.mediaRequired && imageCount === 0 && !draft.text.trim()) {
      return { eligible: false, reason: '该平台要求至少包含媒体或正文' }
    }
  } else {
    // video mode
    if (!caps.videoSupported) {
      return { eligible: false, reason: '该平台不支持视频' }
    }
    if (caps.mediaRequired && videoCount === 0) {
      return { eligible: false, reason: '该平台要求上传视频' }
    }
  }

  // Title checks
  if (caps.titleRequired && !draft.titleEnabled) {
    return { eligible: false, reason: '该平台要求填写标题，请启用标题并填写' }
  }
  if (caps.titleRequired && draft.titleEnabled && !draft.title.trim()) {
    return { eligible: false, reason: '该平台要求标题不能为空' }
  }
  // Reddit requires subreddit
  if (platform === 'reddit' && !draft.platformOptions.subreddit?.trim()) {
    return { eligible: false, reason: 'Reddit 要求填写 Subreddit' }
  }

  return { eligible: true, reason: '' }
}

interface LoadAccountsOptions {
  silent?: boolean
}

// ---------- analytics field mapping ----------
const ANALYTICS_FIELDS: Record<string, Array<{ key: string; icon: string; label: string }>> = {
  bluesky:    [{ key: 'likeCount', icon: '❤️', label: '点赞' }, { key: 'repostCount', icon: '🔁', label: '转发' }, { key: 'replyCount', icon: '💬', label: '评论' }, { key: 'quoteCount', icon: '📝', label: '引用' }],
  facebook:   [{ key: 'likesCount', icon: '❤️', label: '点赞' }, { key: 'commentsCount', icon: '💬', label: '评论' }, { key: 'sharesCount', icon: '🔁', label: '分享' }, { key: 'impressionsUnique', icon: '👁', label: '浏览' }],
  instagram:  [{ key: 'likeCount', icon: '❤️', label: '点赞' }, { key: 'commentsCount', icon: '💬', label: '评论' }, { key: 'sharesCount', icon: '🔁', label: '分享' }, { key: 'savedCount', icon: '📌', label: '收藏' }, { key: 'reachCount', icon: '👁', label: '覆盖' }],
  linkedin:   [{ key: 'likeCount', icon: '❤️', label: '点赞' }, { key: 'commentCount', icon: '💬', label: '评论' }, { key: 'shareCount', icon: '🔁', label: '分享' }, { key: 'impressionCount', icon: '👁', label: '浏览' }],
  pinterest:  [{ key: 'saveCount', icon: '📌', label: '收藏' }, { key: 'commentCount', icon: '💬', label: '评论' }, { key: 'impressionCount', icon: '👁', label: '浏览' }],
  reddit:     [{ key: 'score', icon: '⭐', label: '得分' }, { key: 'numComments', icon: '💬', label: '评论' }, { key: 'upvoteRatio', icon: '📊', label: '好评率' }],
  threads:    [{ key: 'views', icon: '👁', label: '浏览' }, { key: 'likes', icon: '❤️', label: '点赞' }, { key: 'replies', icon: '💬', label: '回复' }, { key: 'reposts', icon: '🔁', label: '转发' }, { key: 'quotes', icon: '📝', label: '引用' }],
  tiktok:     [{ key: 'likeCount', icon: '❤️', label: '点赞' }, { key: 'commentCount', icon: '💬', label: '评论' }, { key: 'shareCount', icon: '🔁', label: '分享' }, { key: 'viewCount', icon: '👁', label: '浏览' }],
  twitter:    [{ key: 'likeCount', icon: '❤️', label: '点赞' }, { key: 'retweetCount', icon: '🔁', label: '转发' }, { key: 'replyCount', icon: '💬', label: '回复' }, { key: 'quoteCount', icon: '📝', label: '引用' }, { key: 'impressionCount', icon: '👁', label: '浏览' }],
  youtube:    [{ key: 'likeCount', icon: '❤️', label: '点赞' }, { key: 'commentCount', icon: '💬', label: '评论' }, { key: 'shareCount', icon: '🔁', label: '分享' }, { key: 'viewCount', icon: '👁', label: '观看' }],
}

const NO_ANALYTICS_PLATFORMS = new Set(['gmb', 'telegram'])
const SOCIAL_POSTING_PATH = '/workbench/automation/social'
const SOCIAL_BIND_REDIRECT_PATH = `${SOCIAL_POSTING_PATH}/bind-redirect`
const SOCIAL_BIND_START_TIMEOUT_MS = 30000

function sameOriginSocialReturnUrl(raw?: string | null): string {
  const fallback = `${window.location.origin}${SOCIAL_POSTING_PATH}`
  if (!raw) return fallback
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return `${url.origin}${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

function socialBindRedirectHref(): string {
  const redirect = sameOriginSocialReturnUrl(`${window.location.origin}${window.location.pathname}${window.location.search}`)
  const params = new URLSearchParams({ redirect })
  return `${SOCIAL_BIND_REDIRECT_PATH}?${params.toString()}`
}

function socialBindStartWithTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('social_bind_timeout')), SOCIAL_BIND_START_TIMEOUT_MS)
    promise.then(
      value => {
        window.clearTimeout(timer)
        resolve(value)
      },
      error => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function SocialBindRedirectPage() {
  const { t } = usePreferences()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const redirect = sameOriginSocialReturnUrl(params.get('redirect'))

    socialBindStartWithTimeout(startSocialLink(redirect))
      .then(start => {
        if (!cancelled) window.location.replace(start.linking_url)
      })
      .catch((err: any) => {
        if (cancelled) return
        const timedOut = err?.message === 'social_bind_timeout'
        const description = timedOut ? t('automation.social.bindTimeout') : (err?.message || t('automation.social.bindFailedDesc'))
        setError(description)
        toast({ title: t('automation.social.toast.bindFailed'), description })
      })

    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <section className="social-posting-page social-bind-redirect-page">
      <div className="social-empty">
        <h2>正在打开 Ayrshare</h2>
        <p>{error || '请稍候，完成绑定后返回社交发帖页刷新账号状态。'}</p>
      </div>
    </section>
  )
}

export function SocialPostingPage() {
  const { locale, t, tpl } = usePreferences()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [packs, setPacks] = useState<SocialMaterialPack[]>([])
  const [statusTab, setStatusTab] = useState<SocialPackStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [quickPostOpen, setQuickPostOpen] = useState(false)
  const [draft, setDraft] = useState<QuickPostDraft>(EMPTY_QUICK_POST)
  const [assets, setAssets] = useState<AgentMaterialAsset[]>([])
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [assetPickerTab, setAssetPickerTab] = useState<AssetPickerTab>('ai-image')
  const [assetPickerLoading, setAssetPickerLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({})
  const [pickerPreviewUrls, setPickerPreviewUrls] = useState<Record<string, string>>({})
  const [savingPack, setSavingPack] = useState(false)
  const [busyPackId, setBusyPackId] = useState<string | null>(null)
  const [bindChoicePlatform, setBindChoicePlatform] = useState<string | null>(null)
  const [socialBindGuideOpen, setSocialBindGuideOpen] = useState(false)
  const [bindGuideLabel, setBindGuideLabel] = useState('')
  const [bindPanelOpen, setBindPanelOpen] = useState(false)
  const [bindPolling, setBindPolling] = useState(false)
  const [accountsError, setAccountsError] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'publish' | 'unbind' | 'deletePack'
    pack?: SocialMaterialPack
    account?: SocialAccount
  } | null>(null)
  // Empty means no platform filter. The visible "全部" platform tab is intentionally absent.
  const [platformTab, setPlatformTab] = useState('')
  // Analytics & comments state per post
  const [analyticsLoading, setAnalyticsLoading] = useState<Record<string, boolean>>({})
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({})
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ commentId: string; platform: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({})

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const platformTabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const platformScrollRef = useRef<HTMLDivElement | null>(null)
  const platformScrollFrameRef = useRef<number | null>(null)
  const packGridRef = useRef<HTMLDivElement | null>(null)
  const lastRefreshRef = useRef<Record<string, number>>({})
  const [platformScrollState, setPlatformScrollState] = useState({ left: false, right: false })
  const [packColumnCount, setPackColumnCount] = useState(1)

  useEffect(() => {
    tabRefs.current[statusTab]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [statusTab])

  const updatePlatformScrollState = useCallback(() => {
    const node = platformScrollRef.current
    if (!node) {
      setPlatformScrollState({ left: false, right: false })
      return
    }
    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    const next = {
      left: node.scrollLeft > 2,
      right: node.scrollLeft < maxScrollLeft - 2,
    }
    setPlatformScrollState(prev => (
      prev.left === next.left && prev.right === next.right ? prev : next
    ))
  }, [])

  const stopPlatformAutoScroll = useCallback(() => {
    if (platformScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(platformScrollFrameRef.current)
      platformScrollFrameRef.current = null
    }
    updatePlatformScrollState()
  }, [updatePlatformScrollState])

  const startPlatformAutoScroll = useCallback((direction: -1 | 1) => {
    stopPlatformAutoScroll()
    let lastTimestamp = 0
    const tick = (timestamp: number) => {
      const node = platformScrollRef.current
      if (!node) {
        platformScrollFrameRef.current = null
        return
      }
      if (!lastTimestamp) lastTimestamp = timestamp
      const delta = Math.min(timestamp - lastTimestamp, 32) || 16
      lastTimestamp = timestamp
      node.scrollLeft += direction * delta * 0.46
      updatePlatformScrollState()
      const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
      const atEdge = direction < 0 ? node.scrollLeft <= 0 : node.scrollLeft >= maxScrollLeft - 1
      if (atEdge) {
        platformScrollFrameRef.current = null
        return
      }
      platformScrollFrameRef.current = window.requestAnimationFrame(tick)
    }
    platformScrollFrameRef.current = window.requestAnimationFrame(tick)
  }, [stopPlatformAutoScroll, updatePlatformScrollState])

  const nudgePlatformScroll = useCallback((direction: -1 | 1) => {
    const node = platformScrollRef.current
    if (!node) return
    node.scrollBy({
      left: direction * Math.max(240, node.clientWidth * 0.55),
      behavior: 'smooth',
    })
    window.setTimeout(updatePlatformScrollState, 260)
  }, [updatePlatformScrollState])

  useEffect(() => {
    if (!platformTab) return
    platformTabRefs.current[platformTab]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [platformTab])

  useEffect(() => () => {
    if (platformScrollFrameRef.current !== null)
      window.cancelAnimationFrame(platformScrollFrameRef.current)
  }, [])

  const accountRows = accounts
  const packRows = packs

  const accountById = useMemo(() => {
    const map = new Map<string, SocialAccountBinding>()
    accountRows.forEach((account, accountIndex) => {
      map.set(account.id, { account, accountIndex })
    })
    return map
  }, [accountRows])

  const platformBindings = useMemo(() => {
    const map = new Map<string, SocialPlatformAccountBinding[]>()
    accountRows.forEach((account, accountIndex) => {
      const platforms = new Set<string>()
      ;(account.extras?.linked_platforms || []).forEach(platform => {
        const normalized = normalizeSocialPlatform(platform)
        if (normalized) platforms.add(normalized)
      })
      ;(account.extras?.display_names || []).forEach(item => {
        const normalized = normalizeSocialPlatform(item.platform)
        if (normalized) platforms.add(normalized)
      })
      platforms.forEach(platform => {
        const bindings = map.get(platform) || []
        bindings.push({
          account,
          accountIndex,
          platform,
          username: socialAccountPlatformUsername(account, platform),
        })
        map.set(platform, bindings)
      })
    })
    return map
  }, [accountRows])

  const linkedPlatforms = useMemo(() => new Set(platformBindings.keys()), [platformBindings])

  const linkedPlatformOptions = useMemo(
    () => SOCIAL_PLATFORM_OPTIONS.filter(option => linkedPlatforms.has(option.value)),
    [linkedPlatforms],
  )

  const sortedPlatformOptions = useMemo(() => {
    const linked = SOCIAL_PLATFORM_OPTIONS.filter(option => linkedPlatforms.has(option.value))
    const unlinked = SOCIAL_PLATFORM_OPTIONS.filter(option => !linkedPlatforms.has(option.value))
    return [...linked, ...unlinked]
  }, [linkedPlatforms])

  useEffect(() => {
    const node = platformScrollRef.current
    if (!node) return undefined
    updatePlatformScrollState()
    node.addEventListener('scroll', updatePlatformScrollState, { passive: true })
    window.addEventListener('resize', updatePlatformScrollState)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updatePlatformScrollState)
    resizeObserver?.observe(node)
    return () => {
      node.removeEventListener('scroll', updatePlatformScrollState)
      window.removeEventListener('resize', updatePlatformScrollState)
      resizeObserver?.disconnect()
    }
  }, [sortedPlatformOptions.length, updatePlatformScrollState])

  useEffect(() => {
    const node = packGridRef.current
    if (!node) return undefined
    const updatePackColumns = () => {
      const width = node.clientWidth
      const next = width >= 1120 ? 3 : width > 840 ? 2 : 1
      setPackColumnCount(prev => prev === next ? prev : next)
    }
    updatePackColumns()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updatePackColumns)
    resizeObserver?.observe(node)
    window.addEventListener('resize', updatePackColumns)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePackColumns)
    }
  }, [])

  useLocalizedTopbarSlot(() => ({
    className: 'mr-topbar--repo-tabs mr-topbar--social-tabs',
    leading: (
      <nav className="repo-tabs repo-tabs--topbar" role="tablist" aria-label={t('automation.social.statusTabsAria')}>
        {STATUS_TAB_KEYS.map(tab => (
          <button
            key={tab.value}
            ref={node => { tabRefs.current[tab.value] = node }}
            type="button"
            role="tab"
            className={statusTab === tab.value ? 'is-active' : ''}
            aria-selected={statusTab === tab.value}
            onClick={() => setStatusTab(tab.value)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </nav>
    ),
  }), [statusTab])

  const filteredPacks = useMemo(() => {
    if (statusTab === 'all') return packRows
    return packRows.filter(p => p.status === statusTab)
  }, [packRows, statusTab])

  // Posts grouped by platform for the platform tab view
  const allPosts = useMemo(() => {
    const result: SocialPostRecord[] = []
    packRows.forEach(pack => {
      if (pack.status !== 'sent') return
      // Synthesize a post record from the pack for display
      result.push({
        id: pack.id,
        status: 'succeeded',
        platforms: pack.platforms || [],
        external_post_id: '',
        ref_id: '',
        results: [],
        charged_points: 0,
        charge_status: 'waived',
        has_url: false,
        error_code: '',
        error_message: '',
        posted_at: pack.last_posted_at,
        analytics_snapshot: {},
        analytics_updated_at: null,
        top_comments_snapshot: {},
        comments_updated_at: null,
      })
    })
    return result
  }, [packRows])

  const platformFilteredPacks = useMemo(() => {
    if (!platformTab) return filteredPacks
    return filteredPacks.filter(p => (p.platforms || []).includes(platformTab))
  }, [filteredPacks, platformTab])

  const packColumns = useMemo(() => {
    if (!platformFilteredPacks.length) return []
    const columns: SocialMaterialPack[][] = Array.from(
      { length: Math.max(1, packColumnCount) },
      () => [],
    )
    platformFilteredPacks.forEach((pack, index) => {
      columns[index % columns.length].push(pack)
    })
    return columns
  }, [packColumnCount, platformFilteredPacks])

  const loadAccounts = useCallback(async (options: LoadAccountsOptions = {}) => {
    if (!options.silent) {
      setAccountsLoading(true)
    }
    try {
      const res = await listSocialAccounts()
      setAccounts(res.items || [])
      setAccountsError(false)
      if (res.items?.[0]?.id) {
        setDraft(prev => prev.channelAccountId ? prev : ({ ...prev, channelAccountId: res.items[0].id }))
      }
    } catch (err: any) {
      setAccountsError(true)
      if (!options.silent) {
        toast({ title: t('automation.social.toast.accountsFailed'), description: err?.message || '请刷新或稍后重试' })
      }
    } finally {
      if (!options.silent) {
        setAccountsLoading(false)
      }
    }
  }, [])

  const loadPacks = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listSocialPacks()
      setPacks(items)
    } catch (err: any) {
      toast({ title: t('automation.social.toast.packsFailed'), description: err?.message || '请稍后重试' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccounts()
    void loadPacks()
  }, [loadAccounts, loadPacks])

  useEffect(() => {
    if (!bindPanelOpen) {
      setBindPolling(false)
      return undefined
    }
    let cancelled = false
    let inFlight = false
    const syncAccounts = async () => {
      if (inFlight) return
      inFlight = true
      setBindPolling(true)
      try {
        await loadAccounts({ silent: true })
      } finally {
        inFlight = false
        if (!cancelled) {
          setBindPolling(false)
        }
      }
    }
    void syncAccounts()
    const timer = window.setInterval(() => {
      void syncAccounts()
    }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [bindPanelOpen, loadAccounts])

  useEffect(() => {
    if (!quickPostOpen) {
      setMediaPreviewUrls({})
      return undefined
    }
    let cancelled = false
    const objectUrls: string[] = []
    setMediaPreviewUrls({})
    ;(async () => {
      const next: Record<string, string> = {}
      for (const [index, item] of draft.items.entries()) {
        const key = mediaItemKey(item, index)
        const src = resolvePreviewSource(item)
        if (!src) continue
        if (/^https?:\/\//i.test(src) || src.startsWith('blob:')) {
          next[key] = src
          continue
        }
        try {
          const resp = await authFetch(src)
          if (!resp.ok) continue
          const objectUrl = URL.createObjectURL(await resp.blob())
          objectUrls.push(objectUrl)
          next[key] = objectUrl
        } catch {
          // Preview is optional; publishing still uses attachment/task refs.
        }
      }
      if (!cancelled) setMediaPreviewUrls(next)
    })()
    return () => {
      cancelled = true
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [draft.items, quickPostOpen])

  const visibleMediaItems = useMemo(
    () => draft.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.kind === draft.mediaMode),
    [draft.items, draft.mediaMode],
  )

  const imageItemCount = useMemo(
    () => draft.items.filter(item => item.kind === 'image').length,
    [draft.items],
  )

  const videoItemCount = useMemo(
    () => draft.items.filter(item => item.kind === 'video').length,
    [draft.items],
  )

  const pickerAssets = assets

  useEffect(() => {
    if (!assetPickerOpen) {
      setPickerPreviewUrls({})
      return undefined
    }
    let cancelled = false
    const objectUrls: string[] = []
    setPickerPreviewUrls({})
    ;(async () => {
      for (const asset of pickerAssets) {
        if (cancelled) return
        const preview = await resolveWarehouseAssetPreview(asset)
        if (!preview.url) continue
        if (cancelled) {
          if (preview.revoke) URL.revokeObjectURL(preview.url)
          return
        }
        if (preview.revoke)
          objectUrls.push(preview.url)
        setPickerPreviewUrls(prev => ({ ...prev, [asset.id]: preview.url }))
      }
    })()
    return () => {
      cancelled = true
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [assetPickerOpen, pickerAssets])

  // ---- Quick Post Dialog ----
  const openQuickPost = () => {
    const primaryAccount = accountRows[0]
    setDraft({
      ...EMPTY_QUICK_POST,
      channelAccountId: primaryAccount?.id || '',
      platforms: [],
    })
    setQuickPostOpen(true)
  }

  const togglePlatform = (platform: string) => {
    setDraft(prev => {
      const exists = prev.platforms.includes(platform)
      const platforms = exists ? prev.platforms.filter(p => p !== platform) : [...prev.platforms, platform]
      return { ...prev, platforms }
    })
  }

  const doQuickPublish = async (schedule: boolean) => {
    if (savingPack) return
    const publishItems = activeMediaItems(draft)
    if (!draft.text.trim() && publishItems.length === 0) {
      toast({ title: t('automation.social.toast.needContent') })
      return
    }
    if (!draft.platforms.length) {
      toast({ title: t('automation.social.toast.needPlatform') })
      return
    }
    // Validate title for required platforms
    for (const p of draft.platforms) {
      const caps = getPlatformCaps(p)
      if (caps.titleRequired && (!draft.titleEnabled || !draft.title.trim())) {
        toast({ title: `${platformLabel(p)} 要求标题，请填写后重试` })
        return
      }
      if (p === 'reddit' && !draft.platformOptions.subreddit?.trim()) {
        toast({ title: 'Reddit 要求填写 Subreddit' })
        return
      }
    }
    if (schedule && !draft.scheduledAt) {
      toast({ title: '请选择定时发布时间' })
      return
    }

    setSavingPack(true)
    try {
      const payload = {
        name: draft.title || '一键发帖',
        title: draft.titleEnabled ? draft.title : '',
        text: draft.bodyEnabled ? draft.text : '',
        channel_account_id: draft.channelAccountId,
        platforms: draft.platforms,
        platform_options: draft.platformOptions,
        items: publishItems.map(({ preview_url, display_name, ...item }) => item),
        ...(schedule ? { scheduled_at: new Date(draft.scheduledAt).toISOString(), schedule_kind: 'once' as const } : {}),
      }
      await quickPublishSocialPack(payload)
      setQuickPostOpen(false)
      await loadPacks()
      toast({ title: schedule ? '已提交定时发布' : '帖子已发布' })
    } catch (err: any) {
      toast({ title: t('automation.social.toast.publishFailed'), description: describeAxiosError(err) || '请检查平台点余额与社交账号绑定' })
    } finally {
      setSavingPack(false)
    }
  }

  const loadAssets = useCallback(async (tab: AssetPickerTab) => {
    setAssetPickerLoading(true)
    setAssets([])
    try {
      const { AgentGenerationTaskAPI } = getChatKit() as any
      const params: Record<string, any> = tab === 'space'
        ? { source: 'user_upload', kind: 'all', page_size: 60 }
        : { kind: tab === 'ai-video' ? 'video' : 'image', status: 'succeeded', page_size: 60 }
      let loaded: AgentMaterialAsset[] = []
      if (AgentGenerationTaskAPI?.assets) {
        const res = await AgentGenerationTaskAPI.assets(params)
        loaded = res.items || []
      } else {
        const query = new URLSearchParams(params).toString()
        const r = await authFetch(`/api/v1/agent/material-assets/?${query}`)
        const body = await r.json()
        loaded = body?.data?.items || body?.items || []
      }
      // Publishing only supports generation-task refs and uploaded attachments.
      const mediaAssets = loaded.filter(asset =>
        (asset.kind === 'image' || asset.kind === 'video') &&
        (asset.source === 'generation_task' || asset.source === 'user_upload')
      )
      setAssets(mediaAssets)
    } catch {
      setAssets([])
      toast({ title: '加载仓库素材失败' })
    } finally {
      setAssetPickerLoading(false)
    }
  }, [])

  const openAssetPicker = () => {
    setAssetPickerTab(draft.mediaMode === 'video' ? 'ai-video' : 'ai-image')
    setAssetPickerOpen(true)
  }

  useEffect(() => {
    if (!assetPickerOpen) return
    void loadAssets(assetPickerTab)
  }, [assetPickerOpen, assetPickerTab, loadAssets])

  const addAsset = (asset: AgentMaterialAsset) => {
    const kind = asset.kind === 'video' ? 'video' : 'image'
    const attachmentId = asset.source === 'user_upload'
      ? asset.id.replace(/^attachment:/, '')
      : ''
    setDraft(prev => {
      if (kind === 'video' && prev.items.some(i => i.kind === 'video')) {
        toast({ title: '视频只能上传一个' })
        return prev
      }
      if (kind === 'image' && prev.items.filter(i => i.kind === 'image').length >= 35) {
        toast({ title: '图片最多 35 张' })
        return prev
      }
      if (kind !== prev.mediaMode)
        toast({ title: kind === 'video' ? '已切换到视频模式' : '已切换到图片模式' })
      return {
        ...prev,
        mediaMode: kind,
        items: [
          ...prev.items,
          {
            kind,
            attachment_id: attachmentId,
            text_content: asset.source === 'generation_task' ? asset.id : '',
            preview_url: asset.preview_url || asset.download_url || asset.url || '',
            display_name: asset.name || '',
            sort_order: prev.items.length,
          },
        ],
      }
    })
    setAssetPickerOpen(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const { AgentAttachmentAPI } = getChatKit() as any
      const uploaded = await AgentAttachmentAPI.upload(file)
      const attachmentId = uploaded?.id || ''
      if (!attachmentId) throw new Error('上传失败')
      const kind = file.type.startsWith('video/') ? 'video' : 'image'
      setDraft(prev => {
        if (kind !== prev.mediaMode) {
          toast({ title: prev.mediaMode === 'image' ? '当前为图片模式，请上传图片' : '当前为视频模式，请上传视频' })
          return prev
        }
        if (prev.mediaMode === 'video' && prev.items.some(i => i.kind === 'video')) {
          toast({ title: '视频只能上传一个' })
          return prev
        }
        if (prev.mediaMode === 'image' && prev.items.filter(i => i.kind === 'image').length >= 35) {
          toast({ title: '图片最多 35 张' })
          return prev
        }
        return {
          ...prev,
          items: [
            ...prev.items,
            {
              kind,
              attachment_id: attachmentId,
              preview_url: attachmentId ? `/api/v1/agent/attachments/${attachmentId}/download/` : '',
              display_name: file.name,
              sort_order: prev.items.length,
            },
          ],
        }
      })
    } catch (err: any) {
      toast({ title: t('automation.social.toast.uploadFailed'), description: err?.message || '请稍后重试' })
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const removeItem = (index: number) => {
    setDraft(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  // ---- Bind ----
  const bindChoiceLabel = bindChoicePlatform
    ? (SOCIAL_PLATFORM_OPTIONS.find(option => option.value === bindChoicePlatform)?.label || bindChoicePlatform)
    : ''

  const openSocialBindTab = () => {
    const popup = window.open(socialBindRedirectHref(), '_blank')
    if (popup) {
      popup.opener = null
      toast({ title: '已打开社交账号绑定页', description: '完成绑定后返回此页刷新账号状态' })
      return
    }
    toast({ title: t('automation.social.toast.bindFailed'), description: '浏览器拦截了新标签页，请允许弹窗后重试。' })
  }

  const publishNow = async (pack: SocialMaterialPack) => {
    setConfirmAction({ type: 'publish', pack })
  }

  const doPublishNow = async (pack: SocialMaterialPack) => {
    setConfirmAction(null)
    setBusyPackId(pack.id)
    try {
      await publishSocialPack(pack.id, pack.platforms)
      toast({ title: '帖子已发布' })
      await loadPacks()
    } catch (err: any) {
      toast({ title: t('automation.social.toast.publishFailed'), description: describeAxiosError(err) || '请检查平台点余额与社交账号绑定' })
    } finally {
      setBusyPackId(null)
    }
  }

  const deletePack = async (pack: SocialMaterialPack) => {
    setConfirmAction({ type: 'deletePack', pack })
  }

  const doDeletePack = async (pack: SocialMaterialPack) => {
    setConfirmAction(null)
    setBusyPackId(pack.id)
    try {
      await deleteSocialPack(pack.id)
      toast({ title: '帖子已删除' })
      await loadPacks()
    } catch (err: any) {
      toast({ title: '删除失败', description: describeAxiosError(err) || undefined })
    } finally {
      setBusyPackId(null)
    }
  }

  // ---- Analytics & Comments ----
  const refreshAnalytics = async (packId: string, postId: string) => {
    const key = postId
    const now = Date.now()
    if (analyticsLoading[key]) return
    if (lastRefreshRef.current[key] && now - lastRefreshRef.current[key] < 5000) {
      toast({ title: '刷新过于频繁，请 5 秒后再试' })
      return
    }
    lastRefreshRef.current[key] = now
    setAnalyticsLoading(prev => ({ ...prev, [key]: true }))
    try {
      const analytics = await fetchPostAnalytics(packId, postId, true)
      const comments = await fetchPostComments(packId, postId, true)
      await loadPacks()
      if (analytics?.pending || comments?.pending) {
        toast({ title: '平台仍在处理该帖子，互动数据稍后可见' })
      }
    } catch (err: any) {
      toast({ title: '刷新互动数据失败', description: describeAxiosError(err) || undefined })
    } finally {
      setAnalyticsLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const patchPackComments = useCallback((packId: string, postId: string, data: Record<string, unknown>) => {
    const snapshot = data.top_comments_snapshot
    if (!snapshot || typeof snapshot !== 'object') return
    setPacks(prev => prev.map(pack => {
      if (pack.id !== packId || !pack.latest_post || pack.latest_post.id !== postId) return pack
      return {
        ...pack,
        latest_post: {
          ...pack.latest_post,
          top_comments_snapshot: snapshot as Record<string, unknown>,
          comments_updated_at: typeof data.comments_updated_at === 'string'
            ? data.comments_updated_at
            : pack.latest_post.comments_updated_at,
        },
      }
    }))
  }, [])

  const refreshComments = async (packId: string, postId: string) => {
    const key = postId
    setCommentsLoading(prev => ({ ...prev, [key]: true }))
    try {
      const data = await fetchPostComments(packId, postId, true)
      patchPackComments(packId, postId, data)
      await loadPacks()
      if (data?.pending) {
        toast({ title: '平台仍在处理该帖子，评论稍后可见' })
      }
    } catch (err: any) {
      toast({ title: '刷新评论失败', description: describeAxiosError(err) || undefined })
    } finally {
      setCommentsLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const doSubmitComment = async (packId: string, postId: string, externalPostId: string, platforms: string[]) => {
    if (!commentText.trim()) return
    try {
      await postComment('', externalPostId, commentText.trim(), platforms)
      setCommentText('')
      toast({ title: '评论已发送' })
      await refreshComments(packId, postId)
    } catch (err: any) {
      toast({ title: '评论失败', description: err?.message || '' })
    }
  }

  const doSubmitReply = async (packId: string, postId: string, commentId: string, platform: string, searchPlatformId = false) => {
    if (!replyText.trim()) return
    try {
      await replyComment(commentId, replyText.trim(), platform, { searchPlatformId: searchPlatformId || platform === 'twitter' })
      setReplyText('')
      setReplyTo(null)
      toast({ title: '回复已发送' })
      await refreshComments(packId, postId)
    } catch (err: any) {
      toast({ title: '回复失败', description: err?.message || '' })
    }
  }

  // Auto-determine eligible platforms
  const platformEligibilityMap = useMemo(() => {
    const map: Record<string, { eligible: boolean; reason: string }> = {}
    for (const option of linkedPlatformOptions) {
      map[option.value] = platformEligibility(option.value, draft, true)
    }
    return map
  }, [linkedPlatformOptions, draft])

  // ---- Render ----
  return (
    <section className="social-posting-page" aria-busy={loading || savingPack || Boolean(busyPackId)}>
      <div className="social-platform-bar">
        <div className="social-platform-scroll-shell">
          <button
            type="button"
            className="social-platform-scroll-btn"
            aria-label="向左滑动平台"
            disabled={!platformScrollState.left}
            onClick={() => nudgePlatformScroll(-1)}
            onPointerEnter={() => startPlatformAutoScroll(-1)}
            onPointerLeave={stopPlatformAutoScroll}
            onMouseEnter={() => startPlatformAutoScroll(-1)}
            onMouseLeave={stopPlatformAutoScroll}
          >
            <ChevronLeft size={16} />
          </button>
          <div ref={platformScrollRef} className="social-platform-scroll-window">
            <nav className="social-platform-tabs" role="toolbar" aria-label="按平台筛选">
              {sortedPlatformOptions.map(option => {
                const linked = linkedPlatforms.has(option.value)
                const monoDark = option.value === "twitter" || option.value === "threads"
                const platformBinding = platformBindings.get(option.value)?.[0] || null
                const platformAccount = socialPlatformBindingDetail(option.value, platformBinding, t, tpl)
                const platformTitle = linked
                  ? option.label + (platformAccount ? "：" + platformAccount : "") + (platformTab === option.value ? "（再次点击取消筛选）" : "")
                  : option.label + "（未绑定，点击去绑定）"
                return (
                  <button
                    key={option.value}
                    ref={node => { platformTabRefs.current[option.value] = node }}
                    type="button"
                    className={[
                      platformTab === option.value ? "is-active" : "",
                      linked ? "is-linked" : "is-unlinked",
                    ].filter(Boolean).join(" ")}
                    data-platform={option.value}
                    aria-disabled={!linked}
                    aria-pressed={linked ? platformTab === option.value : undefined}
                    title={platformTitle}
                    onClick={() => {
                      if (linked) {
                        setPlatformTab(current => current === option.value ? "" : option.value)
                        return
                      }
                      void openSocialBindTab()
                    }}
                  >
                    <span
                      className="social-platform-tab-logo"
                      data-logo-tone={monoDark ? "dark" : undefined}
                      aria-hidden
                    >
                      <SocialPlatformLogo platform={option.value} size={20} />
                    </span>
                    <span className="social-platform-tab-copy">
                      <span>{option.label}</span>
                      {linked && platformAccount ? <small>{platformAccount}</small> : null}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
          <button
            type="button"
            className="social-platform-scroll-btn"
            aria-label="向右滑动平台"
            disabled={!platformScrollState.right}
            onClick={() => nudgePlatformScroll(1)}
            onPointerEnter={() => startPlatformAutoScroll(1)}
            onPointerLeave={stopPlatformAutoScroll}
            onMouseEnter={() => startPlatformAutoScroll(1)}
            onMouseLeave={stopPlatformAutoScroll}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <Button type="button" className="social-quick-post-btn" onClick={openQuickPost}>{t('automation.social.quickPost')}</Button>
      </div>

      {accountsError && (
        <div className="social-account-error">
          <span>后端连接失败，社交账号暂时无法加载。</span>
          <button type="button" onClick={() => void loadAccounts()}>点此重试</button>
        </div>
      )}

      {/* Post cards grid */}
      <div
        ref={packGridRef}
        className="social-pack-grid"
        style={{ gridTemplateColumns: `repeat(${packColumnCount}, minmax(0, 1fr))` }}
      >
        {packColumns.map((column, columnIndex) => (
          <div key={`pack-column-${columnIndex}`} className="social-pack-column">
            {column.map(pack => {
              const status = STATUS_META[pack.status]
              const packBusy = busyPackId === pack.id
              const isExpanded = expandedPostId === pack.id
              const latestPost = latestPostForPack(pack)
              const analyticsSnap = (latestPost?.analytics_snapshot || {}) as Record<string, any>
              const commentsSnap = (latestPost?.top_comments_snapshot || {}) as Record<string, any>
              const commentsList: any[] = commentsFromSnapshot(commentsSnap)
              const displayComments = flattenCommentsForDisplay(commentsList)
              const displayCommentCount = displayComments.length
              const platformLinks = platformPostLinks(latestPost, analyticsSnap, pack.platforms || [])
              const packAccountBinding = pack.channel_account_id ? accountById.get(pack.channel_account_id) || null : null
              const packPlatformBindings = (pack.platforms || [])
                .map(platform => platformBindings.get(platform)?.[0] || null)
                .filter((item): item is SocialPlatformAccountBinding => Boolean(item))
              const twitterReplyCount = (pack.platforms || []).includes('twitter')
                ? analyticsMetricValue(analyticsSnap.twitter?.analytics || analyticsSnap.twitter, 'replyCount')
                : null
              const commentsMayBeStale = twitterReplyCount != null && twitterReplyCount > displayCommentCount
              const analyticsKey = latestPost?.id || pack.id
              const canRefreshInteractions = Boolean(latestPost?.id && latestPost.external_post_id)

              return (
                <article
                  key={pack.id}
                  className={[
                    'social-pack-card',
                    `social-pack-card--${pack.status}`,
                    isExpanded ? 'is-expanded' : '',
                  ].filter(Boolean).join(' ')}
                >
              <div className="social-pack-card-head">
                <div>
                  <strong title={pack.name || t('automation.social.unnamed')}>{pack.name || t('automation.social.unnamed')}</strong>
                  <span>{status.hint}</span>
                </div>
                <div className="social-pack-card-head-actions">
                  <span className={`social-status social-status--${pack.status}`}>{status.label}</span>
                  <button
                    type="button"
                    className="social-pack-delete-button"
                    aria-label={`删除帖子 ${pack.name || t('automation.social.unnamed')}`}
                    title="删除帖子"
                    disabled={packBusy}
                    onClick={() => void deletePack(pack)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {pack.title ? <p className="social-pack-title">{pack.title}</p> : null}
              <p className="social-pack-text">{pack.text || t('automation.social.noCopy')}</p>
              <div className="social-platform-chip-row">
                {(pack.platforms || []).map(platform => {
                  const iconName = PLATFORM_BRAND_ICONS[platform] || "brand-x"
                  const platformBinding = packAccountBinding
                    ? {
                      ...packAccountBinding,
                      platform,
                      username: socialAccountPlatformUsername(packAccountBinding.account, platform),
                    }
                    : platformBindings.get(platform)?.[0] || null
                  const platformAccount = socialPlatformBindingDetail(platform, platformBinding, t, tpl)
                  return (
                    <span
                      key={platform}
                      className="social-platform-chip"
                      data-platform={platform}
                      title={platformAccount ? platformLabel(platform) + "：" + platformAccount : platformLabel(platform)}
                    >
                      <Icon name={iconName} size={13} />
                      <span className="social-platform-chip-copy">
                        <span>{platformLabel(platform)}</span>
                        {platformAccount ? <small>绑定 {platformAccount}</small> : null}
                      </span>
                    </span>
                  )
                })}
                {!pack.platforms?.length ? <span className="social-platform-chip">{t('automation.social.noPlatform')}</span> : null}
              </div>
              <div className="social-pack-assets" aria-label={t('automation.social.media')}>
                {(pack.items || []).slice(0, 4).map(item => (
                  <span key={item.id} className={`social-pack-asset social-pack-asset--${item.kind}`}>
                    {materialKindLabel(item, t)}
                  </span>
                ))}
                {!pack.items?.length ? <span className="social-pack-asset is-empty">{t('automation.social.noAssets')}</span> : null}
              </div>
              <div className="social-pack-meta">
                <span>{pack.items?.length || 0} 个素材</span>
                <span>{packPostAccountDetail(pack, packAccountBinding, packPlatformBindings, t, tpl)}</span>
                <span>{pack.scheduled_at ? "定时 " + formatSocialDate(pack.scheduled_at, t) : pack.last_posted_at ? "发布 " + formatSocialDate(pack.last_posted_at, t) : "未排期"}</span>
              </div>
              {pack.last_error ? <div className="social-pack-error" role="alert">{pack.last_error}</div> : null}

              {pack.status === 'sent' && platformLinks.length > 0 && (
                <div className="social-post-links">
                  {platformLinks.map(link => (
                    <a
                      key={link.platform}
                      className="social-post-link"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name={PLATFORM_BRAND_ICONS[link.platform] || 'brand-x'} size={13} />
                      <span>{tpl('automation.social.viewOnPlatform', platformLabel(link.platform))}</span>
                      <span className="social-post-link-arrow" aria-hidden>↗</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Analytics & Comments for sent packs */}
              {pack.status === 'sent' && (
                <div className="social-pack-expand-area">
                  <button
                    type="button"
                    className={`social-pack-expand-btn${isExpanded ? ' is-expanded' : ''}`}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedPostId(null)
                        return
                      }
                      setExpandedPostId(pack.id)
                      if (latestPost?.id && latestPost.external_post_id) {
                        void refreshComments(pack.id, latestPost.id)
                      }
                    }}
                  >
                    {isExpanded ? t('automation.social.collapse') : t('automation.social.expand')}
                  </button>
                  {isExpanded && (
                    <div className="social-pack-analytics-area">
                      {/* Analytics per platform */}
                      <div className="social-analytics-header">
                        <strong>{t('automation.social.analytics')}</strong>
                        <button
                          type="button"
                          className="social-refresh-btn"
                          disabled={analyticsLoading[analyticsKey] || !canRefreshInteractions}
                          onClick={() => latestPost?.id && void refreshAnalytics(pack.id, latestPost.id)}
                        >
                          {analyticsLoading[analyticsKey] ? t('automation.social.refreshing') : t('automation.social.refreshData')}
                        </button>
                      </div>
                      {(pack.platforms || []).map(p => {
                        if (NO_ANALYTICS_PLATFORMS.has(p)) {
                          return (
                            <div key={p} className="social-analytics-platform-card" data-platform={p}>
                              <span className="social-analytics-platform-name">{platformLabel(p)}</span>
                              <span className="social-analytics-no-data">{t('automation.social.noAnalytics')}</span>
                            </div>
                          )
                        }
	                        const pAnalytics = analyticsSnap[p]?.analytics || {}
	                        const fields = ANALYTICS_FIELDS[p] || []
	                        return (
                          <div key={p} className="social-analytics-platform-card" data-platform={p}>
                            <span className="social-analytics-platform-name">{platformLabel(p)}</span>
                            <div className="social-analytics-metrics">
                              {fields.map(f => (
                                <span key={f.key} className="social-analytics-metric">
                                  <span className="social-analytics-metric-value">
	                                    <span className="social-analytics-metric-icon" aria-hidden>{f.icon}</span>
	                                    {p === 'reddit' && f.key === 'upvoteRatio' && analyticsMetricValue(pAnalytics, f.key) != null
	                                      ? `${Math.round((analyticsMetricValue(pAnalytics, f.key) as number) * 100)}%`
	                                      : formatNumber(analyticsMetricValue(pAnalytics, f.key))}
                                  </span>
                                  <span className="social-analytics-metric-label">{f.label}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {/* Comments */}
                      <div className="social-comments-header">
                        <strong>{t('automation.social.comments')}{displayCommentCount ? ` (${displayCommentCount})` : ''}</strong>
                        <div className="social-comments-header-actions">
                          <button
                            type="button"
                            className="social-refresh-btn"
                            disabled={commentsLoading[analyticsKey] || !canRefreshInteractions}
                            onClick={() => latestPost?.id && void refreshComments(pack.id, latestPost.id)}
                          >
                            {commentsLoading[analyticsKey] ? t('automation.social.refreshing') : t('automation.social.refreshComments')}
                          </button>
                          {displayCommentCount > 3 && !showAllComments[pack.id] && (
                            <button type="button" className="social-expand-comments-btn" onClick={() => {
                              setShowAllComments(prev => ({ ...prev, [pack.id]: true }))
                            }}>{t('automation.social.viewAll')}</button>
                          )}
                        </div>
                      </div>
                      {commentsMayBeStale && (
                        <p className="social-comments-sync-hint">{t('automation.social.commentsSyncHint')}</p>
                      )}
                      <div className="social-comments-list">
                        {(showAllComments[pack.id] ? displayComments : displayComments.slice(0, 3)).map((c: any, ci: number) => (
                          <div
                            key={`${c.commentId || c.id || ci}-${c.depth || 0}`}
                            className={`social-comment-item${c.depth ? ' social-comment-reply' : ''}`}
                            data-depth={c.depth || 0}
                          >
                            <div className="social-comment-main">
                              <span className="social-comment-username">@{c.username || t('automation.social.user')}</span>
                              <span className="social-comment-text">{c.text}</span>
                              <span className="social-comment-time">{c.created ? new Date(c.created).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                              {c.likeCount != null && <span className="social-comment-likes">❤️ {c.likeCount}</span>}
                            </div>
                            {c.depth === 0 && c.platform && !['pinterest', 'snapchat', 'telegram', 'gmb'].includes(c.platform) && (
                              replyTo?.commentId === (c.commentId || c.id) ? (
                                <div className="social-reply-input-area">
                                  <input
                                    className="social-reply-input"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder={t('automation.social.replyPlaceholder')}
                                    maxLength={500}
                                  />
                                  <button type="button" className="social-reply-send-btn" onClick={() => latestPost?.id && void doSubmitReply(pack.id, latestPost.id, c.commentId || c.id, c.platform, Boolean(c.commentId))}>{t('automation.social.send')}</button>
                                  <button type="button" className="social-reply-cancel-btn" onClick={() => { setReplyTo(null); setReplyText('') }}>{t('automation.social.cancel')}</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="social-reply-btn"
                                  onClick={() => { setReplyTo({ commentId: c.commentId || c.id, platform: c.platform }); setReplyText('') }}
                                  disabled={['threads'].includes(c.platform)}
                                >
                                  {t('automation.social.reply')}
                                </button>
                              )
                            )}
                          </div>
                        ))}
                        {!displayCommentCount && !commentsLoading[analyticsKey] && <p className="social-no-comments">{t('automation.social.noComments')}</p>}
                        {!displayCommentCount && commentsLoading[analyticsKey] && <p className="social-no-comments">{t('automation.social.refreshing')}</p>}
                      </div>

                      {/* Write comment */}
                      <div className="social-comment-input-area">
                        <input
                          className="social-comment-input"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder={t('automation.social.commentPlaceholder')}
                          maxLength={500}
                        />
                        <button
                          type="button"
                          className="social-comment-send-btn"
                          disabled={!commentText.trim() || !canRefreshInteractions}
                          onClick={() => latestPost?.external_post_id && latestPost?.id && void doSubmitComment(pack.id, latestPost.id, latestPost.external_post_id, pack.platforms)}
                        >{t('automation.social.send')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pack.status !== 'sent' ? (
                <div className="social-pack-actions">
                  <button type="button" onClick={() => void publishNow(pack)} disabled={packBusy}>{packBusy ? t('automation.social.processing') : t('automation.social.publishNow')}</button>
                  <button type="button" onClick={() => {
                    setDraft(prev => ({ ...prev, scheduledAt: pack.scheduled_at?.slice(0, 16) || '' }))
                    void (async () => {
                      setBusyPackId(pack.id)
                      try {
                        await scheduleSocialPack(pack.id, {
                          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                          schedule_kind: 'once',
                          platforms: pack.platforms,
                        })
                        toast({ title: '已提交定时发布' })
                        await loadPacks()
                      } catch (err: any) {
                        toast({ title: '定时失败', description: describeAxiosError(err) || '请稍后重试' })
                      } finally {
                        setBusyPackId(null)
                      }
                    })()
                  }} disabled={packBusy}>{t('automation.social.schedule')}</button>
                </div>
              ) : null}
                </article>
              )
            })}
          </div>
        ))}
        {!platformFilteredPacks.length && !loading && (
          <div className="social-pack-empty" role="status">
            <strong>{t('automation.social.emptyTitle')}</strong>
            <span>
              {accountsLoading
                ? '正在同步 Ayrshare 账号状态...'
                : linkedPlatforms.size
                  ? '点击「一键发帖」创建你的第一条帖子。'
                  : '当前 Ayrshare 账号还未绑定平台，先完成平台授权再发帖。'}
            </span>
            <div className="social-pack-empty-actions">
              {!linkedPlatforms.size ? (
                <Button type="button" variant="outline" onClick={() => setBindPanelOpen(true)}>{t('automation.social.addPlatform')}</Button>
              ) : null}
              <Button type="button" onClick={openQuickPost}>一键发帖</Button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Bind Panel Dialog ---- */}
      <Dialog open={bindPanelOpen} onOpenChange={setBindPanelOpen}>
        <DialogContent className="social-bind-dialog">
          <DialogHeader>
            <DialogTitle>{t('automation.social.bindTitle')}</DialogTitle>
            <DialogDescription>
              {accountRows.length} 个账号 · 已绑定 {linkedPlatforms.size}/{SOCIAL_PLATFORM_OPTIONS.length}
              {bindPolling ? ' · 正在同步' : bindPanelOpen ? ' · 3 秒自动同步' : ''}
            </DialogDescription>
          </DialogHeader>
          {!accountRows.length ? (
            <div className="social-bind-dialog-empty">
              <p>尚未连接 Ayrshare，绑定平台前请先完成账号授权。</p>
              <Button type="button" onClick={openSocialBindTab}>连接 Ayrshare</Button>
            </div>
          ) : (
            <ul className="social-bind-accounts">
              {accountRows.map((acc, index) => (
                <li key={acc.id} className="social-bind-account">
                  <div className="social-bind-account-meta">
                    <strong>{socialAccountDisplayName(index, t, tpl)}</strong>
                    <span>{socialAccountDetail(acc, t, tpl)}</span>
                  </div>
                  <button
                    type="button"
                    className="social-bind-account-unlink"
                    onClick={() => setConfirmAction({ type: 'unbind', account: acc })}
                  >解绑</button>
                </li>
              ))}
            </ul>
          )}
          <div className="social-bind-grid">
            {SOCIAL_PLATFORM_OPTIONS.map(option => {
              const linked = linkedPlatforms.has(option.value)
              const iconName = PLATFORM_BRAND_ICONS[option.value] || 'brand-x'
              return (
                <article key={option.value} className={`social-bind-card ${linked ? 'is-linked' : 'is-unlinked'}`} data-platform={option.value}>
                  <button type="button" className="social-bind-card-hit" disabled={linked} aria-label={linked ? `${option.label} 已绑定` : `绑定 ${option.label}`}
                    onClick={() => { if (!linked) { setBindChoicePlatform(option.value) } }}>
                    <span className="social-bind-card-logo" aria-hidden><Icon name={iconName} size={24} /></span>
                    <span className="social-bind-card-label">{option.label}</span>
                    <span className={`social-bind-card-status ${linked ? 'is-linked' : 'is-unlinked'}`}>{linked ? '已绑定' : '绑定'}</span>
                  </button>
                </article>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bindChoicePlatform != null} onOpenChange={open => { if (!open) setBindChoicePlatform(null) }}>
        <DialogContent className="social-bind-choice-dialog">
          <DialogHeader>
            <DialogTitle>绑定 {bindChoiceLabel}</DialogTitle>
            <DialogDescription>绑定前需先在对应平台注册账号。Ayrshare 会在新页面中引导你登录并授权。</DialogDescription>
          </DialogHeader>
          <div className="social-bind-choice-actions">
            <Button type="button" onClick={() => { setBindChoicePlatform(null); openSocialBindTab() }}>我熟练操作，立即前往绑定</Button>
            <Button type="button" variant="outline" onClick={() => {
              const label = bindChoiceLabel || t('automation.social.genericPlatform')
              setBindGuideLabel(label)
              setBindChoicePlatform(null)
              setSocialBindGuideOpen(true)
            }}>我是新手小白，教我绑定</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={socialBindGuideOpen} onOpenChange={setSocialBindGuideOpen}>
        <DialogContent className="social-bind-guide-dialog">
          <DialogHeader>
            <DialogTitle>{tpl('automation.social.bindGuideTitle', bindGuideLabel || t('automation.social.genericPlatform'))}</DialogTitle>
            <DialogDescription>{t('automation.social.bindGuideDesc')}</DialogDescription>
          </DialogHeader>
          <div className="social-bind-guide-body">
            {guidePrompt(bindGuideLabel || t('automation.social.genericPlatform'), locale).split('\n').map((line, index) => (
              line ? <p key={index}>{line}</p> : <span key={index} aria-hidden />
            ))}
          </div>
          <div className="social-bind-choice-actions">
            <Button type="button" onClick={() => { setSocialBindGuideOpen(false); openSocialBindTab() }}>{t('automation.social.bindExpert')}</Button>
            <Button type="button" variant="outline" onClick={() => setSocialBindGuideOpen(false)}>{t('account.common.close', '关闭')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Quick Post Dialog ---- */}
      <Dialog open={quickPostOpen} onOpenChange={setQuickPostOpen}>
        <DialogContent className="social-quickpost-dialog">
          <DialogHeader>
            <DialogTitle>{t('automation.social.quickPostTitle')}</DialogTitle>
            <DialogDescription>{t('automation.social.quickPostDesc')}</DialogDescription>
          </DialogHeader>

          {/* Platform selection */}
          <div className="social-field social-field--platforms">
            <span>{t('automation.social.platforms')}</span>
            <div className="social-platform-picker">
              {linkedPlatformOptions.map(option => {
                const caps = getPlatformCaps(option.value)
                const elig = platformEligibilityMap[option.value]
                const checked = draft.platforms.includes(option.value)
                const iconName = PLATFORM_BRAND_ICONS[option.value] || 'brand-x'
                return (
                  <label key={option.value} className={!elig?.eligible ? 'social-platform-unlinked' : ''} title={elig?.reason}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePlatform(option.value)}
                      disabled={!elig?.eligible}
                    />
                    <Icon name={iconName} size={14} />
                    <span>{option.label}</span>
                    <small className="social-platform-max-img">（{caps.maxImages}图）</small>
                    {!elig?.eligible && <small className="social-platform-reason">{elig?.reason}</small>}
                  </label>
                )
              })}
              {!linkedPlatformOptions.length && <span className="social-field-hint">暂无已绑定平台</span>}
            </div>
          </div>

          {/* Title */}
          <div className="social-field">
            <div className="social-field-header">
              <label className="social-field-toggle">
                <input type="checkbox" checked={draft.titleEnabled} onChange={e => setDraft(prev => ({ ...prev, titleEnabled: e.target.checked }))} />
                <span>{t('automation.social.title')}</span>
              </label>
              {!draft.titleEnabled && <span className="social-field-hint">不勾选则不支持标题的平台不显示标题（YouTube/Reddit 需要标题才能选中）</span>}
            </div>
            {draft.titleEnabled && (
              <input value={draft.title} maxLength={200} onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))} placeholder="输入标题（YouTube 最多 100 字、Reddit 必填）" />
            )}
          </div>

          {/* Body */}
          <div className="social-field">
            <div className="social-field-header">
              <label className="social-field-toggle">
                <input type="checkbox" checked={draft.bodyEnabled} onChange={e => setDraft(prev => ({ ...prev, bodyEnabled: e.target.checked }))} />
                <span>{t('automation.social.body')}</span>
              </label>
              {draft.bodyEnabled && draft.text.length > 0 && (
                <span className="social-field-hint">
                  {draft.platforms.map(p => {
                    const max = getPlatformCaps(p).bodyMaxChars
                    return max > 0 ? `${platformLabel(p)} ${max}字` : ''
                  }).filter(Boolean).join(' · ') || '各平台字数限制不同'}
                </span>
              )}
            </div>
            {draft.bodyEnabled && (
              <textarea value={draft.text} onChange={e => setDraft(prev => ({ ...prev, text: e.target.value }))} rows={5} maxLength={5000} placeholder="输入正文内容..." />
            )}
          </div>

          {/* Image/Video toggle */}
          <div className="social-field">
            <span>{t('automation.social.media')}</span>
            <div className="social-media-mode-toggle" role="tablist" aria-label={t('automation.social.mediaTypeAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={draft.mediaMode === 'image'}
                className={draft.mediaMode === 'image' ? 'is-active' : ''}
                onClick={() => setDraft(prev => ({ ...prev, mediaMode: 'image' }))}
              >
                图片（最多 35 张{imageItemCount > 0 ? ` · ${imageItemCount}` : ''}）
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={draft.mediaMode === 'video'}
                className={draft.mediaMode === 'video' ? 'is-active' : ''}
                onClick={() => setDraft(prev => ({ ...prev, mediaMode: 'video' }))}
              >
                视频（1 个{videoItemCount > 0 ? ' · 已选' : ''}）
              </button>
            </div>

            {/* Items list */}
            {visibleMediaItems.length > 0 && (
              <div className="social-media-items">
                {visibleMediaItems.map(({ item, index }) => {
                  const previewSrc = mediaPreviewUrls[mediaItemKey(item, index)] || ''
                  const label = item.display_name || item.text_content || item.attachment_id || `素材 ${index + 1}`
                  return (
                    <div key={`${mediaItemKey(item, index)}-${index}`} className="social-media-item" title={label}>
                      {previewSrc ? (
                        item.kind === 'video' ? (
                          <video src={previewSrc} muted playsInline preload="metadata" />
                        ) : (
                          <img src={previewSrc} alt={label} loading="lazy" />
                        )
                      ) : (
                        <div className="social-media-item-placeholder" aria-hidden="true">
                          {item.kind === 'video' ? '🎬' : '🖼'}
                        </div>
                      )}
                      <button type="button" className="social-media-item-remove" aria-label={`移除 ${label}`} onClick={() => removeItem(index)}>×</button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="social-media-actions">
              <Button type="button" variant="outline" size="sm" onClick={openAssetPicker}>{t('automation.social.pickFromWarehouse')}</Button>
              <label className="social-upload-btn">
                <input type="file" accept={draft.mediaMode === 'video' ? 'video/*' : 'image/*'} onChange={e => void handleFileUpload(e)} hidden />
                <span>{uploadingFile ? '上传中...' : '上传'}</span>
              </label>
            </div>
          </div>

          {/* Reddit subreddit */}
          {draft.platforms.includes('reddit') && (
            <div className="social-field">
              <span>Reddit Subreddit</span>
              <input
                value={draft.platformOptions.subreddit || ''}
                onChange={e => setDraft(prev => ({ ...prev, platformOptions: { ...prev.platformOptions, subreddit: e.target.value } }))}
                placeholder="例如：test（不需要 /r/）"
              />
            </div>
          )}

          {/* YouTube visibility */}
          {draft.platforms.includes('youtube') && (
            <div className="social-field">
              <span>YouTube 可见性</span>
              <select
                value={draft.platformOptions.youTubeVisibility || 'private'}
                onChange={e => setDraft(prev => ({ ...prev, platformOptions: { ...prev.platformOptions, youTubeVisibility: e.target.value as any } }))}
              >
                <option value="private">不公开</option>
                <option value="unlisted">不列出</option>
                <option value="public">公开</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="social-editor-actions">
            <Button type="button" variant="outline" onClick={() => setQuickPostOpen(false)}>{t('automation.social.cancel')}</Button>
            <Button type="button" variant="outline" onClick={() => {
              const input = document.createElement('input')
              input.type = 'datetime-local'
              input.min = new Date().toISOString().slice(0, 16)
              input.style.position = 'fixed'
              input.style.opacity = '0'
              document.body.appendChild(input)
              input.showPicker?.()
              input.addEventListener('change', () => {
                setDraft(prev => ({ ...prev, scheduledAt: input.value }))
                document.body.removeChild(input)
              })
              input.addEventListener('blur', () => {
                setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input) }, 300)
              })
            }} disabled={savingPack}>选择定时</Button>
            {draft.scheduledAt && <span className="social-schedule-preview">定时：{formatSocialDate(draft.scheduledAt, t)}</span>}
            <Button type="button" variant="outline" onClick={() => void doQuickPublish(true)} disabled={savingPack || !draft.scheduledAt}>
              {savingPack ? '处理中...' : '定时发布'}
            </Button>
            <Button type="button" onClick={() => void doQuickPublish(false)} disabled={savingPack}>
              {savingPack ? '发布中...' : '立即发布'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset picker dialog */}
      <Dialog open={assetPickerOpen} onOpenChange={setAssetPickerOpen}>
        <DialogContent className="social-asset-dialog">
          <DialogHeader>
            <DialogTitle>{t('automation.social.pickWarehouseTitle')}</DialogTitle>
          </DialogHeader>
          <nav className="social-asset-tabs" role="tablist" aria-label={t('automation.warehouse.tabsAria')}>
            {ASSET_PICKER_TAB_KEYS.map(tab => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                className={assetPickerTab === tab.value ? 'is-active' : ''}
                aria-selected={assetPickerTab === tab.value}
                onClick={() => setAssetPickerTab(tab.value)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </nav>
          <div className="social-asset-grid" aria-busy={assetPickerLoading}>
            {pickerAssets.map(asset => {
              const preview = pickerPreviewUrls[asset.id] || ''
              const label = asset.name || asset.id
              return (
                <button key={asset.id} type="button" className="social-asset-item" onClick={() => addAsset(asset)} title={label}>
                  <span className="social-asset-thumb">
                    {preview && asset.kind === 'video' ? (
                      <video src={preview} muted playsInline preload="metadata" />
                    ) : preview ? (
                      <img src={preview} alt={label} loading="lazy" />
                    ) : (
                      <span className="social-asset-thumb-placeholder" aria-hidden="true">
                        {asset.kind === 'video' ? t('automation.social.kind.video') : t('automation.social.kind.image')}
                      </span>
                    )}
                  </span>
                  <span className="social-asset-copy">
                    <strong>{label}</strong>
                    <small>{asset.kind === 'video' ? t('automation.warehouse.kind.video') : t('automation.warehouse.kind.image')}</small>
                  </span>
                </button>
              )
            })}
            {assetPickerLoading && !pickerAssets.length && (
              <div className="social-pack-empty">{t('automation.warehouse.loading')}</div>
            )}
            {!assetPickerLoading && !pickerAssets.length && (
              <div className="social-pack-empty">
                {assetPickerTab === 'ai-video'
                  ? t('automation.social.warehouseEmptyVideo')
                  : assetPickerTab === 'space'
                    ? t('automation.warehouse.empty.spaceTitle')
                    : t('automation.social.warehouseEmptyImage')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <DialogContent className="social-confirm-dialog">
          <DialogHeader>
            <DialogTitle>{confirmAction?.type === 'publish' ? t('automation.social.confirmPublish') : confirmAction?.type === 'deletePack' ? '确认删除帖子' : t('automation.social.confirmUnbind')}</DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'publish'
                ? `确认立即发布到 ${confirmAction.pack?.platforms?.join('、') || '所选平台'}？发布后无法撤回。`
                : confirmAction?.type === 'deletePack'
                  ? `确认删除「${confirmAction.pack?.name || '未命名帖子'}」？删除后这条记录会从社交发帖列表移除；已发布到平台的原帖不会被撤回。`
                  : `确认解绑「${confirmAction?.account?.name || '社交账号'}」？解绑后已定时的帖子将无法发送。`}
            </DialogDescription>
          </DialogHeader>
          <div className="social-editor-actions">
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>{t('automation.social.cancel')}</Button>
            <Button type="button" variant="destructive" onClick={() => {
              if (confirmAction?.type === 'publish' && confirmAction.pack) {
                void doPublishNow(confirmAction.pack)
              } else if (confirmAction?.type === 'unbind' && confirmAction.account) {
                void deleteSocialAccount(confirmAction.account.id).then(() => loadAccounts())
                setConfirmAction(null)
              } else if (confirmAction?.type === 'deletePack' && confirmAction.pack) {
                void doDeletePack(confirmAction.pack)
              }
            }}>
              {confirmAction?.type === 'publish' ? t('automation.social.confirmPublish') : confirmAction?.type === 'deletePack' ? '确认删除' : t('automation.social.confirmUnbind')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
