// 用户端「新对话」组合器（XiaooneComposer）的配置矩阵
//
// 对外暴露：
// - BusinessKey：业务大类
// - BUSINESS_CONFIGS：每个业务对应的 + 插件、模式选项、是否需要选择大模型
// - MODELS：可用大模型选项（团队聊天不显示）

import type { IconName } from '../components/Icon'
import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

export type BusinessKey =
  | 'consultant'   // xiaoone（无插件/模式；由对话路由至各智能角色）
  | 'automation'   // 自动化（行业 / 产品 / AI 资讯 / 竞品收集）
  | 'software'     // 程序员（xiaoone / 专业团队）
  | 'marketing'    // 推广能力
  | 'support'      // 辣鸡PPT
  | 'agency'       // 商务经理
  | 'feedback'     // 维修工（原平台问题反馈）

export interface PluginItem {
  key: string
  label: string
  icon?: IconName
  color?: string
  requiresFeature?: string
  /** 简短描述，用于 popover 列表的副文案 */
  hint?: string
  recommendedCount?: number
  minCount?: number
  maxCount?: number
  imageRoles?: Array<{ role: string; label: string; defaultCount?: number; minCount?: number; maxCount?: number }>
  shotRoles?: Array<{ role: string; label: string; duration?: number }>
  videoOptions?: {
    recommendedDuration?: number
    minDuration?: number
    maxDuration?: number
    platforms?: { values?: string[]; default?: string }
    ratios?: { values?: string[]; default?: string }
    resolutions?: { values?: string[]; default?: string }
    subtitle?: { values?: string[]; default?: string }
    voiceover?: { values?: string[]; default?: string }
    cta?: { values?: string[]; default?: string }
  }
  modality?: 'image' | 'text' | 'video' | string
  output?: 'image' | 'text' | 'video' | string
  requiresVision?: boolean
}

export interface ModeItem {
  key: string
  label: string
  /** 选中时弹出的非阻断警告 */
  warning?: string
  /** popover 副文案 */
  hint?: string
}

/** 按插件覆盖第二列标题与选项 */
export interface ModeMatrixOverride {
  modeTitle: string
  modes: ModeItem[]
}

export interface BusinessConfig {
  key: BusinessKey
  label: string
  /** chip / popover 副文案 */
  description: string
  /** 业务图标（Icon.vue 支持的名字） */
  icon: 'workflow' | 'system' | 'marketing' | 'support' | 'agency' | 'reply' | 'sparkles'
  /** + 按钮的 popover 标题（"选择插件" / "选择对话方式" 等） */
  pluginTitle: string
  pluginTitleByMode?: Record<string, string>
  plugins: PluginItem[]
  pluginsByMode?: Record<string, PluginItem[] | 'remote'>
  /** "完全访问权限" 替代项的标题 */
  modeTitle: string
  modes: ModeItem[]
  /** 选中某插件 key 时用该矩阵替代默认 modeTitle / modes */
  modeByPlugin?: Record<string, ModeMatrixOverride>
  /** 团队聊天不需要大模型选择 */
  needsModel: boolean
  /** 按插件覆盖是否需要大模型；未出现在此表中的插件沿用 needsModel */
  needsModelByPlugin?: Record<string, boolean>
  /** 是否走 agent service（threads 模式）；自动化/软件开发/营销/支持/代理/反馈 都走 agent */
  agentDomain?: 'general' | 'marketing' | 'support' | 'agency' | 'feedback'
  /** 新对话默认选中的插件 / 模式 / 模型，避免跨业务残留上一次选择 */
  defaultPluginKey?: string
  defaultPluginByMode?: Record<string, string | null>
  defaultModeKey?: string
  defaultModelKey?: string
  defaultModelByMode?: Record<string, string>
}

/** xiaoone / 外包等「统一助理」模式列标题（中文基准文案；英文在 XiaooneComposer 内随语言切换） */
export const ASSISTANT_BRAND_TITLE_ZH = 'xiaoone'

export const XIAOWAN_ASSISTANT_MODE: ModeItem = {
  key: 'xiaowan',
  label: ASSISTANT_BRAND_TITLE_ZH,
  hint: '统一由 xiaoone 承接，需要人工跟进时自动转给对应角色',
}

