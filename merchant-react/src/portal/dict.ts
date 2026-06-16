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
  loginLocalAccountTitle: {
    zh: '本地测试账号',
    en: 'Local test account',
  } as LocalizedCopy,
  loginLocalAccountDesc: {
    zh: '已确认可登录本地商户端，含有效会员与平台点余额。',
    en: 'Verified for the local user portal, with active membership and points.',
  } as LocalizedCopy,
  loginLocalAccountFill: {
    zh: '填入账号',
    en: 'Fill account',
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
  loginModeSms: { zh: '验证码登录', en: 'Verification code' } as LocalizedCopy,
  loginModePassword: { zh: '密码登录', en: 'Password' } as LocalizedCopy,
  loginSmsCodeLabel: { zh: '短信验证码', en: 'SMS verification code' } as LocalizedCopy,
  loginSmsCodeHint: {
    zh: '短信验证码5分钟内有效',
    en: 'SMS code is valid for 5 minutes',
  } as LocalizedCopy,
  loginEmailCodeLabel: { zh: '邮箱验证码', en: 'Email verification code' } as LocalizedCopy,
  loginEmailCodeHint: {
    zh: '邮箱验证码5分钟内有效',
    en: 'Email code is valid for 5 minutes',
  } as LocalizedCopy,
  loginSmsCodePlaceholder: { zh: '6 位验证码', en: '6-digit code' } as LocalizedCopy,
  loginPasswordLabel: { zh: '密码', en: 'Password' } as LocalizedCopy,
  loginPasswordHint: {
    zh: '忘记密码？',
    en: 'Forgot password?',
  } as LocalizedCopy,
  loginForgotPasswordLink: {
    zh: '点此重置',
    en: 'Reset it',
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
  loginErrorEmailInvalid: {
    zh: '请输入有效的邮箱地址',
    en: 'Please enter a valid email address',
  } as LocalizedCopy,
  loginErrorSmsFallback: {
    zh: '验证码发送失败，请稍后重试',
    en: 'Failed to send code, please retry shortly',
  } as LocalizedCopy,
  loginErrorEmailFallback: {
    zh: '邮箱验证码发送失败，请稍后重试',
    en: 'Failed to send email code, please retry shortly',
  } as LocalizedCopy,

  // ---- Register ----
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
  registerPasswordConfirmLabel: { zh: '确认密码', en: 'Confirm password' } as LocalizedCopy,
  registerPasswordConfirmPlaceholder: { zh: '请再次输入密码', en: 'Enter the password again' } as LocalizedCopy,
  registerSubmitting: { zh: '创建中...', en: 'Creating…' } as LocalizedCopy,
  registerSubmit: { zh: '创建账号', en: 'Create account' } as LocalizedCopy,
  registerProvisioningKicker: { zh: '正在开通专属空间', en: 'Provisioning your space' } as LocalizedCopy,
  registerProvisioningTitle: { zh: '正在把工作站点亮', en: 'Lighting up your workspace' } as LocalizedCopy,
  registerProvisioningDescPrefix: {
    zh: '请稍等，',
    en: 'Please wait while ',
  } as LocalizedCopy,
  registerProvisioningDescSuffix: {
    zh: ' 的空间、通道和初始设置正在同步。',
    en: ' is getting its space, channel, and starter settings.',
  } as LocalizedCopy,
  registerProvisioningStepAccount: { zh: '账号身份已确认', en: 'Owner identity confirmed' } as LocalizedCopy,
  registerProvisioningStepWorkspace: { zh: '创建团队工作空间', en: 'Creating team workspace' } as LocalizedCopy,
  registerProvisioningStepChannel: { zh: '连接xiaoone 通道', en: 'Connecting xiaoone channel' } as LocalizedCopy,
  registerProvisioningStepWorkbench: { zh: '准备进入工作台', en: 'Preparing workbench' } as LocalizedCopy,
  registerProvisioningBlockedTitle: { zh: '账号已创建，空间仍在处理', en: 'Account created, space still needs attention' } as LocalizedCopy,
  registerProvisioningBlockedDesc: {
    zh: '我们没有把后台开通任务误判为完成。请稍后登录，或联系平台处理。',
    en: 'We did not mark the background setup as complete. Sign in later or contact support.',
  } as LocalizedCopy,
  registerProvisioningBlockedFallback: { zh: '空间开通受阻，请稍后登录或联系平台处理。', en: 'Workspace provisioning is blocked. Sign in later or contact support.' } as LocalizedCopy,
  registerProvisioningTimeout: { zh: '空间仍在开通中，请稍后登录。', en: 'Workspace provisioning is still running. Sign in later.' } as LocalizedCopy,
  registerProvisioningLoginRequired: { zh: '账号已创建，但自动登录未完成。请返回登录页后查看工作台状态。', en: 'Account created, but automatic sign-in did not complete. Sign in to check workspace status.' } as LocalizedCopy,
  registerEnterWorkbench: { zh: '进入工作台', en: 'Enter workbench' } as LocalizedCopy,
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
  registerErrorPasswordMismatch: {
    zh: '两次输入的密码不一致',
    en: 'Passwords do not match',
  } as LocalizedCopy,
  registerErrorTerms: {
    zh: '请先阅读并勾选同意用户协议与隐私政策',
    en: 'Please read and agree to the User Agreement and Privacy Policy first',
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

  // ---- Register（精简单页版补充） ----
  registerSimpleHeroTitle: {
    zh: '加入 xiaoone 智能工作站',
    en: 'Join xiaoone intelligent workstation',
  } as LocalizedCopy,
  registerSimpleHeroDesc: {
    zh: '注册后立即进入工作台，智能空间在后台自动开通，约 3 分钟完成。',
    en: 'Sign up to enter the workbench immediately. Your smart space provisions in about 3 minutes.',
  } as LocalizedCopy,
  registerSimpleFeatureSpace: {
    zh: '专属智能工作空间，开箱即用',
    en: 'Dedicated smart workspace out of the box',
  } as LocalizedCopy,
  registerSimpleFeatureChannel: {
    zh: '内置 xiaoone 通道，渠道数据互通',
    en: 'Built-in xiaoone channel, unified data flow',
  } as LocalizedCopy,
  registerSimpleFeatureFree: {
    zh: '免费版即可体验全套核心能力',
    en: 'Free tier covers all core capabilities',
  } as LocalizedCopy,
  registerSimpleFormTitle: {
    zh: '创建您的工作站',
    en: 'Create your workstation',
  } as LocalizedCopy,
  registerSimpleFormSub: {
    zh: '完成下方信息即可立即使用',
    en: 'Fill in the form to get started instantly',
  } as LocalizedCopy,
  registerNicknameLabel: {
    zh: '您的称呼（选填）',
    en: 'How shall we call you (optional)',
  } as LocalizedCopy,
  registerNicknamePlaceholder: {
    zh: '例如：小一',
    en: 'e.g. Alex',
  } as LocalizedCopy,
  registerWorkspaceNameLabel: {
    zh: '工作站名称（选填）',
    en: 'Workspace name (optional)',
  } as LocalizedCopy,
  registerWorkspaceNamePlaceholder: {
    zh: '例如：Acme 智能客服中心',
    en: 'e.g. Acme Support Center',
  } as LocalizedCopy,
  registerSubdomainLabel: {
    zh: '二级域名',
    en: 'Workspace subdomain',
  } as LocalizedCopy,
  registerSubdomainPlaceholder: {
    zh: '例如：acme2026',
    en: 'e.g. acme2026',
  } as LocalizedCopy,
  registerSubdomainSuffix: {
    zh: '.xiaoone.cn',
    en: '.xiaoone.cn',
  } as LocalizedCopy,
  registerSubdomainTip: {
    zh: '仅支持小写字母、数字和短横线，长度 3-20。',
    en: 'Use lowercase letters, numbers, and dashes, 3-20 chars.',
  } as LocalizedCopy,
  registerSubdomainTaken: {
    zh: '该二级域名已被占用，请更换。',
    en: 'This subdomain is already taken.',
  } as LocalizedCopy,
  registerSubdomainInvalid: {
    zh: '二级域名格式不合法（3-20 位，不能以 - 开头或结尾）。',
    en: 'Invalid subdomain format (3-20 chars, cannot start/end with -).',
  } as LocalizedCopy,
  registerLocalAdvancedToggle: {
    zh: '本地高级选项',
    en: 'Local advanced options',
  } as LocalizedCopy,
  registerLocalAdvancedHint: {
    zh: '仅在本地开发环境可见，预览/正式环境由平台统一配置。',
    en: 'Visible in local dev only. Preview/Prod use the platform-managed default.',
  } as LocalizedCopy,
  registerWorkspaceModeLabel: {
    zh: '智能工作站 provider',
    en: 'Smart workstation provider',
  } as LocalizedCopy,
  registerWorkspaceModeTm: {
    zh: '智能工作站 · tm',
    en: 'Smart Workstation · tm',
  } as LocalizedCopy,
  registerWorkspaceModeTmDesc: {
    zh: '链接到 106 模板机的共享 Hermes 工作区，所有本地用户共用，调试结果可打成 CVM 自定义镜像。',
    en: 'Connects to the shared Hermes template machine on 106 for local users; debug output can become a CVM custom image.',
  } as LocalizedCopy,
  registerWorkspaceModeCvm: {
    zh: '智能工作站 · cvm',
    en: 'Smart Workstation · cvm',
  } as LocalizedCopy,
  registerWorkspaceModeCvmDesc: {
    zh: '腾讯云 CVM Hermes 镜像，与预览/正式注册路径一致。',
    en: 'Tencent Cloud CVM Hermes image, matching preview/prod registration.',
  } as LocalizedCopy,
  registerLoginInsteadLink: {
    zh: '已有账号？去登录',
    en: 'Already have an account? Sign in',
  } as LocalizedCopy,
  registerToLogin: {
    zh: '直接登录',
    en: 'Sign in instead',
  } as LocalizedCopy,
  registerSuccessNotice: {
    zh: '注册成功，正在进入工作台。智能空间将在 3 分钟内准备就绪。',
    en: 'Sign up complete. Heading to the workbench. Smart space ready in ~3 min.',
  } as LocalizedCopy,
  registerTermsPrefix: {
    zh: '我已阅读并同意',
    en: 'I have read and agree to the ',
  } as LocalizedCopy,
  registerTermsAgreement: {
    zh: '《用户协议》',
    en: 'User Agreement',
  } as LocalizedCopy,
  registerTermsJoin: {
    zh: '和',
    en: ' and ',
  } as LocalizedCopy,
  registerTermsPrivacy: {
    zh: '《隐私政策》',
    en: 'Privacy Policy',
  } as LocalizedCopy,

  // ---- Forgot password ----
  forgotHeroTitle: {
    zh: '重置您的登录密码',
    en: 'Reset your password',
  } as LocalizedCopy,
  forgotHeroDesc: {
    zh: '通过已绑定的手机号或邮箱获取验证码，3 步完成重置。',
    en: 'Use your bound phone or email. Three steps and you’re back in.',
  } as LocalizedCopy,
  forgotFeatureChannel: {
    zh: '按已绑定身份自动选择验证渠道',
    en: 'Automatic channel based on your bound identity',
  } as LocalizedCopy,
  forgotFeatureSecure: {
    zh: '5 分钟有效，超时自动失效',
    en: '5-minute validity with auto-expire',
  } as LocalizedCopy,
  forgotFormTitle: {
    zh: '忘记密码',
    en: 'Forgot password',
  } as LocalizedCopy,
  forgotFormSub: {
    zh: '输入注册时使用的手机号或邮箱',
    en: 'Enter the phone or email used at signup',
  } as LocalizedCopy,
  forgotIdentifierLabel: {
    zh: '手机号 / 邮箱',
    en: 'Phone or email',
  } as LocalizedCopy,
  forgotIdentifierPlaceholder: {
    zh: '请输入手机号或邮箱',
    en: 'Enter your phone or email',
  } as LocalizedCopy,
  forgotIdentifierInvalid: {
    zh: '请输入有效的手机号或邮箱',
    en: 'Please enter a valid phone or email',
  } as LocalizedCopy,
  forgotAccountNotFound: {
    zh: '未查询到与该信息匹配的账号',
    en: 'No account matches this identifier',
  } as LocalizedCopy,
  forgotSendCode: {
    zh: '获取验证码',
    en: 'Send code',
  } as LocalizedCopy,
  forgotCodeLabel: {
    zh: '验证码',
    en: 'Verification code',
  } as LocalizedCopy,
  forgotCodePlaceholder: {
    zh: '请输入 6 位验证码',
    en: '6-digit code',
  } as LocalizedCopy,
  forgotNoticeSentSms: {
    zh: '短信验证码已发送至手机。',
    en: 'SMS verification code sent.',
  } as LocalizedCopy,
  forgotNoticeSentEmail: {
    zh: '邮箱验证码已发送至邮箱。',
    en: 'Email verification code sent.',
  } as LocalizedCopy,
  forgotNewPasswordLabel: {
    zh: '设置新密码',
    en: 'New password',
  } as LocalizedCopy,
  forgotNewPasswordPlaceholder: {
    zh: '不少于 6 位字符',
    en: 'At least 6 characters',
  } as LocalizedCopy,
  forgotConfirmPasswordLabel: {
    zh: '再次输入新密码',
    en: 'Confirm new password',
  } as LocalizedCopy,
  forgotPasswordMismatch: {
    zh: '两次输入的密码不一致',
    en: 'Passwords do not match',
  } as LocalizedCopy,
  forgotSubmitting: {
    zh: '正在重置...',
    en: 'Resetting…',
  } as LocalizedCopy,
  forgotSubmit: {
    zh: '完成密码重置',
    en: 'Reset password',
  } as LocalizedCopy,
  forgotSuccessTitle: {
    zh: '密码重置成功',
    en: 'Password reset',
  } as LocalizedCopy,
  forgotSuccessDesc: {
    zh: '请使用新密码重新登录',
    en: 'Sign in again with your new password',
  } as LocalizedCopy,
  forgotBackToLogin: {
    zh: '返回登录',
    en: 'Back to sign in',
  } as LocalizedCopy,
  forgotErrorFallback: {
    zh: '重置密码失败，请稍后重试',
    en: 'Reset failed, please retry shortly',
  } as LocalizedCopy,
  forgotErrorSendFallback: {
    zh: '验证码发送失败，请稍后重试',
    en: 'Failed to send code, please retry shortly',
  } as LocalizedCopy,

  // ---- Auth chat portal ----
  chatStyleSwitchClassic: {
    zh: '切换到传统登录',
    en: 'Switch to classic form',
  } as LocalizedCopy,
  chatStyleSwitchChat: {
    zh: '切换到 AI 对话',
    en: 'Switch to AI chat',
  } as LocalizedCopy,
  chatChipSmsLogin: {
    zh: '验证码登录',
    en: 'Code sign-in',
  } as LocalizedCopy,
  chatChipPasswordLogin: {
    zh: '密码登录',
    en: 'Password sign-in',
  } as LocalizedCopy,
  chatChipResetPassword: {
    zh: '重置密码',
    en: 'Reset password',
  } as LocalizedCopy,
  chatChipRegister: {
    zh: '注册智能空间站',
    en: 'Create smart workspace',
  } as LocalizedCopy,
  chatComposerPlaceholder: {
    zh: '输入消息…',
    en: 'Type a message…',
  } as LocalizedCopy,
  chatComposerSend: {
    zh: '发送',
    en: 'Send',
  } as LocalizedCopy,
  chatComposerSkip: {
    zh: '跳过',
    en: 'Skip',
  } as LocalizedCopy,
  chatComposerAcceptTerms: {
    zh: '我已阅读并同意',
    en: 'I agree',
  } as LocalizedCopy,
  chatWelcome: {
    zh: '你好，我是 xiaoone 登录助手。请选择下方快捷入口，或直接告诉我你的手机号/邮箱。',
    en: 'Hi, I am the xiaoone sign-in assistant. Pick a shortcut below, or tell me your phone or email.',
  } as LocalizedCopy,
  chatAskIdentifierPhone: {
    zh: '请输入你的 11 位手机号。',
    en: 'Please enter your 11-digit phone number.',
  } as LocalizedCopy,
  chatAskIdentifierEmail: {
    zh: '请输入你的邮箱地址。',
    en: 'Please enter your email address.',
  } as LocalizedCopy,
  chatAskPassword: {
    zh: '请输入登录密码。',
    en: 'Please enter your password.',
  } as LocalizedCopy,
  chatAskCode: {
    zh: '验证码已发送，请输入 6 位验证码。',
    en: 'Code sent. Enter the 6-digit verification code.',
  } as LocalizedCopy,
  chatSendingCode: {
    zh: '正在发送验证码…',
    en: 'Sending verification code…',
  } as LocalizedCopy,
  chatCodeSentPhone: {
    zh: '短信验证码已发送。',
    en: 'SMS code sent.',
  } as LocalizedCopy,
  chatCodeSentEmail: {
    zh: '邮箱验证码已发送。',
    en: 'Email code sent.',
  } as LocalizedCopy,
  chatLoggingIn: {
    zh: '正在验证并登录…',
    en: 'Signing you in…',
  } as LocalizedCopy,
  chatLoginSuccess: {
    zh: '登录成功，正在进入工作台…',
    en: 'Signed in. Opening your workbench…',
  } as LocalizedCopy,
  chatAskNewPassword: {
    zh: '请设置新密码（不少于 6 位）。',
    en: 'Set a new password (at least 6 characters).',
  } as LocalizedCopy,
  chatAskConfirmPassword: {
    zh: '请再次输入新密码以确认。',
    en: 'Enter the new password again to confirm.',
  } as LocalizedCopy,
  chatResetting: {
    zh: '正在重置密码…',
    en: 'Resetting password…',
  } as LocalizedCopy,
  chatResetSuccess: {
    zh: '密码已重置。你可以点击「密码登录」用新密码登录。',
    en: 'Password reset complete. Tap Password sign-in to continue.',
  } as LocalizedCopy,
  chatAskRegisterPassword: {
    zh: '请设置账号密码（不少于 6 位）。',
    en: 'Set your account password (at least 6 characters).',
  } as LocalizedCopy,
  chatAskTerms: {
    zh: '注册前请阅读并同意《用户协议》和《隐私政策》。',
    en: 'Before registering, please read and agree to the User Agreement and Privacy Policy.',
  } as LocalizedCopy,
  chatAskNickname: {
    zh: '请填写你的用户名（显示名称）。',
    en: 'Choose a display name for your account.',
  } as LocalizedCopy,
  chatAskAvatar: {
    zh: '可选择上传头像，或点击「跳过」使用默认 logo。',
    en: 'Upload an avatar, or tap Skip to use the default logo.',
  } as LocalizedCopy,
  chatAskWorkspace: {
    zh: '请填写智能空间站名称（至少 2 个字符）。',
    en: 'Name your smart workspace (at least 2 characters).',
  } as LocalizedCopy,
  chatSubdomainChecking: {
    zh: '正在校验二级域名…',
    en: 'Checking subdomain availability…',
  } as LocalizedCopy,
  chatSubdomainAvailable: {
    zh: '二级域名可用，正在开通空间站…',
    en: 'Subdomain available. Creating your workspace…',
  } as LocalizedCopy,
  chatRegisterSuccess: {
    zh: '空间站已创建。接下来选择套餐即可解除功能限制。',
    en: 'Workspace created. Choose a plan to unlock full access.',
  } as LocalizedCopy,
  chatSwitchIdentifierHint: {
    zh: '你也可以切换验证方式：',
    en: 'You can also switch identity type:',
  } as LocalizedCopy,
  chatFlowPasswordIntro: {
    zh: '好的，我们使用密码登录。请先告诉我你的手机号或邮箱。',
    en: 'Password sign-in it is. Start with your phone or email.',
  } as LocalizedCopy,
  chatFlowSmsIntro: {
    zh: '好的，我们使用验证码登录。请先告诉我你的手机号或邮箱。',
    en: 'Code sign-in it is. Start with your phone or email.',
  } as LocalizedCopy,
  chatFlowResetIntro: {
    zh: '好的，我来帮你重置密码。请输入注册时使用的手机号或邮箱。',
    en: 'Let me help reset your password. Enter the phone or email used at signup.',
  } as LocalizedCopy,
  chatFlowRegisterIntro: {
    zh: '欢迎注册 xiaoone 智能空间站。请先告诉我你的手机号或邮箱。',
    en: 'Welcome to xiaoone. Start with your phone or email to register.',
  } as LocalizedCopy,
  chatInvalidIdentifier: {
    zh: '格式不正确，请重新输入。',
    en: 'Invalid format. Please try again.',
  } as LocalizedCopy,
  chatInvalidCode: {
    zh: '请输入 6 位验证码。',
    en: 'Please enter a 6-digit code.',
  } as LocalizedCopy,
  chatInvalidPassword: {
    zh: '密码至少 6 位。',
    en: 'Password must be at least 6 characters.',
  } as LocalizedCopy,
  chatPasswordMismatch: {
    zh: '两次输入的密码不一致，请重新确认。',
    en: 'Passwords do not match. Please try again.',
  } as LocalizedCopy,
  chatTermsRequired: {
    zh: '请先同意用户协议与隐私政策。',
    en: 'Please agree to the terms first.',
  } as LocalizedCopy,
  chatSubdomainInvalid: {
    zh: '二级域名不可用，请更换空间站名称。',
    en: 'Subdomain unavailable. Try a different workspace name.',
  } as LocalizedCopy,
  chatSubdomainTaken: {
    zh: '该二级域名已被占用，请更换名称。',
    en: 'This subdomain is taken. Try another name.',
  } as LocalizedCopy,
  chatGenericError: {
    zh: '操作失败，请稍后重试。',
    en: 'Something went wrong. Please try again.',
  } as LocalizedCopy,
  chatResendCode: {
    zh: '重新发送验证码',
    en: 'Resend code',
  } as LocalizedCopy,
  chatResendCooldown: {
    zh: '秒后重发',
    en: 's until resend',
  } as LocalizedCopy,
} as const
