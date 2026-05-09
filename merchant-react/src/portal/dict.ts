import type { LocalizedCopy } from './portalPrefs'

/**
 * 用户端「门面页」(LoginPage / RegisterPage) 的中英文字典。
 *
 * 不引入 i18next：portal 这两页只有几十条静态文案，常量字典 + `usePortalPrefs().t()`
 * 已经足够。后续工作台业务页若要 i18n，再独立引入正式方案，避免 portal 微调
 * 牵连整体依赖。
 */
export const portalDict = {
  // ---- 共用 ----
  brand: { zh: 'xiaoone', en: 'xiaoone' } as LocalizedCopy,
  backToSite: { zh: '返回官网首页', en: 'Back to marketing site' } as LocalizedCopy,
  signInLink: { zh: '已有账号？去登录', en: 'Already have an account? Sign in' } as LocalizedCopy,
  toggleLanguage: { zh: '切换语言', en: 'Switch language' } as LocalizedCopy,
  toggleTheme: { zh: '切换主题', en: 'Switch theme' } as LocalizedCopy,
  light: { zh: '浅色', en: 'Light' } as LocalizedCopy,
  dark: { zh: '深色', en: 'Dark' } as LocalizedCopy,

  // ---- Login ----
  loginHeroTitle: {
    zh: '登录您的智能工作站',
    en: 'Secure access portal',
  } as LocalizedCopy,
  loginHeroDesc: {
    zh: 'xiaoone 将访客咨询、业务协同与 AI 能力整合于一处，确保您的所有业务数据安全流转。',
    en: 'xiaoone unifies visitor inquiries, collaboration and AI capabilities — your data flows securely end to end.',
  } as LocalizedCopy,
  loginFeatureEncryption: {
    zh: '端到端加密验证',
    en: 'End-to-end encrypted verification',
  } as LocalizedCopy,
  loginFeatureAudit: {
    zh: '多因素安全审计',
    en: 'Multi-factor security audit',
  } as LocalizedCopy,
  loginCopyright: {
    zh: '© XIAOONE · 用户工作站',
    en: '© XIAOONE · USER PORTAL',
  } as LocalizedCopy,
  loginFormTitle: {
    zh: '登录用户端工作站',
    en: 'Sign in to the user workspace',
  } as LocalizedCopy,
  loginFormSub: {
    zh: '验证您的身份以继续使用工作站',
    en: 'Verify your identity to continue',
  } as LocalizedCopy,
  loginDemoTitle: {
    zh: '演示账号 · 一键填入',
    en: 'Demo accounts · one-click fill',
  } as LocalizedCopy,
  loginIdentifierTabPhone: {
    zh: '手机号',
    en: 'Phone',
  } as LocalizedCopy,
  loginIdentifierTabEmail: {
    zh: '邮箱',
    en: 'Email',
  } as LocalizedCopy,
  loginPhoneLabel: { zh: '手机号', en: 'Phone number' } as LocalizedCopy,
  loginPhonePlaceholder: { zh: '请输入 11 位手机号', en: 'Enter an 11-digit phone number' } as LocalizedCopy,
  loginEmailLabel: { zh: '邮箱', en: 'Email address' } as LocalizedCopy,
  loginEmailPlaceholder: { zh: '请输入邮箱', en: 'you@company.com' } as LocalizedCopy,
  loginModeSms: { zh: '验证码登录', en: 'SMS code' } as LocalizedCopy,
  loginModePassword: { zh: '密码登录', en: 'Password' } as LocalizedCopy,
  loginSmsCodeLabel: { zh: '短信验证码', en: 'SMS verification code' } as LocalizedCopy,
  loginSmsCodeHint: {
    zh: '腾讯云短信发送，5 分钟内有效',
    en: 'Sent by Tencent Cloud SMS; valid for 5 minutes',
  } as LocalizedCopy,
  loginSmsCodePlaceholder: { zh: '6 位验证码', en: '6-digit code' } as LocalizedCopy,
  loginPasswordLabel: { zh: '密码', en: 'Password' } as LocalizedCopy,
  loginPasswordHint: {
    zh: '忘记密码？请联系管理员',
    en: 'Forgot? Contact admin',
  } as LocalizedCopy,
  loginSubmitting: { zh: '安全验证中...', en: 'Authenticating…' } as LocalizedCopy,
  loginSubmit: { zh: '验证并登录', en: 'Verify & sign in' } as LocalizedCopy,
  loginGotoRegisterPrefix: {
    zh: '尚未配置工作站？',
    en: "Don't have an account? ",
  } as LocalizedCopy,
  loginGotoRegisterLink: {
    zh: '立即创建',
    en: 'Create workspace',
  } as LocalizedCopy,
  loginErrorFallback: {
    zh: '登录失败，请检查账号与密码',
    en: 'Sign in failed, please check your credentials',
  } as LocalizedCopy,
  loginErrorRetry: {
    zh: '登录失败，请稍后重试',
    en: 'Sign in failed, please try again later',
  } as LocalizedCopy,
  loginErrorPhoneInvalid: {
    zh: '请输入有效的 11 位手机号',
    en: 'Please enter a valid 11-digit phone number',
  } as LocalizedCopy,
  loginErrorSmsFallback: {
    zh: '验证码发送失败，请稍后重试',
    en: 'Failed to send code, please retry shortly',
  } as LocalizedCopy,

  // ---- Register ----
  registerStep: {
    industry: { zh: '选择行业', en: 'Industry' } as LocalizedCopy,
    goal: { zh: '输入目标', en: 'Goal' } as LocalizedCopy,
    workspace: { zh: '工作站设置', en: 'Workspace' } as LocalizedCopy,
    plan: { zh: '选择套餐', en: 'Plan' } as LocalizedCopy,
    verify: { zh: '安全验证', en: 'Verify' } as LocalizedCopy,
    emailVerify: { zh: '邮箱验证', en: 'Email verify' } as LocalizedCopy,
    done: { zh: '完成', en: 'Done' } as LocalizedCopy,
  },
  registerIndustry: {
    ecommerce: { zh: '跨境电商', en: 'Cross-border e-commerce' } as LocalizedCopy,
    saas: { zh: 'SaaS / 软件', en: 'SaaS / software' } as LocalizedCopy,
    game: { zh: '游戏出海', en: 'Gaming (overseas)' } as LocalizedCopy,
    edu: { zh: '在线教育', en: 'Online education' } as LocalizedCopy,
    other: { zh: '其他行业', en: 'Other industry' } as LocalizedCopy,
  },
  registerGoal: {
    support: { zh: '提升客服效率 ⚡️', en: 'Support efficiency ⚡️' } as LocalizedCopy,
    sales: { zh: '增加销售转化 💰', en: 'Sales conversion 💰' } as LocalizedCopy,
    collab: { zh: '跨部门协同 🤝', en: 'Cross-team collaboration 🤝' } as LocalizedCopy,
    insights: { zh: '数据分析与洞察 📊', en: 'Analytics & insights 📊' } as LocalizedCopy,
  },
  registerStep1Title: {
    zh: '您所在的行业是？',
    en: 'Which industry are you in?',
  } as LocalizedCopy,
  registerStep1Sub: {
    zh: '帮助 xiaoone 为您匹配最合适的初始配置和语料模型。',
    en: 'Helps xiaoone tailor the initial setup and language model.',
  } as LocalizedCopy,
  registerStep2Bot: {
    zh: '太棒了！接下来，能告诉我您主要想用 xiaoone 解决什么问题吗？我会为您推荐专属模块。',
    en: "Awesome! What's the main problem you want xiaoone to solve? I'll recommend tailored modules.",
  } as LocalizedCopy,
  registerStep2InputPlaceholder: {
    zh: '或者直接告诉我您的其他想法...',
    en: 'Or tell me your own idea...',
  } as LocalizedCopy,
  registerStep3Title: {
    zh: '给您的工作站起个名字',
    en: 'Name your workspace',
  } as LocalizedCopy,
  registerStep3Sub: {
    zh: '这将作为您团队协作的唯一入口。',
    en: 'This will be your team’s single entry point.',
  } as LocalizedCopy,
  registerStep3WsLabel: { zh: '工作站名称', en: 'Workspace name' } as LocalizedCopy,
  registerStep3WsPlaceholder: {
    zh: '例如：Acme Corp 智能客服中心',
    en: 'e.g. Acme Corp Support Center',
  } as LocalizedCopy,
  registerStep3NickLabel: { zh: '您的称呼', en: 'How shall we call you' } as LocalizedCopy,
  registerStep3NickPlaceholder: {
    zh: '例如：王总 / 运营负责人',
    en: 'e.g. Director / Ops lead',
  } as LocalizedCopy,
  registerNext: { zh: '下一步', en: 'Next' } as LocalizedCopy,
  registerStep4Title: { zh: '选择初始版本', en: 'Pick your starter plan' } as LocalizedCopy,
  registerStep4Sub: {
    zh: '您可以先从免费版开始，随时升级。',
    en: 'Start free; upgrade any time.',
  } as LocalizedCopy,
  registerPlanFreeName: { zh: '免费体验版', en: 'Free' } as LocalizedCopy,
  registerPlanFreeDesc: {
    zh: '包含 1 个工作台席位，每月 500 条基础 AI 额度。',
    en: '1 workbench seat, 500 basic AI messages / month.',
  } as LocalizedCopy,
  registerPlanProName: { zh: 'Pro 专业版', en: 'Pro' } as LocalizedCopy,
  registerPlanProDesc: {
    zh: '10 个账号，无限制对话，全渠道接入及高级自动化。',
    en: '10 seats, unlimited chats, omni-channel & advanced automation.',
  } as LocalizedCopy,
  registerPlanProPriceUnit: { zh: '/月', en: '/mo' } as LocalizedCopy,
  registerConfirmPlan: { zh: '确认选择', en: 'Confirm plan' } as LocalizedCopy,
  registerStep5Title: { zh: '创建超级管理员账号', en: 'Create the owner account' } as LocalizedCopy,
  registerStep5EmailTitle: { zh: '验证 Owner 邮箱', en: 'Verify the owner email' } as LocalizedCopy,
  registerStep5SubPrefix: {
    zh: '作为工作站的最高权限拥有者。短信验证码',
    en: 'Top-level workspace owner. The SMS verification code',
  } as LocalizedCopy,
  registerStep5SubSuffix: {
    zh: '5 分钟内有效。',
    en: 'is valid for 5 minutes.',
  } as LocalizedCopy,
  registerStep5EmailSubPrefix: {
    zh: '海外版将使用邮箱作为登录账号。邮箱验证码',
    en: 'The overseas version uses email as the sign-in account. The email verification code',
  } as LocalizedCopy,
  registerStep5EmailSubSuffix: {
    zh: '5 分钟内有效。',
    en: 'is valid for 5 minutes.',
  } as LocalizedCopy,
  registerEmailLabel: { zh: '邮箱', en: 'Email address' } as LocalizedCopy,
  registerEmailPlaceholder: {
    zh: '输入您的邮箱',
    en: 'you@company.com',
  } as LocalizedCopy,
  registerPhoneLabel: { zh: '手机号', en: 'Phone number' } as LocalizedCopy,
  registerPhonePlaceholder: {
    zh: '输入您的手机号（11 位）',
    en: 'Enter your phone (11 digits, CN format)',
  } as LocalizedCopy,
  registerCodeLabel: { zh: '验证码', en: 'Verification code' } as LocalizedCopy,
  registerCodePlaceholder: {
    zh: '6 位验证码',
    en: '6-digit code',
  } as LocalizedCopy,
  registerCodeRetry: { zh: '后重试', en: ' until retry' } as LocalizedCopy,
  registerCodeSending: { zh: '发送中...', en: 'Sending…' } as LocalizedCopy,
  registerCodeSend: { zh: '获取验证码', en: 'Send code' } as LocalizedCopy,
  registerPasswordLabel: { zh: '设置密码', en: 'Set password' } as LocalizedCopy,
  registerPasswordPlaceholder: { zh: '不少于 6 位字符', en: 'At least 6 characters' } as LocalizedCopy,
  registerSubmitting: { zh: '创建中...', en: 'Creating…' } as LocalizedCopy,
  registerSubmit: { zh: '创建账号', en: 'Create account' } as LocalizedCopy,
  registerStep6Title: { zh: '工作站创建成功！', en: 'Workspace ready!' } as LocalizedCopy,
  registerStep6DescPrefix: {
    zh: '我们已为您初始化了',
    en: 'We have initialized',
  } as LocalizedCopy,
  registerStep6DescDefaultName: {
    zh: '专属工作站',
    en: 'your dedicated workspace',
  } as LocalizedCopy,
  registerStep6DescSuffix: {
    zh: '的基础设置，正在跳转到工作台。',
    en: '. Heading to the workbench now.',
  } as LocalizedCopy,
  registerEnterWorkbench: { zh: '进入工作台', en: 'Enter workbench' } as LocalizedCopy,
  registerStepBack: { zh: '返回上一步', en: 'Back' } as LocalizedCopy,
  registerErrorPhoneInvalid: {
    zh: '请输入有效的 11 位手机号',
    en: 'Please enter a valid 11-digit phone number',
  } as LocalizedCopy,
  registerErrorEmailInvalid: {
    zh: '请输入有效的邮箱地址',
    en: 'Please enter a valid email address',
  } as LocalizedCopy,
  registerErrorCode: {
    zh: '请输入收到的验证码',
    en: 'Please enter the code',
  } as LocalizedCopy,
  registerErrorPassword: {
    zh: '密码至少 6 位',
    en: 'Password must be at least 6 characters',
  } as LocalizedCopy,
  registerErrorSmsFallback: {
    zh: '验证码发送失败，请稍后重试',
    en: 'Failed to send code, please retry shortly',
  } as LocalizedCopy,
  registerErrorEmailFallback: {
    zh: '邮箱验证码发送失败，请稍后重试',
    en: 'Failed to send email code, please retry shortly',
  } as LocalizedCopy,
  registerErrorRegisterFallback: {
    zh: '创建工作站失败，请稍后再试',
    en: 'Failed to create workspace, please try again',
  } as LocalizedCopy,
} as const

export const demoAccountHints = {
  fusesim: {
    zh: '海外版示例：跨境电商工作站',
    en: 'Overseas demo: cross-border e-commerce',
  } as LocalizedCopy,
  mall: {
    zh: '国内版示例：智能客服商城',
    en: 'Domestic demo: smart support mall',
  } as LocalizedCopy,
}