/** general 域中标记为「xiaoone」会话的 plugin_key（与侧栏分组一致） */
export const CONSULTANT_AGENT_PLUGIN_KEY = 'consultant'

export const LEGACY_MARKETING_PLATFORM_PLUGIN_KEYS: readonly string[] = [
  'xhs',
  'twitter',
  'douyin',
  'tiktok',
  'zhihu',
  'instagram',
  'facebook',
  'quora',
] as const

export const BUSINESS_CONFIGS: Record<BusinessKey, BusinessConfig> = {
  consultant: {
    key: 'consultant',
    label: 'xiaoone',
    description: '纯对话澄清、总结问题，并推荐下一步业务入口',
    icon: 'sparkles',
    pluginTitle: '路由',
    plugins: [{ key: CONSULTANT_AGENT_PLUGIN_KEY, label: 'xiaoone 对话', hint: '不自动路由，不直接提交服务单' }],
    modeTitle: ASSISTANT_BRAND_TITLE_ZH,
    modes: [XIAOWAN_ASSISTANT_MODE],
    needsModel: true,
    agentDomain: 'general',
    defaultPluginKey: CONSULTANT_AGENT_PLUGIN_KEY,
    defaultModeKey: 'xiaowan',
    defaultModelKey: 'volcengine-reasoning-auto',
  },
  automation: {
    key: 'automation',
    label: '自动化',
    description: '各大平台常用自动化推荐与通知汇总',
    icon: 'workflow',
    pluginTitle: '选择平台推荐',
    plugins: [
      { key: 'hot-product', label: 'TikTok / 抖音爆款发现', hint: '短视频、电商榜单和供货线索筛选' },
      { key: 'competitor', label: 'Amazon / Meta 竞品监控', hint: '榜单、价格、素材、评论和促销变化' },
      { key: 'product', label: 'Shopify / Google 关键词巡检', hint: '独立站转化、搜索趋势和广告词机会' },
      { key: 'industry', label: '小红书话题与行业趋势', hint: '热门笔记、用户问题、达人选题和风险' },
      { key: 'ai', label: 'AI 工具资讯巡检', hint: '前沿模型、Agent、工具链' },
      { key: 'file-organize', label: '文件梳理', hint: '上传文件后生成结构化 Markdown' },
      { key: 'install-doc', label: '安装文档生成', hint: '把散乱说明整理为安装/使用文档' },
      { key: 'corpus', label: '客服语料整理', hint: '把客服资料整理成可复用语料' },
      { key: 'sop', label: '运营 SOP 生成', hint: '把流程资料整理成 SOP' },
    ],
    modeTitle: '采集时间周期',
    modes: [
      { key: '1h', label: '1 小时', hint: '近 1 小时新内容' },
      { key: '8h', label: '8 小时', hint: '近 8 小时新内容' },
      { key: '12h', label: '12 小时', hint: '近 12 小时新内容' },
      { key: '24h', label: '24 小时', hint: '近 24 小时新内容（默认）' },
    ],
    needsModel: true,
    agentDomain: 'general',
    defaultPluginKey: 'hot-product',
    defaultModeKey: '24h',
    defaultModelKey: 'volcengine-reasoning-auto',
  },
  software: {
    key: 'software',
    label: '软件开发',
  description: `${ASSISTANT_BRAND_TITLE_ZH} / 专业团队`,
    icon: 'system',
    pluginTitle: '选择插件',
    plugins: [
      {
        key: 'self',
        label: ASSISTANT_BRAND_TITLE_ZH,
        hint: '沿用 Hermes 用户空间能力，可使用工作区工具、文件和运行环境',
      },
      {
        key: 'outsource',
        label: '专业团队',
        hint: '对接运营端客服；客服未接管前由 Ark 大模型先了解需求',
      },
    ],
    modeTitle: '开发形式',
    modes: [],
    needsModel: true,
    needsModelByPlugin: { outsource: false, self: true },
    agentDomain: 'general',
    defaultPluginKey: 'self',
    defaultModelKey: 'doubao-2.0-lite',
  },
  marketing: {
    key: 'marketing',
    label: '推广能力',
    description: '图片素材、短视频和通用营销文案创作',
    icon: 'marketing',
    pluginTitle: '选择创作能力',
    pluginTitleByMode: {
      image: '选择创作能力',
      text: '选择文案 skill',
    },
    plugins: [],
    pluginsByMode: {
      image: 'remote',
      text: 'remote',
      video: [],
    },
    modeTitle: '内容形态',
    modes: [
      { key: 'image', label: '图片' },
      { key: 'text', label: '文字' },
      { key: 'video', label: '视频' },
    ],
    needsModel: true,
    agentDomain: 'marketing',
    defaultPluginByMode: {
      image: 'product-photo-set',
      text: 'official-announcement',
      video: null,
    },
    defaultModeKey: 'text',
    defaultModelKey: 'volcengine-reasoning-auto',
    defaultModelByMode: {
      text: 'volcengine-reasoning-auto',
      image: 'volcengine-reasoning-auto',
      video: 'volcengine-reasoning-auto',
    },
  },
  support: {
    key: 'support',
    label: '辣鸡PPT',
    description: '演示文稿生成：方案汇报 / 工作总结 / 产品介绍 / 数据报告',
    icon: 'support',
    pluginTitle: '选择 PPT 类型',
    plugins: [
      { key: 'project_proposal', label: '方案汇报', hint: '背景、目标、路径、排期' },
      { key: 'work_report', label: '工作总结', hint: '进展、结果、问题、下一步' },
      { key: 'product_intro', label: '产品介绍', hint: '卖点、场景、功能、案例' },
      { key: 'data_report', label: '数据报告', hint: '指标、趋势、洞察、行动' },
    ],
    modeTitle: ASSISTANT_BRAND_TITLE_ZH,
    modes: [XIAOWAN_ASSISTANT_MODE],
    /** 模型由平台商户「智能体默认模型」配置，用户端不展示选择 */
    needsModel: false,
    agentDomain: 'support',
    defaultPluginKey: 'project_proposal',
    defaultModeKey: 'xiaowan',
  },
  agency: {
    key: 'agency',
    label: '企业服务',
    description: '企业代办 / 牌照物流结汇 / 软件开发 / 上架顾问',
    icon: 'agency',
    pluginTitle: '选择服务类目',
    plugins: [
      { key: 'enterprise', label: '全球企业代办', hint: '注册 / 变更 / 注销' },
      { key: 'license', label: '全球牌照资质申请', hint: 'MSB / FCA / VARA / ISO …' },
      { key: 'logistics', label: '物流报关退税', hint: '国际物流 / 报关 / 退税' },
      { key: 'settlement', label: '收款结汇', hint: '外汇收款 / 结汇路径' },
      { key: 'software-dev', label: '软件开发', hint: '网站 / App / 小程序 / 定制系统开发与交付' },
      { key: 'tax-consult', label: '对账与税务流程咨询', hint: '对账口径 / 税务流程 / 合规节点' },
      { key: 'mini-program', label: '小程序上架顾问', hint: '微信 / 支付宝 / 抖音等小程序提审' },
      { key: 'domestic-app', label: '国内 APP 上架顾问', hint: '华为 / 小米 / OPPO / vivo 等安卓市场' },
      { key: 'apple-store', label: '苹果商店上架顾问', hint: '证书 / TestFlight / App Review' },
      { key: 'google-play', label: '谷歌商店上架顾问', hint: '开发者账号 / 隐私政策 / 正式发布' },
    ],
    modeTitle: ASSISTANT_BRAND_TITLE_ZH,
    modes: [XIAOWAN_ASSISTANT_MODE],
    /** 模型由平台商户「智能体默认模型」配置，用户端不展示选择 */
    needsModel: false,
    agentDomain: 'agency',
    defaultPluginKey: 'logistics',
    defaultModeKey: 'xiaowan',
  },
  feedback: {
    key: 'feedback',
    label: '帮助中心',
    description: '缺陷反馈 / 需求建议 / 产品咨询 / 投诉与争议',
    icon: 'reply',
    pluginTitle: '选择反馈类型',
    plugins: [
      { key: 'bug', label: '缺陷反馈', hint: '功能不可用 / 异常崩溃 / 数据错误' },
      { key: 'feature', label: '需求建议', hint: '想要的新功能或改进点' },
      { key: 'consult', label: '产品咨询', hint: '用法疑问 / 配置咨询 / 最佳实践' },
      { key: 'complaint', label: '投诉与争议', hint: '服务质量 / 责任划分 / 退款' },
    ],
    modeTitle: ASSISTANT_BRAND_TITLE_ZH,
    modes: [XIAOWAN_ASSISTANT_MODE],
    /** 模型由平台商户「智能体默认模型」配置，用户端不展示模型选择 */
    needsModel: false,
    agentDomain: 'feedback',
    defaultPluginKey: 'bug',
    defaultModeKey: 'xiaowan',
  },
}

