import type { AgentDomain } from '@xiaoone/chat-kit'
import type { BusinessKey } from '../lib/composer'
import type { NavCategory } from '../lib/nav'

export type MarketingRouteMode = 'image' | 'video' | 'text'

export type WorkbenchModuleId =
  | 'newChat'
  | 'consultant'
  | 'automation'
  | 'system'
  | 'marketingImage'
  | 'marketingVideo'
  | 'marketingCopy'
  | 'support'
  | 'agency'
  | 'feedback'

export type WorkbenchRouteKind = 'home' | 'agent' | 'page'

export interface WorkbenchQueryTab {
  param: string
  value: string
  menuId?: string
  kefuItem?: string
  labelKey?: string
}

export interface WorkbenchRouteRegistryEntry {
  id: string
  canonicalPath: string
  legacyPaths: string[]
  kind: WorkbenchRouteKind
  domain: AgentDomain | string
  entry: BusinessKey | string
  threadPath: string | null
  menuId: string
  topbarId: string
  sidebarSection: string | null
  queryTabs?: WorkbenchQueryTab[]
  moduleId?: WorkbenchModuleId
  modeKey?: MarketingRouteMode | null
  labelKey?: string
  fallbackLabel?: string
  cardId?: string | null
  navCategory?: NavCategory | null
  assistant?: boolean
  pluginBucket?: string
}

const THREAD = '/threads/'

