import type { AgentDomain } from '@xiaoone/chat-kit'
import type { BusinessKey } from '../lib/composer'
import type { NavCategory } from '../lib/nav'
import {
  AUTOMATION_AGENT_PLUGIN_KEYS,
  CONSULTANT_PLUGIN_KEY,
  XIAOWAN_ASSISTANT_PLUGIN_KEY,
  isAgentModuleId,
  legacyRedirectTarget,
  registryEntryForModule,
  resolveRegistryMatch,
  routeCanonicalForModule,
  type MarketingRouteMode,
  type WorkbenchModuleId,
} from './workbenchRouteRegistry'

export type {
  MarketingRouteMode,
  WorkbenchModuleId,
} from './workbenchRouteRegistry'

export {
  AUTOMATION_AGENT_PLUGIN_KEYS,
  CONSULTANT_PLUGIN_KEY,
  XIAOWAN_ASSISTANT_PLUGIN_KEY,
  legacyRedirectTarget,
  menuIdForLocation,
} from './workbenchRouteRegistry'

export type WorkbenchAgentModuleId = Exclude<WorkbenchModuleId, 'newChat'>

export type NewConversationCardId =
  | 'xiaoone'
  | 'software'
  | 'marketingImage'
  | 'marketingVideo'
  | 'marketingCopy'
  | 'agency'
  | 'feedback'

type WorkbenchRouteKind = 'home' | 'agent' | 'page'

export type WorkbenchPageKind = 'home' | 'new' | 'detail'

export interface WorkbenchRouteContext {
  kind: WorkbenchRouteKind
  pageKind: WorkbenchPageKind
  path: string
  canonicalPath: string
  isLegacyPath: boolean
  moduleId: WorkbenchModuleId
  domain: AgentDomain
  entry: BusinessKey
  modeKey: MarketingRouteMode | null
  labelKey: string
  fallbackLabel: string
  threadId: string | null
  cardId: NewConversationCardId | null
  navCategory: NavCategory | null
  topbarModuleId: string
  assistant: boolean
  pluginBucket: string
  routeContextKey: string
  menuId: string
  queryTab: string | null
}

const THREAD_SEGMENT = '/threads/'

function routeContextKeyFor(
  moduleId: WorkbenchModuleId,
  pluginBucket: string,
  modeKey: MarketingRouteMode | null,
  threadId?: string | null,
  kind: WorkbenchRouteKind = 'agent',
): string {
  if (kind === 'home') return 'home:newChat'
  const base = `agent:${moduleId}:${modeKey || pluginBucket}`
  const id = String(threadId || '').trim()
  return id ? `${base}:thread:${id}` : base
}

function buildRouteContext(match: NonNullable<ReturnType<typeof resolveRegistryMatch>>): WorkbenchRouteContext {
  const { entry, pathname, canonicalPath, threadId, isLegacyPath, queryTab } = match
  const kind: WorkbenchRouteKind = entry.kind === 'home' ? 'home' : entry.kind === 'agent' ? 'agent' : 'page'
  const moduleId = entry.moduleId || 'newChat'
  const pageKind: WorkbenchPageKind = kind === 'home'
    ? 'home'
    : threadId
      ? 'detail'
      : kind === 'page'
        ? 'home'
        : 'new'
  const pluginBucket = entry.pluginBucket || entry.id
  return {
    kind,
    pageKind,
    path: pathname,
    canonicalPath,
    isLegacyPath,
    moduleId,
    domain: entry.domain as AgentDomain,
    entry: entry.entry as BusinessKey,
    modeKey: entry.modeKey ?? null,
    labelKey: entry.labelKey || `biz.${entry.id}`,
    fallbackLabel: entry.fallbackLabel || entry.id,
    threadId,
    cardId: (entry.cardId as NewConversationCardId | null) ?? null,
    navCategory: (entry.navCategory as NavCategory | null) ?? null,
    topbarModuleId: entry.topbarId,
    assistant: Boolean(entry.assistant),
    pluginBucket,
    routeContextKey: routeContextKeyFor(moduleId, pluginBucket, entry.modeKey ?? null, threadId, kind),
    menuId: entry.menuId,
    queryTab: queryTab?.value ?? null,
  }
}