/** general 域侧栏中归入「自动化」的 thread.plugin_key（与 automation.plugins 一致） */
export const AUTOMATION_AGENT_PLUGIN_KEYS: readonly string[] = BUSINESS_CONFIGS.automation.plugins.map(p => p.key)

export const BUSINESS_LIST: BusinessKey[] = [
  'consultant',
  'software',
  'marketing',
  'support',
  'agency',
  'automation',
  'feedback',
]

export interface ModelOption {
  key: string
  label: string
  /** Element Plus / 自定义 icon 名 */
  icon: IconName
  capability: 'reasoning' | 'image' | 'video'
  hint?: string
}

export interface ImageModelPrice {
  modelId: string
  unitPriceCny: number
  sourceUrl: string
  sourceLabel: string
}

export const VOLCENGINE_ARK_MODEL_PRICE_URL = 'https://www.volcengine.com/docs/82379/1544106?lang=zh'

const IMAGE_MODEL_PRICE_SOURCE = {
  zh: '火山方舟模型价格',
  en: 'Volcengine Ark model pricing',
}

export const IMAGE_MODEL_PRICES: Partial<Record<string, ImageModelPrice>> = {
  'seedream-5.0-lite': {
    modelId: 'doubao-seedream-5.0-lite',
    unitPriceCny: 0.22,
    sourceUrl: VOLCENGINE_ARK_MODEL_PRICE_URL,
    sourceLabel: IMAGE_MODEL_PRICE_SOURCE.zh,
  },
  'seedream-4.5': {
    modelId: 'doubao-seedream-4.5',
    unitPriceCny: 0.25,
    sourceUrl: VOLCENGINE_ARK_MODEL_PRICE_URL,
    sourceLabel: IMAGE_MODEL_PRICE_SOURCE.zh,
  },
}

