import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'zh' | 'en'

/**
 * 用户端轻量 i18n —— 不引入 vue-i18n，仅维护一份字典 + 一个 `t()` 函数。
 *
 * 用法：
 *   const lc = useLocaleStore()
 *   lc.t('header.title')
 */

type Dict = Record<string, string>

const ZH: Dict = {
  // 顶部品牌副标（与 Hero 气质一致）
  'brand.name': 'Xiaoone',
  'brand.sub': '随时 · 随地 · 灵感 · 执行',

  // 顶部 quick action
  'qa.new-chat': '新对话',
  'qa.search': '搜索',
  'qa.automation': '自动化',
  'qa.account': '账户',
  'qa.live-chat': '客服',
  'qa.file-library': '文件库',
  'qa.team': '团队管理',
  'qa.soon': '即将上线',
  'qa.demo': 'DEMO',

  // section
  'section.business': '智能团队',
  'section.consultant': '顾问',
  'section.business.expand': '展开全部二级菜单',
  'section.business.collapse': '折叠全部二级菜单',
  'common.search.close': '关闭',

  'composer.attachShort': '文件/图片',
  'composer.attachTip': '选择要发送的图片或文件',

  // 内容页头
  'top.theme.dark': '切换到夜间',
  'top.theme.light': '切换到白天',
  'top.lang.zh': '中文',
  'top.lang.en': 'English',
  'top.lang.toggle': '切换语言',
  'top.merchant.none': '未绑定商户',
  'top.merchant.switch': '切换商户',
  'top.merchant.store': '店铺',
  'top.platformTeam': '平台团队',
  'top.switchMerchantError': '切换商户失败',
  'top.platformUnavailable': '平台团队暂不可用',

  // 视图标题（面包屑用）
  'view.hero': '顾问',
  'view.kefu': '客服',
  'view.live-chat': '客户咨询',
  'view.news': '自动化',
  'view.agent': '智能团队',
  'view.account': '账户中心',
  'view.team-mgmt': '商户团队',
  'view.teamManagement': '商户团队',
  'view.team-chat': '团队沟通',
  'view.platformTeam': '平台团队',
  'view.feedback': '维修工',
  'view.placeholder': '即将上线',
  'view.archives': '档案管理',
  'view.generation-assets': '生成素材',
  'view.generationAssets': '生成素材',
  'view.file-library': '文件库',
  'view.skills': '技能中心',
  'view.workbench': '工作台',

  // 业务类目
  'biz.consultant': '顾问',
  'biz.system': '程序员',
  'biz.marketing': '推广大师',
  'biz.kefu': '客服',
  'biz.support': '渠道专员',
  'biz.agency': '商务经理',
  'biz.team-chat': '团队沟通',
  'biz.automation': '自动化',
  'biz.feedback': '维修工',
  'biz.file-library': '文件库',

  // 客服中心子页签（KefuOverviewPage）
  'kefu.workspace': '客服工作台',
  'kefu.live-chat': '客户咨询',
  'kefu.stores': '店铺',
  'kefu.qa-templates': '问答模板',
  'kefu.tech-config': '技术配置',

  'teamChat.tabAll': '全部',
  'teamChat.emptyAll': '暂无会话。可在右侧发起私聊或群聊，或从顶部新建。',
  'teamChat.startNew': '发起新会话',
  'teamChat.dm': '私聊',
  'teamChat.group': '群聊',
  'teamChat.emptyDm': '暂无私聊会话',
  'teamChat.emptyGroup': '暂无群聊会话',

  // 设置菜单
  'menu.settings': '设置',
  'menu.account': '账户中心',
  'menu.team': '商户团队',
  'menu.theme.dark': '切换到夜间',
  'menu.theme.light': '切换到白天',
  'menu.logout': '退出登录',
  'menu.archives': '档案管理',
  'menu.generation-assets': '生成素材库',

  // 杂项
  'common.search.business': '搜索业务和对话…',
  'common.demo': '示例数据',
  'common.demo.banner':
    '当前展示为种子演示数据；账号 / 商户 / 对话均带 is_demo=true 标记。',

  // 新对话页
  'hero.slogan': '随时 · 随地 · 灵感 · 执行',
  /** 软件开发（general 尚无对话）主标题 */
  'hero.title.softwareCold': '我们该在 Xiaoone 助手中做什么？',
  /** 软件开发冷启动副文案 */
  'hero.intro.softwareCold': '说出你的想法，即可从 0 到 1 搭建专属于你的系统。现在就试试吧！',
  /** 新对话默认「营销推广」主标题 */
  'hero.title.marketingPlay': '告诉大家你又有了什么好玩意儿吧！',
  'hero.title.context': '我们该在 {0} 中做什么？',
  'hero.title.automation': '让自动化在 {0} 跑起来',
  'hero.placeholder.xiaoone': '问 xiaoone 助手任何事。Shift+Enter 换行，Enter 发送',
  'hero.placeholder.ask': '向 {0} 提问。Shift+Enter 换行，Enter 发送',
  'hero.placeholder.continue': '继续与 {0} 对话…',
  'hero.placeholder.default': '选择一个业务板块，然后输入你要处理的事项',
  'hero.placeholder.business': '向 {0} 说明你的目标、背景和要求。Shift+Enter 换行，Enter 发送',
  'hero.pickBusiness': '选择业务板块',
  'hero.newThread': '顾问',
  'hero.stream': '流式响应',
  'hero.warn.pickBiz': '请先选择一个可对话的业务板块',
  'workbench.loadPromptsError': '加载推荐提示失败',
  'workbench.newThread': '新对话',
  'workbench.sendError': '发送失败，请稍后再试',
  'agent.loading': '加载中',
  'agent.empty': '暂无内容',
  'agent.untitled': '未命名对话',
  'agent.noSummary': '暂无摘要',
  'agent.rows': '共 {0} 条',
  'search.placeholder': '搜索对话、业务或文件',
  'search.empty': '没有匹配结果',
  'search.help': '输入关键词筛选对话；Esc 关闭',
  'search.recent': '最近',
  'search.results': '搜索结果',
  'search.loading': '加载中…',
  'search.noMatch': '没有匹配的对话',
  'search.noRecent': '暂无最近对话',
  'search.emptyHint': '在工作台发起对话后将出现在此处',
  'search.error': '加载失败，请稍后重试',
  'search.recentLabel': '最近活跃',

  // 侧栏
  'sidebar.newThread': '新建会话',
  'sidebar.settings': '设置',
  'sidebar.logout': '退出登录',
  'sidebar.defaultChat': '对话',
  'sidebar.newAgentThread': '顾问',
  'sidebar.emptyThreads': '暂无对话',
  'sidebar.genInProgress': '图片/视频生成中',
  'agent.generation.switchHint':
    '当前对话仍有生成任务在进行；可稍后在原对话中查看结果，侧栏会显示生成状态。其它浏览器标签页也会同步刷新列表。',
  // 生成失败分桶（与后端 error_codes 对齐；UI 展示与文案不强制依赖 status）
  'agent.gen.err.concurrency_limit': '当前商户生成排队已满，请等其它任务完成后再试。',
  'agent.gen.err.insufficient_balance': '余额不足，前往充值后即可继续生成。',
  'agent.gen.err.bad_api_key': '模型密钥未配置或失效，请联系管理员。',
  'agent.gen.err.upstream_timeout': '上游模型响应超时，建议重试或换更轻量的模型。',
  'agent.gen.err.content_policy': '内容被上游策略拒绝，请调整提示词后重试。',
  'agent.gen.err.network_error': '网络异常，请稍后再试。',
  'agent.gen.err.rate_limited': '刷新过于频繁，请稍后再试。',
  'agent.gen.err.unknown': '生成失败，请重试或联系管理员。',
  'agent.gen.action.retry': '重试',
  'agent.gen.action.refresh': '刷新状态',
  'agent.gen.action.copyPrompt': '复制提示词',
  'agent.gen.action.recharge': '前往充值',
  'sidebar.collapseNav': '收起左侧导航',
  'sidebar.expandNav': '展开左侧导航',
  'teamChat.files': '文件',
  'teamChat.emptyHint': '暂无会话。可点「{0}」或使用上方铅笔图标开始。',
  'common.time.justNow': '刚刚',
  'common.time.minutes': '{0} 分钟',
  'common.time.hours': '{0} 小时',
  'common.time.days': '{0} 天',
  'time.justNow': '刚刚',
  'time.minutes': '{0} 分钟',
  'time.hours': '{0} 小时',
  'time.days': '{0} 天',

  // 服务器套餐卡片
  'spc.from': '起价',
  'spc.cycle': '月付',
  'spc.buy': '立即购买',
}

