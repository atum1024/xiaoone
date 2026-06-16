import { SOCIAL_PLATFORM_OPTIONS } from '../../lib/socialApi'

export const VIP_PLATFORMS = SOCIAL_PLATFORM_OPTIONS.map(p => ({
  id: p.value,
  label: p.label,
}))

export type VipSectionTone = 'dark' | 'light' | 'band'

export interface VipSectionData {
  id: string
  index: number
  tone: VipSectionTone
  titleZh: string
  titleEn: string
  bodyZh: string
  bodyEn: string
  bgImage?: string
  shots?: { src: string; altZh: string; altEn: string }[]
  samples?: { src: string; altZh: string; altEn: string }[]
  chips?: { zh: string; en: string }[]
}

export const VIP_SECTIONS: VipSectionData[] = [
  {
    id: 'mission',
    index: 2,
    tone: 'dark',
    titleZh: '面向全球窗口的创业',
    titleEn: 'Build for a global window',
    bodyZh: 'xiaoone 的主旨，是让普通人也能通过 xiaoone 面对全球窗口创业，售卖产品和服务。一个人起步，也能拥有面向世界的经营界面。',
    bodyEn: 'xiaoone helps everyday founders open a global window to sell products and services, with one workspace that feels ready from day one.',
    bgImage: '/vip/bg/band-aurora.png',
  },
  {
    id: 'infra',
    index: 3,
    tone: 'light',
    titleZh: '全球化业务的基础能力',
    titleEn: 'Foundation for global operations',
    bodyZh: '加速器、美国短信、广告支付卡，是面向全球化业务的基础能力。网络、触达与支付，先铺好，再谈增长。',
    bodyEn: 'Accelerator access, US SMS, and ad payment cards form the foundation for global business: reach, messaging, and payments in one stack.',
    samples: [{ src: '/vip/samples/infra.png', altZh: '全球化基础能力网络插画', altEn: 'Global infrastructure network illustration' }],
    shots: [
      { src: '/vip/shots/cards.png', altZh: '广告支付卡工作台界面', altEn: 'Ad payment card workspace' },
      { src: '/vip/shots/us-number.png', altZh: '美国短信号码工作台界面', altEn: 'US SMS number workspace' },
    ],
    chips: [
      { zh: '加速器', en: 'Accelerator' },
      { zh: '美国短信', en: 'US SMS' },
      { zh: '广告支付卡', en: 'Ad payment cards' },
    ],
  },
  {
    id: 'social',
    index: 4,
    tone: 'dark',
    titleZh: '13 个海外平台，一键触达世界',
    titleEn: '13 platforms, one publish flow',
    bodyZh: '我们支持 13 个海外平台的自动化发帖，让用户一键触达世界的各个角落。内容、账号与排期，在同一套工作台里完成。',
    bodyEn: 'Automated posting across 13 overseas platforms lets you reach audiences worldwide from one scheduling surface.',
    shots: [{ src: '/vip/shots/social.png', altZh: '社交发帖工作台界面', altEn: 'Social posting workspace' }],
  },
  {
    id: 'creative',
    index: 5,
    tone: 'light',
    titleZh: '图片、视频与文案，一站专业产出',
    titleEn: 'Image, video, and copy in one studio',
    bodyZh: '图片制作、视频制作与文案生成，帮助大家快速专业地设计各种产品宣传图。也可一键反推热点视频和图片的制作提示词，让宣传风格始终站在世界一流水平。',
    bodyEn: 'Image, video, and copy generation help you ship campaign-ready assets fast, with reverse prompts from trending visuals to keep your brand at world-class level.',
    shots: [
      { src: '/vip/shots/image-composer.png', altZh: '图片设计工作台', altEn: 'Image design workspace' },
      { src: '/vip/shots/video.png', altZh: '视频制作工作台', altEn: 'Video production workspace' },
    ],
    samples: [
      { src: '/vip/samples/poster-1.png', altZh: '护肤品宣传样板图', altEn: 'Skincare product poster sample' },
      { src: '/vip/samples/poster-2.png', altZh: '运动鞋宣传样板图', altEn: 'Sneaker campaign sample' },
      { src: '/vip/samples/poster-3.png', altZh: '智能音箱宣传样板图', altEn: 'Smart speaker campaign sample' },
      { src: '/vip/samples/poster-4.png', altZh: '咖啡产品宣传样板图', altEn: 'Coffee product campaign sample' },
    ],
  },
  {
    id: 'hermes',
    index: 6,
    tone: 'dark',
    titleZh: 'Hermes：24 小时自动化办公',
    titleEn: 'Hermes: always-on automation',
    bodyZh: '我们提供高性能 Hermes 服务器，用户可以通过它以任意方式实现 24 小时自动化办公、分析竞品信息。我们也提供定制化顾问咨询，帮助用户建立 AI 时代的全自动工作流。',
    bodyEn: 'High-performance Hermes servers run your automations around the clock, from competitor analysis to custom consultant workflows in the AI era.',
    samples: [{ src: '/vip/samples/hermes-room.png', altZh: 'Hermes 自动化控制台插画', altEn: 'Hermes automation console illustration' }],
    shots: [{ src: '/vip/shots/hermes.png', altZh: 'Hermes 操作面板界面', altEn: 'Hermes control panel' }],
  },
  {
    id: 'dev',
    index: 7,
    tone: 'light',
    titleZh: '帮助中心、软件与 App',
    titleEn: 'Help centers, software, and apps',
    bodyZh: '我们向用户提供包括帮助中心等在内的网站、软件、App 开发功能。用户可以通过 Hermes 或我们专业团队辅助，开发任意产品。',
    bodyEn: 'Build help centers, software, and apps with Hermes or our professional team supporting any product you want to ship.',
    samples: [{ src: '/vip/samples/sites.png', altZh: '多端网站与帮助中心设备阵列', altEn: 'Multi-device sites and help center array' }],
    shots: [{ src: '/vip/shots/help-center.png', altZh: '帮助中心预览界面', altEn: 'Help center preview' }],
  },
  {
    id: 'listing',
    index: 8,
    tone: 'dark',
    titleZh: '备案与上架顾问服务',
    titleEn: 'Filing and store listing advisory',
    bodyZh: '我们提供包括网站、App、小程序等产品备案，以及苹果、谷歌、华为、小米等一系列上架顾问服务，让产品合法合规地走向市场。',
    bodyEn: 'Filing for websites, apps, and mini programs, plus listing advisory for Apple, Google, Huawei, Xiaomi, and more.',
    samples: [{ src: '/vip/samples/appstores.png', altZh: '应用商店上架顾问插画', altEn: 'App store listing advisory illustration' }],
  },
  {
    id: 'kefu',
    index: 9,
    tone: 'light',
    titleZh: 'AI 客服与翻译，畅通全球沟通',
    titleEn: 'AI support with translation',
    bodyZh: '我们的客服平台有 AI 自动化回复和翻译，让用户和全世界的客户可以畅通无阻地沟通。',
    bodyEn: 'AI auto-replies and translation on the support platform keep you connected with customers everywhere.',
    shots: [{ src: '/vip/shots/kefu.png', altZh: '客服接待台双栏界面', altEn: 'Support inbox dual-column UI' }],
  },
  {
    id: 'settlement',
    index: 10,
    tone: 'dark',
    titleZh: '全球收款与结汇',
    titleEn: 'Global collection and settlement',
    bodyZh: '我们接入了包括微信和支付宝在内的全球多家专业持牌结算公司，帮助用户全球收款、结汇畅通无阻。',
    bodyEn: 'Licensed settlement partners including WeChat Pay and Alipay help you collect and settle globally without friction.',
    samples: [{ src: '/vip/samples/settlement.png', altZh: '全球资金结算流光插画', altEn: 'Global settlement flow illustration' }],
  },
  {
    id: 'trade',
    index: 11,
    tone: 'light',
    titleZh: '关关易：外贸全链路服务',
    titleEn: 'GuanGuanyi: full trade chain',
    bodyZh: '我们的企业服务对接了全国顶尖的外贸服务商关关易，可以专业高效地处理物流、报关、退税的全链路服务。',
    bodyEn: 'Enterprise services connect to GuanGuanyi for logistics, customs clearance, and tax refund across the full trade chain.',
    samples: [{ src: '/vip/samples/trade-chain.png', altZh: '物流报关退税链路插画', altEn: 'Logistics, customs, and tax refund chain illustration' }],
  },
  {
    id: 'partner',
    index: 12,
    tone: 'dark',
    titleZh: '伙伴计划与超级伙伴计划',
    titleEn: 'Partner and super-partner programs',
    bodyZh: '普通用户可通过分享获取更多平台算力点奖励。超级伙伴是我们非常重视的合作对象：最低六折券可在其基础上加至任意折扣给伙伴使用，所有差价作为辛劳付出补回至指定收款账户。',
    bodyEn: 'Share to earn compute credits. Super partners receive floor discount coupons (e.g. 60% off) and can pass any markup to their network, with spreads paid to their designated account.',
    shots: [{ src: '/vip/shots/partner.png', altZh: '伙伴计划账户界面', altEn: 'Partner program account UI' }],
  },
  {
    id: 'closer',
    index: 13,
    tone: 'dark',
    titleZh: '顶尖服务，从起步到全球',
    titleEn: 'Top-tier services from day one',
    bodyZh: 'xiaoone 目前对接的 AI 服务、外贸服务、结汇服务，都是全国乃至世界的顶尖水准。让创业者起步也能享受大厂服务，也让全世界人民都享受到中国顶尖的产品、服务与 AI 带来的美好生活。',
    bodyEn: 'AI, trade, and settlement partners at world-class level: founders start with enterprise-grade capability, and global users benefit from China\'s best products, services, and AI.',
    bgImage: '/vip/bg/hero-globe.png',
  },
]