export function getImageModelPrices(locale: Locale): Partial<Record<string, ImageModelPrice>> {
  const sourceLabel = uiT(locale, 'composer.image.priceSource', resolveImageModelPriceSource(locale))
  const result: Partial<Record<string, ImageModelPrice>> = {}
  for (const [key, price] of Object.entries(IMAGE_MODEL_PRICES)) {
    if (price)
      result[key] = { ...price, sourceLabel }
  }
  return result
}

function resolveImageModelPriceSource(locale: Locale): string {
  return locale === 'en' ? IMAGE_MODEL_PRICE_SOURCE.en : IMAGE_MODEL_PRICE_SOURCE.zh
}

const MODEL_DEFS: Array<{
  key: string
  icon: IconName
  capability: ModelOption['capability']
  labelZh: string
  hintZh: string
}> = [
  { key: 'volcengine-reasoning-auto', icon: 'brand-bytedance', capability: 'reasoning', labelZh: 'Doubao Auto', hintZh: '火山方舟 · 自动思考' },
  { key: 'doubao-2.0-mini', icon: 'brand-bytedance', capability: 'reasoning', labelZh: 'Doubao Seed 2.0 Mini', hintZh: '火山方舟 · 快速低成本' },
  { key: 'doubao-2.0-lite', icon: 'brand-bytedance', capability: 'reasoning', labelZh: 'Doubao Seed 2.0 Lite', hintZh: '火山方舟 · 均衡推理' },
  { key: 'seed-2.0-pro', icon: 'brand-bytedance', capability: 'reasoning', labelZh: '豆包 Seed 2.0 Pro', hintZh: '火山方舟 · 高质量推理' },
  { key: 'volcengine-reasoning-value', icon: 'brand-bytedance', capability: 'reasoning', labelZh: '基础模型', hintZh: '火山方舟' },
  { key: 'volcengine-reasoning-enhanced', icon: 'brand-bytedance', capability: 'reasoning', labelZh: '增强模型', hintZh: '火山方舟' },
  { key: 'seedream-4.5', icon: 'brand-bytedance', capability: 'image', labelZh: 'Seedream 4.5', hintZh: '火山方舟 · 图片' },
  { key: 'seedream-5.0-lite', icon: 'brand-bytedance', capability: 'image', labelZh: 'Seedream 5.0 Lite', hintZh: '火山方舟 · 图片' },
  { key: 'seedance-2.0', icon: 'brand-bytedance', capability: 'video', labelZh: 'Seedance 2.0', hintZh: '火山方舟 · 视频' },
  { key: 'seedance-2.0-fast', icon: 'brand-bytedance', capability: 'video', labelZh: 'Seedance 2.0 Fast', hintZh: '火山方舟 · 速度优先 · 不支持 1080p' },
]