const EN: Dict = {
  'brand.name': 'Xiaoone',
  'brand.sub': 'Anytime · Anywhere · Inspiration · Execution',

  'qa.new-chat': 'New chat',
  'qa.search': 'Search',
  'qa.automation': 'Automation',
  'qa.account': 'Account',
  'qa.live-chat': 'Support',
  'qa.file-library': 'File library',
  'qa.team': 'Team',
  'qa.soon': 'Coming soon',
  'qa.demo': 'DEMO',

  'section.business': 'Smart team',
  'section.consultant': 'Advisor',
  'section.business.expand': 'Expand all submenus',
  'section.business.collapse': 'Collapse all submenus',
  'common.search.close': 'Close',

  'composer.attachShort': 'File / image',
  'composer.attachTip': 'Choose an image or file to attach',

  'top.theme.dark': 'Switch to dark',
  'top.theme.light': 'Switch to light',
  'top.lang.zh': '中文',
  'top.lang.en': 'English',
  'top.lang.toggle': 'Switch language',
  'top.merchant.none': 'No merchant',
  'top.merchant.switch': 'Switch merchant',
  'top.merchant.store': 'Store',
  'top.platformTeam': 'Platform team',
  'top.switchMerchantError': 'Failed to switch merchant',
  'top.platformUnavailable': 'Platform team is unavailable',

  'view.hero': 'Advisor',
  'view.kefu': 'Support',
  'view.live-chat': 'Customer inbox',
  'view.news': 'Automation',
  'view.agent': 'Smart team',
  'view.account': 'Account center',
  'view.team-mgmt': 'Merchant team',
  'view.teamManagement': 'Merchant team',
  'view.team-chat': 'Team comms',
  'view.platformTeam': 'Platform team',
  'view.feedback': 'Repairman',
  'view.placeholder': 'Coming soon',
  'view.archives': 'Archives',
  'view.generation-assets': 'Generated media',
  'view.generationAssets': 'Generated media',
  'view.file-library': 'File library',
  'view.skills': 'Skills',
  'view.workbench': 'Workbench',

  'biz.consultant': 'Advisor',
  'biz.system': 'Developer',
  'biz.marketing': 'Growth',
  'biz.kefu': 'Support',
  'biz.support': 'Channel specialist',
  'biz.agency': 'Account manager',
  'biz.team-chat': 'Team comms',
  'biz.automation': 'Automation',
  'biz.feedback': 'Repairman',
  'biz.file-library': 'File library',

  'kefu.workspace': 'Support workspace',
  'kefu.live-chat': 'Inbox',
  'kefu.stores': 'Stores',
  'kefu.qa-templates': 'Q&A templates',
  'kefu.tech-config': 'Tech setup',

  'teamChat.tabAll': 'All',
  'teamChat.emptyAll': 'No conversations yet. Start a DM or group on the right, or create new above.',
  'teamChat.startNew': 'Start new',
  'teamChat.dm': 'Direct messages',
  'teamChat.group': 'Groups',
  'teamChat.emptyDm': 'No direct conversations yet',
  'teamChat.emptyGroup': 'No group chats yet',

  'menu.settings': 'Settings',
  'menu.account': 'Account center',
  'menu.team': 'Merchant team',
  'menu.theme.dark': 'Dark mode',
  'menu.theme.light': 'Light mode',
  'menu.logout': 'Sign out',
  'menu.archives': 'Archives',
  'menu.generation-assets': 'Generated media library',

  'common.search.business': 'Search business & chats…',
  'common.demo': 'Demo data',
  'common.demo.banner':
    'Showing seeded demo data — accounts / merchants / chats are marked is_demo=true.',

  'hero.slogan': 'Anywhere · Anytime · Ideas · Execution',
  'hero.title.softwareCold': 'What should we do in Xiaoone Assistant?',
  'hero.intro.softwareCold':
    'Describe your idea and we will help you build a lightweight system that is truly yours, from 0 to 1. Try it now!',
  'hero.title.marketingPlay': 'Tell everyone what fun thing you are launching next!',
  'hero.title.context': 'What should we tackle in {0}?',
  'hero.title.automation': 'Let automation run for {0}',
  'hero.placeholder.xiaoone': 'Ask xiaoone Assistant anything. Shift+Enter for newline, Enter to send',
  'hero.placeholder.ask': 'Ask {0} anything. Shift+Enter for newline, Enter to send',
  'hero.placeholder.continue': 'Continue with {0}…',
  'hero.placeholder.default': 'Pick a business area, then describe what you need',
  'hero.placeholder.business': 'Tell {0} your goal, context, and requirements. Shift+Enter for newline, Enter to send',
  'hero.pickBusiness': 'Pick a business area',
  'hero.newThread': 'Advisor',
  'hero.stream': 'Stream responses',
  'hero.warn.pickBiz': 'Pick a business area that supports chat first',
  'workbench.loadPromptsError': 'Failed to load suggested prompts',
  'workbench.newThread': 'New thread',
  'workbench.sendError': 'Failed to send. Please try again later',
  'agent.loading': 'Loading',
  'agent.empty': 'No content yet',
  'agent.untitled': 'Untitled chat',
  'agent.noSummary': 'No summary yet',
  'agent.rows': '{0} total',
  'search.placeholder': 'Search chats, business, or files',
  'search.empty': 'No matching results',
  'search.help': 'Type to filter chats. Press Esc to close.',
  'search.recent': 'Recent',
  'search.results': 'Results',
  'search.loading': 'Loading…',
  'search.noMatch': 'No chats match your search',
  'search.noRecent': 'No recent chats yet',
  'search.emptyHint': 'Start a chat from the workbench to see it here',
  'search.error': 'Could not load. Try again shortly.',
  'search.recentLabel': 'Recently active',

  'sidebar.newThread': 'New thread',
  'sidebar.settings': 'Settings',
  'sidebar.logout': 'Sign out',
  'sidebar.defaultChat': 'Chat',
  'sidebar.newAgentThread': 'Advisor',
  'sidebar.emptyThreads': 'No threads yet',
  'sidebar.genInProgress': 'Image/video generating',
  'agent.generation.switchHint':
    'This chat still has an active generation. Open it again to view results; the sidebar shows progress. Other browser tabs refresh the list automatically.',
  'agent.gen.err.concurrency_limit': 'Merchant generation queue is full. Please wait for active tasks to finish.',
  'agent.gen.err.insufficient_balance': 'Insufficient balance. Top up to continue generating.',
  'agent.gen.err.bad_api_key': 'Model API key missing or invalid. Please contact an admin.',
  'agent.gen.err.upstream_timeout': 'Upstream model timed out. Try again or pick a lighter model.',
  'agent.gen.err.content_policy': 'Upstream rejected the prompt by content policy. Adjust and retry.',
  'agent.gen.err.network_error': 'Network error. Please try again later.',
  'agent.gen.err.rate_limited': 'Refreshing too often. Please wait a moment.',
  'agent.gen.err.unknown': 'Generation failed. Retry or contact an admin.',
  'agent.gen.action.retry': 'Retry',
  'agent.gen.action.refresh': 'Refresh status',
  'agent.gen.action.copyPrompt': 'Copy prompt',
  'agent.gen.action.recharge': 'Top up',
  'sidebar.collapseNav': 'Collapse sidebar',
  'sidebar.expandNav': 'Expand sidebar',
  'teamChat.files': 'Files',
  'teamChat.emptyHint': 'No chats yet. Use "{0}" or the pencil above to start.',
  'common.time.justNow': 'Just now',
  'common.time.minutes': '{0} min',
  'common.time.hours': '{0} h',
  'common.time.days': '{0} d',
  'time.justNow': 'Just now',
  'time.minutes': '{0} min',
  'time.hours': '{0} h',
  'time.days': '{0} d',

  'spc.from': 'From',
  'spc.cycle': 'per month',
  'spc.buy': 'Buy now',
}