export const WORKBENCH_ROUTE_REGISTRY: WorkbenchRouteRegistryEntry[] = [
  {
    id: 'dashboard',
    canonicalPath: '/workbench',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'consultant',
    threadPath: null,
    menuId: 'dashboard',
    topbarId: 'dashboard',
    sidebarSection: 'quick',
    labelKey: 'common.workbench.status.pageTitle',
    fallbackLabel: '仪表盘',
  },
  {
    id: 'consultant',
    canonicalPath: '/workbench/assistant',
    legacyPaths: ['/workbench/consultant', '/workbench/agent'],
    kind: 'agent',
    domain: 'general',
    entry: 'consultant',
    threadPath: '/workbench/assistant',
    menuId: 'consultant',
    topbarId: 'newChat',
    sidebarSection: 'consultant',
    moduleId: 'consultant',
    labelKey: 'biz.xiaoone',
    fallbackLabel: '智能助手',
    cardId: 'xiaoone',
    navCategory: 'consultant',
    assistant: true,
    pluginBucket: 'assistant',
  },
  {
    id: 'system',
    canonicalPath: '/workbench/system',
    legacyPaths: [],
    kind: 'agent',
    domain: 'general',
    entry: 'software',
    threadPath: '/workbench/system',
    menuId: 'system',
    topbarId: 'system',
    sidebarSection: 'business',
    moduleId: 'system',
    labelKey: 'biz.system',
    fallbackLabel: '软件开发',
    cardId: 'software',
    navCategory: 'system',
    pluginBucket: 'system',
  },
  {
    id: 'marketingImage',
    canonicalPath: '/workbench/marketing/image',
    legacyPaths: [],
    kind: 'agent',
    domain: 'marketing',
    entry: 'marketing',
    threadPath: '/workbench/marketing/image',
    menuId: 'marketingImage',
    topbarId: 'marketingImage',
    sidebarSection: 'business',
    moduleId: 'marketingImage',
    modeKey: 'image',
    labelKey: 'biz.marketing.image',
    fallbackLabel: '图片设计',
    cardId: 'marketingImage',
    navCategory: 'marketingImage',
    pluginBucket: 'marketing:image',
  },
  {
    id: 'marketingVideo',
    canonicalPath: '/workbench/marketing/video',
    legacyPaths: [],
    kind: 'agent',
    domain: 'marketing',
    entry: 'marketing',
    threadPath: '/workbench/marketing/video',
    menuId: 'marketingVideo',
    topbarId: 'marketingVideo',
    sidebarSection: 'business',
    moduleId: 'marketingVideo',
    modeKey: 'video',
    labelKey: 'biz.marketing.video',
    fallbackLabel: '视频制作',
    cardId: 'marketingVideo',
    navCategory: 'marketingVideo',
    pluginBucket: 'marketing:video',
  },
  {
    id: 'marketingCopy',
    canonicalPath: '/workbench/marketing/copy',
    legacyPaths: ['/workbench/marketing'],
    kind: 'agent',
    domain: 'marketing',
    entry: 'marketing',
    threadPath: '/workbench/marketing/copy',
    menuId: 'marketingCopy',
    topbarId: 'marketingCopy',
    sidebarSection: 'business',
    moduleId: 'marketingCopy',
    modeKey: 'text',
    labelKey: 'biz.marketing.text',
    fallbackLabel: '文案生成',
    cardId: 'marketingCopy',
    navCategory: 'marketingCopy',
    pluginBucket: 'marketing:text',
  },
  {
    id: 'support',
    canonicalPath: '/workbench/support',
    legacyPaths: [],
    kind: 'agent',
    domain: 'support',
    entry: 'support',
    threadPath: '/workbench/support',
    menuId: 'support',
    topbarId: 'support',
    sidebarSection: 'business',
    moduleId: 'support',
    labelKey: 'biz.support',
    fallbackLabel: '辣鸡PPT',
    cardId: null,
    navCategory: 'support',
    pluginBucket: 'support',
  },
  {
    id: 'agency',
    canonicalPath: '/workbench/agency',
    legacyPaths: [],
    kind: 'agent',
    domain: 'agency',
    entry: 'agency',
    threadPath: '/workbench/agency',
    menuId: 'agency',
    topbarId: 'agency',
    sidebarSection: 'business',
    moduleId: 'agency',
    labelKey: 'biz.agency',
    fallbackLabel: '企业服务',
    cardId: 'agency',
    navCategory: 'agency',
    pluginBucket: 'agency',
  },
  {
    id: 'feedback',
    canonicalPath: '/workbench/feedback',
    legacyPaths: [],
    kind: 'agent',
    domain: 'feedback',
    entry: 'feedback',
    threadPath: '/workbench/feedback',
    menuId: 'feedback',
    topbarId: 'feedback',
    sidebarSection: 'business',
    moduleId: 'feedback',
    labelKey: 'biz.feedback',
    fallbackLabel: '帮助中心',
    cardId: 'feedback',
    navCategory: 'feedback',
    pluginBucket: 'feedback',
  },
  {
    id: 'automation',
    canonicalPath: '/workbench/automation',
    legacyPaths: [],
    kind: 'agent',
    domain: 'general',
    entry: 'automation',
    threadPath: '/workbench/automation',
    menuId: 'automation',
    topbarId: 'automation',
    sidebarSection: 'quick',
    moduleId: 'automation',
    labelKey: 'biz.automation',
    fallbackLabel: '自动化',
    cardId: null,
    navCategory: 'automation',
    pluginBucket: 'automation',
  },
  {
    id: 'socialPosting',
    canonicalPath: '/workbench/automation/social',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'automation',
    threadPath: null,
    menuId: 'socialPosting',
    topbarId: 'socialPosting',
    sidebarSection: 'quick',
  },
  {
    id: 'kefu',
    canonicalPath: '/workbench/kefu',
    legacyPaths: ['/workbench/live-chat'],
    kind: 'page',
    domain: 'kefu',
    entry: 'kefu',
    threadPath: null,
    menuId: 'kefu',
    topbarId: 'kefu',
    sidebarSection: 'quick',
  },
  {
    id: 'kefuSettings',
    canonicalPath: '/workbench/kefu/settings',
    legacyPaths: [
      '/workbench/kefu/stores',
      '/workbench/kefu/qa-templates',
      '/workbench/kefu/quick-replies',
      '/workbench/kefu/tech-config',
      '/workbench/corpus',
    ],
    kind: 'page',
    domain: 'kefu',
    entry: 'kefu',
    threadPath: null,
    menuId: 'kefu',
    topbarId: 'kefu',
    sidebarSection: 'quick',
    queryTabs: [
      { param: 'tab', value: 'stores', kefuItem: 'stores' },
      { param: 'tab', value: 'uploads', kefuItem: 'uploads' },
      { param: 'tab', value: 'qa-library', kefuItem: 'qa-library' },
      { param: 'tab', value: 'quick-replies', kefuItem: 'quick-replies' },
      { param: 'tab', value: 'tech-config', kefuItem: 'tech-config' },
      { param: 'tab', value: 'auto-reply', kefuItem: 'qa-library' },
      { param: 'tab', value: 'profile', kefuItem: 'uploads' },
    ],
  },
  {
    id: 'kefuHelpCenter',
    canonicalPath: '/workbench/kefu/help-center',
    legacyPaths: [],
    kind: 'page',
    domain: 'kefu',
    entry: 'kefu',
    threadPath: null,
    menuId: 'kefu',
    topbarId: 'kefu',
    sidebarSection: 'quick',
    queryTabs: [{ param: 'tab', value: 'help-center', kefuItem: 'help-center' }],
  },
  {
    id: 'repository',
    canonicalPath: '/workbench/repository',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'repository',
    threadPath: null,
    menuId: 'repository',
    topbarId: 'repository',
    sidebarSection: 'quick',
  },
  {
    id: 'fileLibrary',
    canonicalPath: '/workbench/file-library',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'file-library',
    threadPath: null,
    menuId: 'fileLibrary',
    topbarId: 'fileLibrary',
    sidebarSection: null,
  },
  {
    id: 'generationAssets',
    canonicalPath: '/workbench/generation-assets',
    legacyPaths: [
      '/workbench/us-numbers',
      '/workbench/us-numbers/sms',
      '/workbench/dcpay-cards',
      '/workbench/dcpay-cards/transactions',
    ],
    kind: 'page',
    domain: 'general',
    entry: 'generation-assets',
    threadPath: null,
    menuId: 'generationAssets',
    topbarId: 'generationAssets',
    sidebarSection: 'quick',
    queryTabs: [
      { param: 'tab', value: 'numbers', menuId: 'generationAssets', labelKey: 'view.usPhoneNumbers' },
      { param: 'tab', value: 'ad-card', menuId: 'generationAssets', labelKey: 'view.dcpayCards' },
      { param: 'tab', value: 'accelerator', menuId: 'generationAssets', labelKey: 'view.accelerator' },
    ],
  },
  {
    id: 'account',
    canonicalPath: '/workbench/account',
    legacyPaths: ['/workbench/team-management', '/workbench/archives'],
    kind: 'page',
    domain: 'account',
    entry: 'account',
    threadPath: null,
    menuId: 'account',
    topbarId: 'account',
    sidebarSection: null,
    queryTabs: [
      { param: 'section', value: 'team', menuId: 'teamManagement' },
      { param: 'section', value: 'archives', menuId: 'archives' },
      { param: 'section', value: 'account', menuId: 'account' },
      { param: 'section', value: 'partner', menuId: 'partnerPlan' },
    ],
  },
  {
    id: 'standaloneSite',
    canonicalPath: '/workbench/standalone-site',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'standalone-site',
    threadPath: null,
    menuId: 'standaloneSite',
    topbarId: 'standaloneSite',
    sidebarSection: 'quick',
  },
  {
    id: 'skills',
    canonicalPath: '/workbench/skills',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'skills',
    threadPath: null,
    menuId: 'skills',
    topbarId: 'skills',
    sidebarSection: null,
  },
  {
    id: 'hermesPanel',
    canonicalPath: '/workbench/hermes',
    legacyPaths: [],
    kind: 'page',
    domain: 'general',
    entry: 'hermes',
    threadPath: null,
    menuId: 'hermesPanel',
    topbarId: 'hermesPanel',
    sidebarSection: null,
  },
]