export function getModels(locale: Locale): ModelOption[] {
  return MODEL_DEFS.map(def => ({
    key: def.key,
    icon: def.icon,
    capability: def.capability,
    label: uiT(locale, `composer.model.${def.key}.label`, def.labelZh),
    hint: uiT(locale, `composer.model.${def.key}.hint`, def.hintZh),
  }))
}

/** @deprecated Prefer getModels(locale) */
export const MODELS: ModelOption[] = getModels('zh')

export const XIAOONE_ARK_CHAT_MODEL_KEYS = [
  'doubao-2.0-lite',
  'volcengine-reasoning-auto',
  'seed-2.0-pro',
  'doubao-2.0-mini',
] as const

export const MARKETING_REASONING_MODEL_KEYS = [
  'volcengine-reasoning-auto',
  'doubao-2.0-mini',
  'doubao-2.0-lite',
  'seed-2.0-pro',
] as const
export const MARKETING_IMAGE_MODEL_KEYS = ['seedream-5.0-lite', 'seedream-4.5'] as const
export const MARKETING_VIDEO_MODEL_KEYS = ['seedance-2.0', 'seedance-2.0-fast'] as const
export const PROGRAMMER_HERMES_MODEL_KEYS = ['doubao-2.0-lite', 'seed-2.0-pro', 'volcengine-reasoning-auto'] as const

export function getBusinessConfig(key: BusinessKey | null | undefined): BusinessConfig {
  if (key && BUSINESS_CONFIGS[key]) return BUSINESS_CONFIGS[key]
  return BUSINESS_CONFIGS.software
}

/** 当前插件下是否展示 / 提交大模型选择 */
export function pluginNeedsModel(cfg: BusinessConfig, pluginKey: string | null | undefined): boolean {
  if (pluginKey && cfg.needsModelByPlugin && Object.prototype.hasOwnProperty.call(cfg.needsModelByPlugin, pluginKey))
    return cfg.needsModelByPlugin[pluginKey]!
  return cfg.needsModel
}

export function resolveModeTitle(config: BusinessConfig, pluginKey: string | null | undefined): string {
  if (pluginKey && config.modeByPlugin?.[pluginKey]?.modeTitle)
    return config.modeByPlugin[pluginKey].modeTitle
  return config.modeTitle
}

export function resolveModes(config: BusinessConfig, pluginKey: string | null | undefined): ModeItem[] {
  if (pluginKey && config.modeByPlugin?.[pluginKey]?.modes)
    return config.modeByPlugin[pluginKey].modes
  return config.modes
}

export function defaultPluginForBusiness(key: BusinessKey, modeKey?: string | null): string | null {
  const cfg = getBusinessConfig(key)
  if (modeKey && cfg.defaultPluginByMode && Object.prototype.hasOwnProperty.call(cfg.defaultPluginByMode, modeKey))
    return cfg.defaultPluginByMode[modeKey] || null
  const modePlugins = modeKey ? cfg.pluginsByMode?.[modeKey] : undefined
  if (Array.isArray(modePlugins))
    return modePlugins[0]?.key || null
  return cfg.defaultPluginKey || cfg.plugins[0]?.key || null
}

export function defaultModeForBusiness(key: BusinessKey, pluginKey?: string | null): string | null {
  const cfg = getBusinessConfig(key)
  const modes = resolveModes(cfg, pluginKey)
  if (cfg.defaultModeKey && modes.some(m => m.key === cfg.defaultModeKey))
    return cfg.defaultModeKey
  return modes[0]?.key || null
}

