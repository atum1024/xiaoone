// 用户端「新对话」组合器（XiaooneComposer）的配置矩阵
//
// 对外暴露：
// - BusinessKey：业务大类
// - BUSINESS_CONFIGS：每个业务对应的 + 插件、模式选项、是否需要选择大模型
// - MODELS：可用大模型选项（团队聊天不显示）

export type BusinessKey =
  | 'consultant'   // 顾问（无插件/模式；由对话路由至各智能角色）
  | 'automation'   // 自动化（行业 / 产品 / AI 资讯 / 竞品收集）
  | 'software'     // 程序员（自主开发 / 需求外包）
  | 'marketing'    // 推广大师
  | 'support'      // 渠道专员
  | 'agency'       // 商务经理
  | 'team-chat'    // 团队沟通（私聊 / 群聊；内部保留，不在新对话入口展示）
  | 'feedback'     // 维修工（原平台问题反馈）

export interface PluginItem {
  key: string
  label: string
  /** 简短描述，用于 popover 列表的副文案 */
  hint?: string
}

export interface ModeItem {
  key: string
  label: string
  /** 选中时弹出的非阻断警告（如「全自主模式」） */
  warning?: string
  /** popover 副文案 */
  hint?: string
}

/** 按插件覆盖第二列标题与选项（如软件开发「需求外包」→ xiaoone） */
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
  icon: 'workflow' | 'system' | 'marketing' | 'support' | 'agency' | 'chat' | 'reply' | 'sparkles'
  /** + 按钮的 popover 标题（"选择插件" / "选择对话方式" 等） */
  pluginTitle: string
  plugins: PluginItem[]
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
  defaultModeKey?: string
  defaultModelKey?: string
  defaultModelByMode?: Record<string, string>
}

export const XIAOWAN_ASSISTANT_MODE: ModeItem = {
  key: 'xiaowan',
  label: 'xiaoone',
  hint: '统一由 xiaoone承接，需要人工跟进时自动转给对应角色',
}

/** general 域中标记为「顾问」会话的 plugin_key（与侧栏分组一致） */
export const CONSULTANT_AGENT_PLUGIN_KEY = 'consultant'