export const XIAOWAN_ASSISTANT_PLUGIN_KEY = 'xiaowan-asst'
export const CONSULTANT_PLUGIN_KEY = 'consultant'
export const AUTOMATION_AGENT_PLUGIN_KEYS = new Set([
  'hot-product', 'industry', 'competitor', 'ai', 'product', 'notify-tg',
  'file-organize', 'install-doc', 'corpus', 'sop',
])

const REGISTRY_BY_ID = new Map(WORKBENCH_ROUTE_REGISTRY.map(entry => [entry.id, entry]))
const REGISTRY_BY_CANONICAL = new Map(WORKBENCH_ROUTE_REGISTRY.map(entry => [entry.canonicalPath, entry]))
const AGENT_MODULE_IDS = new Set(
  WORKBENCH_ROUTE_REGISTRY
    .filter(entry => entry.moduleId && entry.kind !== 'home')
    .map(entry => entry.moduleId as WorkbenchModuleId),
)
const LEGACY_REDIRECTS = new Map<string, WorkbenchRouteRegistryEntry>()
for (const entry of WORKBENCH_ROUTE_REGISTRY) {
  for (const legacy of entry.legacyPaths)
    LEGACY_REDIRECTS.set(legacy, entry)
}

function normalizePathname(pathname: string): string {
  const pathOnly = (pathname || '/').split('?')[0] || '/'
  if (pathOnly === '/') return '/'
  return pathOnly.replace(/\/+$/, '') || '/'
}