const DICTS: Record<Locale, Dict> = { zh: ZH, en: EN }


interface LocaleState {
  locale: Locale
}

interface LocaleActions {
  isZh: () => boolean
  isEn: () => boolean
  init: () => void
  set: (loc: Locale) => void
  toggle: () => void
  applyHtmlLang: () => void
  t: (key: string, fallback?: string) => string
  tpl: (key: string, ...parts: string[]) => string
}

export const useLocaleStore = create<LocaleState & LocaleActions>()(
  persist(
    (set, get) => ({
      locale: 'zh',
      isZh: () => get().locale === 'zh',
      isEn: () => get().locale === 'en',
      init: () => get().applyHtmlLang(),
      set: (loc) => {
        set({ locale: loc })
        get().applyHtmlLang()
      },
      toggle: () => get().set(get().locale === 'zh' ? 'en' : 'zh'),
      applyHtmlLang: () => {
        if (typeof document !== 'undefined')
          document.documentElement.lang = get().locale === 'zh' ? 'zh-CN' : 'en'
      },
      t: (key, fallback) => {
        const dict = DICTS[get().locale]
        if (key in dict) return dict[key]
        if (fallback !== undefined) return fallback
        return key.split('.').filter(Boolean).pop() || key
      },
      tpl: (key, ...parts) => {
        let s = get().t(key)
        parts.forEach((p, i) => {
          s = s.split(`{${i}}`).join(p)
        })
        return s
      }
    }),
    {
      name: 'xiaoone-merchant-locale',
    }
  )
)
