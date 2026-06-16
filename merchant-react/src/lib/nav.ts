import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

// 用户端 chat-app shell 的导航元数据 —— 全局唯一来源。
// Phase 2:  业务大类 + 客服系统静态子菜单 + 营销/支持/代理 的 agent 对话占位。
// Phase 3:  客服系统 12 项打通到 kefu service。
// Phase 4:  营销/支持/代理 的 children 改为从 agent service 拉对话列表。
// Phase 9:  客服迁入顶部快捷入口，自动化成为独立主页面，xiaoone独立到侧栏底部。
//           feedback 业务以「维修工」名称恢复为独立入口。

export type NavCategory =
  | 'consultant' // xiaoone（general · plugin consultant）
  | 'system' // 程序员（原软件开发）
  | 'marketing' // 推广能力（原营销推广）
  | 'marketingImage' // 平面设计（marketing · image）
  | 'marketingVideo' // 视频剪辑（marketing · video）
  | 'marketingCopy' // 营销文案（marketing · text）
  | 'support' // 辣鸡PPT（原业务支持）
  | 'agency' // 商务经理（原商务代理）
  | 'feedback' // 维修工（原问题反馈）
  | 'kefu' // 客服（统一客服主页面）
  | 'automation' // 自动化（顶部快捷入口主页面）

export interface KefuNavItem {
  key: string // 'stores' / 'corpus' / ...
  label: string
  description: string
}

export interface KefuNavGroup {
  title: string
  items: KefuNavItem[]
}

// 客服平台的 CRUD 菜单（Phase 3 实现，Phase 8 收敛）。
// 注：「客户咨询」入口在顶部 quick-action（带未读红点），等待中 / 进行中 / 已归档 都在那一页里切换；
// 二级菜单只保留元数据/配置/渠道相关 CRUD，避免与 quick-action 入口产生重复操作。
export const KEFU_GROUPS: KefuNavGroup[] = [
  {
    title: '元数据',
    items: [
      { key: 'qa-templates', label: 'AI 问答库', description: '上传资料、AI 问答条目、访客快捷问题与自动回复' },
      { key: 'quick-replies', label: '快捷回复', description: '客服接待台一键快速回答' },
    ],
  },
  {
    title: '店铺管理',
    items: [
      { key: 'stores', label: '店铺', description: '多店铺设置 + SDK 嵌码' },
    ],
  },
  {
    title: '接入与集成',
    items: [
      { key: 'tech-config', label: '技术配置', description: '外部渠道、Web/App SDK、REST API 说明与凭据摘要' },
    ],
  },
]
// Token 用量 / 账单 / 团队 已迁移至「账户」模块统一管理

export interface BusinessCategory {
  key: NavCategory
  label: string
  domain: 'general' | 'marketing' | 'support' | 'agency' | 'kefu' | 'feedback'
  /** chat-app 风格里 pencil 图标 = 新建对话（agent 或 自动化 hero） */
  pencil: boolean
  /** Phase 1-2 占位标志 */
  placeholder?: 'soon'
  /**
   * 仅 `domain === 'general'` 且 `childrenKind === 'threads'` 时生效：
   * 将同域线程拆到「xiaoone / 程序员 / 自动化」侧栏分组（按 thread.plugin_key）。
   */
  generalThreadBucket?: 'software' | 'automation' | 'consultant'
  /**
   * 子菜单类型：
   * - static       客服 12 项 CRUD 子菜单
   * - threads      AI agent 对话历史（marketing/support/agency）
   * - placeholder  「即将上线」占位
   * - none         无二级菜单（点击一级即进入对应主视图）
   */
  childrenKind: 'static' | 'threads' | 'placeholder' | 'none'
  description: string
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    key: 'system',
    label: '软件开发',
    domain: 'general',
    pencil: true,
    childrenKind: 'threads',
    generalThreadBucket: 'software',
    description: 'xiaoone / 专业团队 — 由 AI 协助评估 / 编写 / 联调',
  },
  {
    key: 'marketing',
    label: '推广能力',
    domain: 'marketing',
    pencil: true,
    childrenKind: 'threads',
    description: '图片素材、短视频和通用营销文案创作',
  },
  {
    key: 'marketingImage',
    label: '图片设计',
    domain: 'marketing',
    pencil: true,
    childrenKind: 'threads',
    description: '图片素材生成与改图入口',
  },
  {
    key: 'marketingVideo',
    label: '视频制作',
    domain: 'marketing',
    pencil: true,
    childrenKind: 'threads',
    description: '短视频脚本与视频生成入口',
  },
  {
    key: 'marketingCopy',
    label: '文案生成',
    domain: 'marketing',
    pencil: true,
    childrenKind: 'threads',
    description: '营销文案、选题与发布内容入口',
  },
  {
    key: 'support',
    label: '辣鸡PPT',
    domain: 'support',
    pencil: true,
    childrenKind: 'threads',
    description: '演示文稿生成：方案汇报 / 工作总结 / 产品介绍 / 数据报告',
  },
  {
    key: 'agency',
    label: '企业服务',
    domain: 'agency',
    pencil: true,
    childrenKind: 'threads',
    description: '海内外企业办理 / 全球牌照资质申请 / 出口物流报关 / 货款结汇退税',
  },
  {
    key: 'feedback',
    label: '帮助中心',
    domain: 'feedback',
    pencil: true,
    childrenKind: 'threads',
    description: '缺陷反馈 / 需求建议 / 产品咨询 / 投诉与争议',
  },
]