function parseSearch(search?: string | URLSearchParams | null): URLSearchParams {
  if (search instanceof URLSearchParams) return new URLSearchParams(search)
  return new URLSearchParams(search || '')
}

function stripThreadSuffix(pathname: string): { basePath: string; threadId: string | null } {
  const idx = pathname.indexOf(THREAD)
  if (idx < 0) return { basePath: pathname, threadId: null }
  const basePath = pathname.slice(0, idx)
  const threadId = pathname.slice(idx + THREAD.length).split('/')[0]?.trim() || null
  return { basePath, threadId }
}

function entryMatchesPath(entry: WorkbenchRouteRegistryEntry, basePath: string): boolean {
  if (entry.canonicalPath === '/workbench') return basePath === '/workbench'
  if (basePath === entry.canonicalPath) return true
  if (entry.threadPath && basePath.startsWith(`${entry.threadPath}${THREAD}`)) return true
  if (entry.legacyPaths.includes(basePath)) return true
  return false
}

function findRegistryEntry(pathname: string): WorkbenchRouteRegistryEntry | null {
  const normalized = normalizePathname(pathname)
  const { basePath } = stripThreadSuffix(normalized)
  const direct = REGISTRY_BY_CANONICAL.get(basePath)
  if (direct) return direct
  const legacy = LEGACY_REDIRECTS.get(basePath)
  if (legacy) return legacy
  const sorted = [...WORKBENCH_ROUTE_REGISTRY].sort((a, b) => b.canonicalPath.length - a.canonicalPath.length)
  return sorted.find(entry => entryMatchesPath(entry, basePath)) || null
}

function matchedQueryTab(entry: WorkbenchRouteRegistryEntry, search: URLSearchParams): WorkbenchQueryTab | null {
  if (!entry.queryTabs?.length) return null
  for (const tab of entry.queryTabs) {
    if (search.get(tab.param) === tab.value) return tab
  }
  return null
}

export function registryEntryById(id: string): WorkbenchRouteRegistryEntry | undefined {
  return REGISTRY_BY_ID.get(id)
}

export function registryEntryForModule(moduleId: WorkbenchModuleId): WorkbenchRouteRegistryEntry | undefined {
  return WORKBENCH_ROUTE_REGISTRY.find(entry => entry.moduleId === moduleId && entry.canonicalPath === routeCanonicalForModule(moduleId))
}

export function routeCanonicalForModule(moduleId: WorkbenchModuleId): string {
  if (moduleId === 'newChat') return '/workbench/assistant'
  const entry = WORKBENCH_ROUTE_REGISTRY.find(item => item.moduleId === moduleId)
  return entry?.canonicalPath || '/workbench'
}

export function isAgentModuleId(moduleId: string): moduleId is WorkbenchModuleId {
  return AGENT_MODULE_IDS.has(moduleId as WorkbenchModuleId)
}

export function isLegacyWorkbenchPath(pathname: string): boolean {
  const { basePath } = stripThreadSuffix(normalizePathname(pathname))
  return LEGACY_REDIRECTS.has(basePath)
}