export function resolveWorkbenchRoute(pathname: string, search?: string | URLSearchParams | null): WorkbenchRouteContext | null {
  const match = resolveRegistryMatch(pathname, search)
  return match ? buildRouteContext(match) : null
}

export function routeForModule(moduleId: WorkbenchModuleId): string {
  return routeCanonicalForModule(moduleId)
}

export function canonicalHomeForRouteContext(route: Pick<WorkbenchRouteContext, 'canonicalPath' | 'moduleId'>): string {
  return route.canonicalPath || routeForModule(route.moduleId)
}

export function activeNewConversationCard(pathname: string, search?: string | URLSearchParams | null): NewConversationCardId | null {
  const route = resolveWorkbenchRoute(pathname, search)
  if (!route || (route.pageKind !== 'home' && route.pageKind !== 'new'))
    return null
  return route.cardId || null
}

export function routeMatchesModule(moduleId: WorkbenchModuleId, pathname: string, search?: string | URLSearchParams | null): boolean {
  const route = resolveWorkbenchRoute(pathname, search)
  if (!route) return false
  if (moduleId === 'newChat') return route.moduleId === 'consultant' && route.pageKind === 'new'
  return route.moduleId === moduleId
}

export function moduleForMarketingMode(modeKey?: string | null): WorkbenchModuleId {
  if (modeKey === 'image') return 'marketingImage'
  if (modeKey === 'video') return 'marketingVideo'
  return 'marketingCopy'
}

export function routeForMarketingMode(modeKey?: string | null): string {
  return routeForModule(moduleForMarketingMode(modeKey))
}

function routeWithThreadPath(basePath: string, threadId?: string | null): string {
  const id = String(threadId || '').trim()
  return id ? `${basePath}${THREAD_SEGMENT}${encodeURIComponent(id)}` : basePath
}

export type ThreadRouteLike = {
  id?: string | number | null
  domain?: string | null
  plugin_key?: string | null
  mode_key?: string | null
}

export function moduleForThread(thread: ThreadRouteLike): WorkbenchModuleId {
  const domain = String(thread.domain || '').trim()
  const plugin = String(thread.plugin_key || '').trim()
  if (domain === 'marketing') return moduleForMarketingMode(thread.mode_key)
  if (domain === 'support') return 'support'
  if (domain === 'agency') return 'agency'
  if (domain === 'feedback') return 'feedback'
  if (domain === 'general') {
    if (plugin === XIAOWAN_ASSISTANT_PLUGIN_KEY || plugin === CONSULTANT_PLUGIN_KEY) return 'consultant'
    if (AUTOMATION_AGENT_PLUGIN_KEYS.has(plugin)) return 'automation'
    return 'system'
  }
  return 'consultant'
}

export function routeForThread(thread: ThreadRouteLike): string {
  const moduleId = moduleForThread(thread)
  const threadId = thread.id == null ? '' : String(thread.id)
  const basePath = routeForModule(moduleId)
  return routeWithThreadPath(basePath, threadId)
}

export function definitionForModule(moduleId: WorkbenchModuleId): WorkbenchRouteContext {
  const entry = registryEntryForModule(moduleId)
  const canonicalPath = routeForModule(moduleId)
  const match = resolveRegistryMatch(canonicalPath)
  if (match) return buildRouteContext(match)
  return buildRouteContext({
    entry: entry!,
    pathname: canonicalPath,
    canonicalPath,
    threadId: null,
    isLegacyPath: false,
    queryTab: null,
  })
}

export function isWorkbenchAgentModuleId(moduleId: string): moduleId is WorkbenchAgentModuleId {
  return isAgentModuleId(moduleId) && moduleId !== 'newChat'
}