export const BUSINESS_CONFIGS: Record<BusinessKey, BusinessConfig> = {
  consultant: {
    key: 'consultant',
    label: '顾问',
    description: '纯对话澄清、总结问题，并推荐下一步业务入口',
    icon: 'sparkles',
    pluginTitle: '路由',
    plugins: [{ key: CONSULTANT_AGENT_PLUGIN_KEY, label: '顾问对话', hint: '不自动路由，不直接提交服务单' }],
    modeTitle: 'xiaoone',
    modes: [XIAOWAN_ASSISTANT_MODE],
    needsModel: true,
    agentDomain: 'general',
    defaultPluginKey: CONSULTANT_AGENT_PLUGIN_KEY,
    defaultModeKey: 'xiaowan',
    defaultModelKey: 'openai-reasoning-value',
  },
  automation: {
    key: 'automation',
    label: '自动化',
    description: '自动收集资讯并通过外部渠道通知（agent 接入预留）',
    icon: 'workflow',
    pluginTitle: '选择助理任务',
    plugins: [
      { key: 'industry', label: '行业资讯日报', hint: '行业动态、政策、趋势' },
      { key: 'competitor', label: '竞品监控', hint: '同类商家、价格、活动' },
      { key: 'ai', label: 'AI 资讯巡检', hint: '前沿模型、Agent、工具链' },
      { key: 'product', label: '产品关键词监控', hint: '本商户产品 / 上下游变化' },
      { key: 'notify-tg', label: '渠道通知', hint: '把结果整理为通知渠道摘要' },
      { key: 'file-organize', label: '文件梳理', hint: '上传文件后生成结构化 Markdown' },
      { key: 'install-doc', label: '安装文档生成', hint: '把散乱说明整理为安装/使用文档' },
      { key: 'corpus', label: '客服语料整理', hint: '把客服资料整理成可复用语料' },
      { key: 'sop', label: '运营 SOP 生成', hint: '把流程资料整理成 SOP' },
      { key: 'notify-feishu', label: '发送飞书通知', hint: '通过 OpenClaw/Hermes 等 agent 发送（预留接入）' },
      { key: 'notify-wecom', label: '发送微信通知', hint: '通过 OpenClaw/Hermes 等 agent 发送（预留接入）' },
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
    defaultPluginKey: 'industry',
    defaultModeKey: '24h',
    defaultModelKey: 'openai-reasoning-value',
  },
  software: {
    key: 'software',
    label: '程序员',
    description: '本地 OpenClaw / xiaoone / 需求外包',
    icon: 'system',
    pluginTitle: '选择插件',
    plugins: [
      {
        key: 'self',
        label: '本地 OpenClaw',
        hint: '调用本机 OpenClaw 控制电脑、代码工具与本地文件',
      },
      {
        key: 'outsource',
        label: 'xiaoone',
        hint: '统一由 xiaoone承接，需要人工或开发团队跟进时自动转接',
      },
    ],
    modeTitle: '开发模式',
    modes: [
      { key: 'professional', label: '专业模板约束', hint: '通过 OpenClaw 执行前先保持需求、文件、命令边界清晰' },
      {
        key: 'autonomous',
        label: '全自主模式',
        warning: '非专业开发人员请勿使用此模式',
        hint: '允许 OpenClaw 自主拆解并连续调用本地工具',
      },
    ],
    modeByPlugin: {
      outsource: {
        modeTitle: 'xiaoone',
        modes: [XIAOWAN_ASSISTANT_MODE],
      },
    },
    needsModel: true,
    needsModelByPlugin: { outsource: false, self: false },
    agentDomain: 'general',
    defaultPluginKey: 'self',
    defaultModeKey: 'professional',
    defaultModelKey: '',
  },
  marketing: {
    key: 'marketing',
    label: '推广大师',
    description: '小红书 / 推特 / 抖音 / TikTok / 知乎 / Instagram / Facebook / Quora',
    icon: 'marketing',
    pluginTitle: '选择投放平台',
    plugins: [
      { key: 'xhs', label: '小红书' },
      { key: 'twitter', label: '推特 X' },
      { key: 'douyin', label: '抖音' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'zhihu', label: '知乎' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'quora', label: 'Quora' },
    ],
    modeTitle: '内容形态',
    modes: [
      { key: 'image', label: '图片' },
      { key: 'text', label: '文字' },
      { key: 'video', label: '视频' },
    ],
    needsModel: true,
    agentDomain: 'marketing',
    defaultPluginKey: 'xhs',
    defaultModeKey: 'text',
    defaultModelKey: 'openai-reasoning-value',
    defaultModelByMode: {
      text: 'openai-reasoning-value',
      image: 'openai-image-value',
      video: 'google-video-value',
    },
  },
  support: {
    key: 'support',
    label: '渠道专员',
    description: '短信号码 / 全球营销加速器 / 旅游流量卡 / 广告会员支付卡',
    icon: 'support',
    pluginTitle: '选择业务类型',
    plugins: [
      { key: 'sms', label: '短信号码', hint: '海外手机号验收 / 注册' },
      { key: 'mkt-cdn', label: '全球营销加速器', hint: '跨境营销线路' },
      { key: 'travel-sim', label: '旅游流量卡', hint: '海外漫游 SIM / eSIM' },
      { key: 'ad-card', label: '广告会员支付卡', hint: 'Meta / Google 投放卡' },
    ],
    modeTitle: 'xiaoone',
    modes: [XIAOWAN_ASSISTANT_MODE],
    /** 模型由平台商户「智能体默认模型」配置，用户端不展示选择 */
    needsModel: false,
    agentDomain: 'support',
    defaultPluginKey: 'sms',
    defaultModeKey: 'xiaowan',
  },
  agency: {
    key: 'agency',
    label: '商务经理',
    description: '全球企业代办 / 全球牌照资质申请 / 物流报关退税 / 收款结汇',
    icon: 'agency',
    pluginTitle: '选择代办类目',
    plugins: [
      { key: 'enterprise', label: '全球企业代办', hint: '注册 / 变更 / 注销' },
      { key: 'license', label: '全球牌照资质申请', hint: 'MSB / FCA / VARA / ISO …' },
      { key: 'logistics', label: '物流报关退税', hint: '国际物流 / 报关 / 退税' },
      { key: 'settlement', label: '收款结汇', hint: '外汇收款 / 结汇路径' },
    ],
    modeTitle: 'xiaoone',
    modes: [XIAOWAN_ASSISTANT_MODE],
    /** 模型由平台商户「智能体默认模型」配置，用户端不展示选择 */
    needsModel: false,
    agentDomain: 'agency',
    defaultPluginKey: 'logistics',
    defaultModeKey: 'xiaowan',
  },
  'team-chat': {
    key: 'team-chat',
    label: '团队沟通',
    description: '商户内部成员私聊 / 群聊',
    icon: 'chat',
    pluginTitle: '选择对话形式',
    plugins: [
      { key: 'dm', label: '私聊', hint: '一对一对话' },
      { key: 'group', label: '群聊', hint: '多名成员同一群组' },
    ],
    modeTitle: '聊天对象',
    modes: [
      { key: 'friend', label: '选择好友', hint: '从团队成员中选择' },
      { key: 'group', label: '选择群', hint: '从已存在的群组中选择' },
    ],
    needsModel: false,
    defaultPluginKey: 'dm',
    defaultModeKey: 'friend',
  },
  feedback: {
    key: 'feedback',
    label: '维修工',
    description: '缺陷反馈 / 需求建议 / 产品咨询 / 投诉与争议',
    icon: 'reply',
    pluginTitle: '选择反馈类型',
    plugins: [
      { key: 'bug', label: '缺陷反馈', hint: '功能不可用 / 异常崩溃 / 数据错误' },
      { key: 'feature', label: '需求建议', hint: '想要的新功能或改进点' },
      { key: 'consult', label: '产品咨询', hint: '用法疑问 / 配置咨询 / 最佳实践' },
      { key: 'complaint', label: '投诉与争议', hint: '服务质量 / 责任划分 / 退款' },
    ],
    modeTitle: 'xiaoone',
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
  icon: 'sparkles' | 'bolt' | 'grid'
  capability: 'reasoning' | 'image' | 'video'
  hint?: string
}

export const MODELS: ModelOption[] = [
  { key: 'openai-reasoning-best', label: 'OpenAI GPT 5.4', icon: 'sparkles', capability: 'reasoning', hint: '推理 · 最优' },
  { key: 'openai-reasoning-value', label: 'OpenAI GPT 5.4 mini', icon: 'sparkles', capability: 'reasoning', hint: '推理 · 性价比' },
  { key: 'anthropic-reasoning-best', label: 'Claude Sonnet', icon: 'sparkles', capability: 'reasoning', hint: 'Anthropic · 最优' },
  { key: 'anthropic-reasoning-value', label: 'Claude Haiku', icon: 'sparkles', capability: 'reasoning', hint: 'Anthropic · 性价比' },
  { key: 'google-reasoning-best', label: 'Gemini 3.1 Pro', icon: 'sparkles', capability: 'reasoning', hint: '推理 · 最优' },
  { key: 'google-reasoning-value', label: 'Gemini 2.5 Flash', icon: 'sparkles', capability: 'reasoning', hint: '推理 · 性价比' },
  { key: 'deepseek-reasoning-value', label: 'DeepSeek V3', icon: 'sparkles', capability: 'reasoning', hint: 'DeepSeek · Chat' },
  { key: 'xai-reasoning-value', label: 'Grok 3 Mini', icon: 'sparkles', capability: 'reasoning', hint: 'xAI' },
  { key: 'qwen-reasoning-value', label: '通义千问 Plus', icon: 'sparkles', capability: 'reasoning', hint: '阿里云 Dashscope' },
  { key: 'moonshot-reasoning-value', label: 'Kimi', icon: 'sparkles', capability: 'reasoning', hint: 'Moonshot' },
  { key: 'mistral-reasoning-value', label: 'Mistral Small', icon: 'sparkles', capability: 'reasoning', hint: 'Mistral AI' },
  { key: 'glm-reasoning-value', label: 'GLM-4 Plus', icon: 'sparkles', capability: 'reasoning', hint: '智谱' },
  { key: 'minimax-reasoning-value', label: 'MiniMax ABAB', icon: 'sparkles', capability: 'reasoning', hint: 'MiniMax' },
  { key: 'openai-image-best', label: 'OpenAI Image 1.5', icon: 'grid', capability: 'image', hint: '图片 · 最优' },
  { key: 'openai-image-value', label: 'OpenAI Image mini', icon: 'grid', capability: 'image', hint: '图片 · 性价比' },
  { key: 'google-image-best', label: 'Gemini Image Pro', icon: 'grid', capability: 'image', hint: '图片 · 最优' },
  { key: 'google-image-value', label: 'Gemini Flash Image', icon: 'grid', capability: 'image', hint: '图片 · 性价比' },
  { key: 'google-video-best', label: 'Veo 3.1', icon: 'bolt', capability: 'video', hint: '视频 · 最优' },
  { key: 'google-video-value', label: 'Veo 3.1 Fast', icon: 'bolt', capability: 'video', hint: '视频 · 性价比' },
  { key: 'gpt-5.4', label: 'GPT 5.4', icon: 'sparkles', capability: 'reasoning', hint: 'OpenAI · 兼容别名' },
]

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

/** 选中「xiaoone」后统一提示（与各业务 hint 一致） */
export const SELF_SERVICE_MODE_MESSAGE = 'xiaoone：统一承接业务咨询，需要人工跟进时自动转给对应角色。'

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

export function defaultPluginForBusiness(key: BusinessKey): string | null {
  const cfg = getBusinessConfig(key)
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
  return cfg.defaultModelKey || 'openai-reasoning-value'
}

export function getModelByKey(key: string | null | undefined): ModelOption | null {
  if (!key) return null
  return MODELS.find(m => m.key === key) || null
}
