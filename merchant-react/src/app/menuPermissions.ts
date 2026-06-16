import { isUserBlockedMenu } from './blockedMenus'
import {
  WORKBENCH_ROUTE_REGISTRY,
  menuIdForLocation as registryMenuIdForLocation,
  menuRoutesFromRegistry,
} from './workbenchRouteRegistry'

export interface MenuPermissionOption {
  id: string
  label: string
  route: string
  requiresFeature?: string
}

const LABEL_BY_MENU: Record<string, string> = {
  dashboard: '仪表盘',
  newChat: '智能工作台',
  search: '搜索',
  kefu: '客服',
  automation: '自动化',
  socialPosting: '社交发帖',
  repository: '市场',
  system: '软件开发',
  marketingImage: '图片设计',
  marketingVideo: '视频制作',
  marketingCopy: '文案生成',
  support: '辣鸡PPT',
  agency: '企业服务',
  feedback: '帮助中心',
  consultant: '对话记录',
  account: '账户中心',
  teamManagement: '团队管理',
  archives: '历史会话',
  generationAssets: '仓库',
  standaloneSite: '独立站',
}

const RAW_MENU_PERMISSION_OPTIONS: MenuPermissionOption[] = menuRoutesFromRegistry().map(({ id, route }) => ({
  id,
  label: LABEL_BY_MENU[id] || id,
  route,
}))

for (const entry of WORKBENCH_ROUTE_REGISTRY) {
  if (entry.id === 'socialPosting') {
    RAW_MENU_PERMISSION_OPTIONS.push({
      id: 'socialPosting',
      label: LABEL_BY_MENU.socialPosting,
      route: entry.canonicalPath,
    })
  }
}

export const MENU_PERMISSION_OPTIONS = RAW_MENU_PERMISSION_OPTIONS
  .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
  .filter(item => !isUserBlockedMenu(item.id))

const REQUIRED_FEATURE_BY_MENU = new Map(
  MENU_PERMISSION_OPTIONS
    .filter(item => item.requiresFeature)
    .map(item => [item.id, String(item.requiresFeature)]),
)

export const DEFAULT_SUBACCOUNT_MENU_PERMISSIONS = MENU_PERMISSION_OPTIONS
  .map(item => item.id)
  .filter(id => id !== 'account' && id !== 'teamManagement' && id !== 'platformTeam')

function currentMember(me: any) {
  return me?.current_member || me?.currentMember || null
}

export function allowedMenuSet(me: any): Set<string> | null {
  const member = currentMember(me)
  if (!member || member.role === 'owner') return null
  const items = member.effective_menu_permissions || member.menu_permissions || []
  if (!Array.isArray(items) || items.length === 0) return null
  return new Set(items.map(String).filter(id => !isUserBlockedMenu(id)))
}

export function hasMenuAccess(me: any, menuId: string): boolean {
  if (isUserBlockedMenu(menuId)) return false
  const allowed = allowedMenuSet(me)
  if (!allowed || allowed.has(menuId)) return true
  return false
}

export function menuIdForLocation(pathname: string, search = ''): string | null {
  return registryMenuIdForLocation(pathname, search)
}

export function menuIdForPath(pathname: string): string | null {
  return menuIdForLocation(pathname, '')
}

export function featureRequiredForMenu(menuId: string): string | null {
  return REQUIRED_FEATURE_BY_MENU.get(menuId) || null
}

export function firstAllowedRoute(me: any): string {
  return MENU_PERMISSION_OPTIONS.find(item => item.id !== 'search' && hasMenuAccess(me, item.id))?.route || '/workbench'
}
