// 用户端 chat-app shell 的导航元数据 —— 全局唯一来源。
// Phase 2:  业务大类 + 客服系统静态子菜单 + 营销/支持/代理 的 agent 对话占位。
// Phase 3:  客服系统 12 项打通到 kefu service。
// Phase 4:  营销/支持/代理 的 children 改为从 agent service 拉对话列表。
// Phase 9:  客服迁入顶部快捷入口，自动化成为独立主页面，顾问独立到侧栏底部。
//           feedback 业务以「维修工」名称恢复为独立入口。

export type NavCategory =
  | 'consultant' // 顾问（general · plugin consultant）
  | 'system' // 程序员（原软件开发）
  | 'marketing' // 推广大师（原营销推广）
  | 'support' // 渠道专员（原业务支持）
  | 'agency' // 商务经理（原商务代理）
  | 'feedback' // 维修工（原问题反馈）
  | 'kefu' // 客服（统一客服主页面）
  | 'automation' // 自动化（顶部快捷入口主页面）
  | 'team-chat' // 仅用于团队沟通主视图的 selectedCategory / 兼容展开状态

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
      { key: 'qa-templates', label: '问答模板', description: '语料资料 / 语料条目与用户端快捷询问、状态文案统一管理' },
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
  domain: 'general' | 'marketing' | 'support' | 'agency' | 'kefu' | 'team-chat' | 'feedback'
  /** chat-app 风格里 pencil 图标 = 新建对话（agent 或 自动化 hero） */
  pencil: boolean
  /** Phase 1-2 占位标志 */
  placeholder?: 'soon'
  /**
   * 仅 `domain === 'general'` 且 `childrenKind === 'threads'` 时生效：
   * 将同域线程拆到「顾问 / 程序员 / 自动化」侧栏分组（按 thread.plugin_key）。
   */
  generalThreadBucket?: 'software' | 'automation' | 'consultant'
  /**
   * 子菜单类型：
   * - static       客服 12 项 CRUD 子菜单
   * - threads      AI agent 对话历史（marketing/support/agency）
   * - team-threads 已废弃（团队沟通改为主内容区标签）
   * - placeholder  「即将上线」占位
   * - none         无二级菜单（点击一级即进入对应主视图）
   */
  childrenKind: 'static' | 'threads' | 'team-threads' | 'placeholder' | 'none'
  description: string
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    key: 'system',
    label: '程序员',
    domain: 'general',
    pencil: true,
    childrenKind: 'threads',
    generalThreadBucket: 'software',
    description: '自主开发 / 需求外包 — 由 AI 协助评估 / 编写 / 联调',
  },
  {
    key: 'marketing',
    label: '推广大师',
    domain: 'marketing',
    pencil: true,
    childrenKind: 'threads',
    description: '小红书 / 推特 / 抖音 / TikTok / 知乎 / Instagram / Facebook / Quora',
  },
  {
    key: 'support',
    label: '渠道专员',
    domain: 'support',
    pencil: true,
    childrenKind: 'threads',
    description: '短信号码 / 全球营销加速器 / 旅游流量卡 / 广告会员支付卡',
  },
  {
    key: 'agency',
    label: '商务经理',
    domain: 'agency',
    pencil: true,
    childrenKind: 'threads',
    description: '海内外企业办理 / 全球牌照资质申请 / 出口物流报关 / 货款结汇退税',
  },
  {
    key: 'feedback',
    label: '维修工',
    domain: 'feedback',
    pencil: true,
    childrenKind: 'threads',
    description: '缺陷反馈 / 需求建议 / 产品咨询 / 投诉与争议',
  },
]

export const CONSULTANT_CATEGORY: BusinessCategory = {
  key: 'consultant',
  label: '顾问',
  domain: 'general',
  pencil: true,
  childrenKind: 'threads',
  generalThreadBucket: 'consultant',
  description: '描述目标即可；顾问会澄清问题、整理建议，并推荐下一步业务入口',
}

export type QuickActionKey =
  | 'new-chat'  // 新对话（统一业务创建入口）
  | 'search'    // 全局主题搜索
  | 'live-chat'  // 客服（客户咨询 + 店铺 / 问答模板 / 技术配置）
  | 'automation' // 自动化主页面
  | 'file-library' // 自动化文件库

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
 * 顾问作为和「智能团队」同级的底部 section；账户仅从底部「设置」菜单进入。
 */
export const QUICK_ACTIONS: QuickAction[] = [
  { key: 'new-chat', label: '新对话', icon: 'pencil' },
  { key: 'search', label: '搜索', icon: 'search' },
  { key: 'live-chat', label: '客服', icon: 'consult', badge: 'unread' },
  { key: 'automation', label: '自动化', icon: 'sparkles' },
  { key: 'file-library', label: '文件库', icon: 'package' },
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