export const CONSULTANT_CATEGORY: BusinessCategory = {
  key: 'consultant',
  label: 'xiaoone',
  domain: 'general',
  pencil: true,
  childrenKind: 'threads',
  generalThreadBucket: 'consultant',
  description: '描述目标即可；xiaoone会澄清问题、整理建议，并推荐下一步业务入口',
}

export type QuickActionKey =
  | 'new-chat'  // 新对话（统一业务创建入口）
  | 'search'    // 全局主题搜索
  | 'live-chat'  // 客服（客户咨询 + 店铺 / AI 问答库 / 快捷回复 / 技术配置）
  | 'automation' // 自动化主页面

export interface QuickAction {
  key: QuickActionKey
  label: string
  icon: string
  /** 是否在标签右侧渲染「即将上线」灰色徽标 */
  soon?: boolean
  /** 是否在右侧显示未读数字角标（live-chat） */
  badge?: 'unread'
}

/**
 * 顶部 quick-action 顺序：新对话 → 搜索 → 客服 → 自动化。
 * xiaoone作为和「智能团队」同级的底部 section；账户仅从底部「设置」菜单进入。
 */
export const QUICK_ACTIONS: QuickAction[] = [
  { key: 'new-chat', label: '新对话', icon: 'pencil' },
  { key: 'search', label: '搜索', icon: 'search' },
  { key: 'live-chat', label: '客服', icon: 'consult', badge: 'unread' },
  { key: 'automation', label: '自动化', icon: 'sparkles' },
]

export function findKefuItem(itemKey: string): { item: KefuNavItem; group: KefuNavGroup } | null {
  for (const g of KEFU_GROUPS) {
    for (const item of g.items) {
      if (item.key === itemKey)
        return { item, group: g }
    }
  }
  return null
}

const KEFU_GROUP_TITLE_KEYS: Record<string, string> = {
  '元数据': 'common.nav.kefuGroup.metadata',
  '店铺管理': 'common.nav.kefuGroup.stores',
  '接入与集成': 'common.nav.kefuGroup.integration',
}

const KEFU_ITEM_KEYS: Record<string, { label: string; desc: string }> = {
  'qa-templates': { label: 'common.nav.kefu.qaTemplates', desc: 'common.nav.kefu.qaTemplates.desc' },
  'quick-replies': { label: 'common.nav.kefu.quickReplies', desc: 'common.nav.kefu.quickReplies.desc' },
  stores: { label: 'common.nav.kefu.stores', desc: 'common.nav.kefu.stores.desc' },
  'tech-config': { label: 'common.nav.kefu.techConfig', desc: 'common.nav.kefu.techConfig.desc' },
}

const BUSINESS_LABEL_KEYS: Record<NavCategory, { label: string; description?: string }> = {
  consultant: { label: 'common.nav.consultant' },
  system: { label: 'common.nav.system', description: 'biz.system' },
  marketing: { label: 'common.nav.marketing', description: 'biz.marketing' },
  marketingImage: { label: 'common.nav.marketingImage' },
  marketingVideo: { label: 'common.nav.marketingVideo' },
  marketingCopy: { label: 'common.nav.marketingCopy' },
  support: { label: 'common.nav.support' },
  agency: { label: 'common.nav.agency' },
  feedback: { label: 'common.nav.feedback' },
  kefu: { label: 'common.nav.kefu' },
  automation: { label: 'common.nav.automation' },
}

const QUICK_ACTION_LABEL_KEYS: Record<QuickActionKey, string> = {
  'new-chat': 'common.nav.quick.newChat',
  search: 'common.nav.quick.search',
  'live-chat': 'common.nav.quick.liveChat',
  automation: 'common.nav.quick.automation',
}

function localizeBusinessCategory(cat: BusinessCategory, locale: Locale): BusinessCategory {
  const keys = BUSINESS_LABEL_KEYS[cat.key]
  return {
    ...cat,
    label: keys ? uiT(locale, keys.label, cat.label) : cat.label,
    description: keys?.description ? uiT(locale, keys.description, cat.description) : cat.description,
  }
}

export function getKefuGroups(locale: Locale): KefuNavGroup[] {
  return KEFU_GROUPS.map(group => ({
    ...group,
    title: uiT(locale, KEFU_GROUP_TITLE_KEYS[group.title] || group.title, group.title),
    items: group.items.map(item => {
      const keys = KEFU_ITEM_KEYS[item.key]
      return keys
        ? {
            ...item,
            label: uiT(locale, keys.label, item.label),
            description: uiT(locale, keys.desc, item.description),
          }
        : item
    }),
  }))
}

export function getBusinessCategories(locale: Locale): BusinessCategory[] {
  return BUSINESS_CATEGORIES.map(cat => localizeBusinessCategory(cat, locale))
}

export function getConsultantCategory(locale: Locale): BusinessCategory {
  return localizeBusinessCategory(CONSULTANT_CATEGORY, locale)
}

export function getQuickActions(locale: Locale): QuickAction[] {
  return QUICK_ACTIONS.map(action => ({
    ...action,
    label: uiT(locale, QUICK_ACTION_LABEL_KEYS[action.key], action.label),
  }))
}

export function getNavLabels(locale: Locale) {
  return {
    kefuGroups: getKefuGroups(locale),
    businessCategories: getBusinessCategories(locale),
    consultantCategory: getConsultantCategory(locale),
    quickActions: getQuickActions(locale),
  }
}