export function defaultModelForBusiness(key: BusinessKey, modeKey?: string | null, pluginKey?: string | null): string | null {
  const cfg = getBusinessConfig(key)
  if (!pluginNeedsModel(cfg, pluginKey ?? undefined))
    return null
  if (modeKey && cfg.defaultModelByMode?.[modeKey])
    return cfg.defaultModelByMode[modeKey]
  return cfg.defaultModelKey || 'volcengine-reasoning-auto'
}

export function defaultGenerationModelForBusiness(key: BusinessKey, modeKey?: string | null): string | null {
  if (key !== 'marketing') return null
  if (modeKey === 'image') return MARKETING_IMAGE_MODEL_KEYS[0]
  if (modeKey === 'video') return MARKETING_VIDEO_MODEL_KEYS[0]
  return null
}

export function getModelByKey(key: string | null | undefined, locale: Locale = 'zh'): ModelOption | null {
  if (!key) return null
  return getModels(locale).find(m => m.key === key) || null
}

type TranslateFn = (key: string, fallback?: string) => string

function localizePlugin(businessKey: BusinessKey, plugin: PluginItem, t: TranslateFn): PluginItem {
  const labelKey = `composer.biz.${businessKey}.plugin.${plugin.key}.label`
  const hintKey = `composer.biz.${businessKey}.plugin.${plugin.key}.hint`
  return {
    ...plugin,
    label: t(labelKey, plugin.label),
    hint: plugin.hint ? t(hintKey, plugin.hint) : plugin.hint,
  }
}

function localizeMode(businessKey: BusinessKey, mode: ModeItem, t: TranslateFn): ModeItem {
  const labelKey = `composer.biz.${businessKey}.mode.${mode.key}`
  const hintKey = `composer.biz.${businessKey}.mode.${mode.key}.hint`
  return {
    ...mode,
    label: t(labelKey, mode.label),
    hint: mode.hint ? t(hintKey, mode.hint) : mode.hint,
    warning: mode.warning,
  }
}

export function localizeBusinessConfig(config: BusinessConfig, locale: Locale): BusinessConfig {
  const t = (key: string, fallback?: string) => uiT(locale, key, fallback)
  const key = config.key
  const pluginTitleByMode = config.pluginTitleByMode
    ? Object.fromEntries(
        Object.entries(config.pluginTitleByMode).map(([modeKey, title]) => [
          modeKey,
          t(`composer.biz.${key}.pluginTitle.${modeKey}`, title),
        ]),
      )
    : config.pluginTitleByMode

  return {
    ...config,
    label: t(`composer.biz.${key}.label`, config.label),
    description: t(`composer.biz.${key}.description`, config.description),
    pluginTitle: t(`composer.biz.${key}.pluginTitle`, config.pluginTitle),
    pluginTitleByMode,
    modeTitle: t(`composer.biz.${key}.modeTitle`, config.modeTitle),
    plugins: config.plugins.map(p => localizePlugin(key, p, t)),
    modes: config.modes.map(m => localizeMode(key, m, t)),
    modeByPlugin: config.modeByPlugin
      ? Object.fromEntries(
          Object.entries(config.modeByPlugin).map(([pluginKey, matrix]) => [
            pluginKey,
            {
              modeTitle: t(`composer.biz.${key}.modeByPlugin.${pluginKey}.title`, matrix.modeTitle),
              modes: matrix.modes.map(m => localizeMode(key, m, t)),
            },
          ]),
        )
      : config.modeByPlugin,
  }
}

export function getLocalizedBusinessConfig(key: BusinessKey, locale: Locale): BusinessConfig {
  return localizeBusinessConfig(getBusinessConfig(key), locale)
}

export function getComposerLabels(locale: Locale) {
  const t = (key: string, fallback?: string) => uiT(locale, key, fallback)
  return {
    t,
    businessConfigs: Object.fromEntries(
      BUSINESS_LIST.map(k => [k, getLocalizedBusinessConfig(k, locale)]),
    ) as Record<BusinessKey, BusinessConfig>,
    assistantBrandTitle: t('composer.biz.consultant.label', ASSISTANT_BRAND_TITLE_ZH),
    xiaowanHint: t('composer.xiaowan.hint', XIAOWAN_ASSISTANT_MODE.hint),
  }
}