export function legacyRedirectTarget(pathname: string, search?: string | URLSearchParams | null): string | null {
  const normalized = normalizePathname(pathname)
  const params = parseSearch(search)
  const { basePath, threadId } = stripThreadSuffix(normalized)
  const entry = LEGACY_REDIRECTS.get(basePath)
  if (!entry) return null

  if (entry.id === 'generationAssets') {
    if (basePath.startsWith('/workbench/us-numbers')) {
      params.set('tab', 'numbers')
      const query = params.toString()
      return `/workbench/generation-assets${query ? `?${query}` : '?tab=numbers'}`
    }
    if (basePath.startsWith('/workbench/dcpay-cards')) {
      params.set('tab', 'ad-card')
      if (basePath.includes('/transactions')) params.set('dcpay', 'open')
      return `/workbench/generation-assets?${params.toString()}`
    }
  }

  if (entry.id === 'kefuSettings') {
    const tabByLegacy: Record<string, string> = {
      '/workbench/kefu/stores': 'stores',
      '/workbench/kefu/qa-templates': 'qa-library',
      '/workbench/kefu/quick-replies': 'quick-replies',
      '/workbench/kefu/tech-config': 'tech-config',
      '/workbench/corpus': 'uploads',
    }
    const tab = tabByLegacy[basePath]
    if (tab) {
      params.set('tab', tab)
      return `/workbench/kefu/settings?${params.toString()}`
    }
  }

  if (entry.id === 'account') {
    if (basePath === '/workbench/team-management') {
      params.set('section', 'team')
      return `/workbench/account?${params.toString()}`
    }
    if (basePath === '/workbench/archives') {
      params.set('section', 'archives')
      return `/workbench/account?${params.toString()}`
    }
  }

  if (entry.id === 'consultant' && entry.threadPath) {
    const target = threadId ? `${entry.threadPath}${THREAD}${encodeURIComponent(threadId)}` : entry.canonicalPath
    const query = params.toString()
    return query ? `${target}?${query}` : target
  }

  if (entry.id === 'marketingCopy' && basePath === '/workbench/marketing') {
    const target = threadId ? `${entry.threadPath}${THREAD}${encodeURIComponent(threadId)}` : entry.canonicalPath
    const query = params.toString()
    return query ? `${target}?${query}` : target
  }

  const query = params.toString()
  return query ? `${entry.canonicalPath}?${query}` : entry.canonicalPath
}

export function menuIdForLocation(pathname: string, search?: string | URLSearchParams | null): string | null {
  const normalized = normalizePathname(pathname)
  const params = parseSearch(search)
  const { basePath } = stripThreadSuffix(normalized)
  const entry = findRegistryEntry(normalized)
  if (!entry) return null

  const queryTab = matchedQueryTab(entry, params)
  if (queryTab?.menuId) return queryTab.menuId

  if (entry.id === 'account') {
    const section = params.get('section')
    if (section === 'team') return 'teamManagement'
    if (section === 'archives') return 'archives'
    if (section === 'partner') return 'partnerPlan'
  }

  if (basePath.startsWith('/workbench/automation/social')) return 'socialPosting'
  if (basePath.startsWith('/workbench/automation')) return 'automation'
  return entry.menuId
}

export function resolveRegistryMatch(pathname: string, search?: string | URLSearchParams | null) {
  const normalized = normalizePathname(pathname)
  const params = parseSearch(search)
  const { basePath, threadId } = stripThreadSuffix(normalized)
  const entry = findRegistryEntry(normalized)
  if (!entry) return null
  const isLegacyPath = entry.legacyPaths.includes(basePath)
    || (LEGACY_REDIRECTS.get(basePath) === entry && basePath !== entry.canonicalPath)
  return {
    entry,
    pathname: normalized,
    canonicalPath: entry.canonicalPath,
    threadId,
    isLegacyPath: Boolean(isLegacyPath),
    queryTab: matchedQueryTab(entry, params),
  }
}

export function menuRoutesFromRegistry(): Array<{ id: string; route: string }> {
  const seen = new Set<string>()
  const routes: Array<{ id: string; route: string }> = []
  for (const entry of WORKBENCH_ROUTE_REGISTRY) {
    if (seen.has(entry.menuId)) continue
    seen.add(entry.menuId)
    routes.push({ id: entry.menuId, route: entry.canonicalPath })
  }
  routes.push({ id: 'search', route: '/workbench' })
  routes.push({ id: 'teamManagement', route: '/workbench/account?section=team' })
  routes.push({ id: 'archives', route: '/workbench/account?section=archives' })
  return routes
}
