import type { IconName } from '../components/Icon'
import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'
import type { ImageGenerationOptions, VideoGenerationOptions } from '../components/XiaooneComposer'
import { ARK_IMAGE_TEMPLATE_L10N, ARK_VIDEO_TEMPLATE_L10N } from './arkTemplateL10nData'

export { ARK_IMAGE_TEMPLATE_L10N, ARK_VIDEO_TEMPLATE_L10N }

export type LocalizedText = { zh: string; en: string }

export function resolveL10n(text: LocalizedText | string, locale: Locale): string {
  if (typeof text === 'string')
    return text
  return locale === 'en' ? text.en : text.zh
}

export type ArkTemplateL10nFields = {
  label: LocalizedText
  hint?: LocalizedText
  tag?: LocalizedText
  prompt: LocalizedText
}

export type ArkTemplateCover =
  | 'product' | 'product-set' | 'model' | 'fashion' | 'lifestyle' | 'poster' | 'brand-kv'
  | 'infographic' | 'brochure' | 'business-doc' | 'storybook' | 'comic' | 'composite'
  | 'portrait-video' | 'cinematic' | 'food' | 'product-spin' | 'city' | 'anime' | 'sci-fi'
  | 'pet' | 'morph' | 'spokesperson' | 'beauty' | 'tryon' | 'unboxing' | 'drama'
  | 'logo-opener' | 'app-demo' | 'before-after'

export interface ArkImageTemplate {
  id: string
  label: string
  hint?: string
  tag?: string
  category: ArkImageTemplateCategory
  prompt: string
  pluginKey?: string
  generationModel?: string
  imageOptions: Partial<Pick<ImageGenerationOptions, 'style_mode' | 'group_mode' | 'ratio' | 'resolution' | 'count'>>
  icon?: IconName
  color?: string
  cover: ArkTemplateCover
}

export interface ArkVideoTemplate {
  id: string
  label: string
  hint?: string
  category: ArkVideoTemplateCategory
  virtualPortraitPolicy: ArkVirtualPortraitPolicy
  prompt: string
  videoOptions: Partial<Pick<VideoGenerationOptions, 'style_mode' | 'frame_mode' | 'ratio' | 'resolution' | 'duration' | 'generate_audio'>>
  icon?: IconName
  color?: string
  cover: ArkTemplateCover
}

export type ArkImageTemplateCategory = 'clean' | 'commerce' | 'people' | 'social' | 'brand' | 'story'
export type ArkVideoTemplateCategory = 'clean' | 'commerce' | 'portrait' | 'brand' | 'social'
export type ArkVirtualPortraitPolicy = 'allowed' | 'blocked'

export interface ArkVideoTemplateSelection {
  id: string
  label: string
  category: ArkVideoTemplateCategory
  virtualPortraitPolicy: ArkVirtualPortraitPolicy
}

export const ARK_IMAGE_TEMPLATE_CATEGORY_LABELS: Record<ArkImageTemplateCategory, string> = {
  clean: '纯净',
  commerce: '电商商品',
  people: '人物服饰',
  social: '社媒活动',
  brand: '品牌物料',
  story: '故事分镜',
}

export const ARK_IMAGE_TEMPLATE_CATEGORY_ORDER: ArkImageTemplateCategory[] = ['clean', 'commerce', 'people', 'social', 'brand', 'story']

export const ARK_VIDEO_TEMPLATE_CATEGORY_LABELS: Record<ArkVideoTemplateCategory, string> = {
  clean: '纯净',
  commerce: '商品演示',
  portrait: '人物出镜',
  brand: '品牌特效',
  social: '社媒竖屏',
}

export const ARK_VIDEO_TEMPLATE_CATEGORY_ORDER: ArkVideoTemplateCategory[] = ['clean', 'commerce', 'portrait', 'brand', 'social']

export function arkVideoTemplateSelection(template: ArkVideoTemplate): ArkVideoTemplateSelection {
  return {
    id: template.id,
    label: template.label,
    category: template.category,
    virtualPortraitPolicy: template.virtualPortraitPolicy,
  }
}

export const ARK_IMAGE_TEMPLATES: ArkImageTemplate[] = [
  {
    id: 'clean-image-template',
    label: '纯净模板',
    tag: '纯净',
    category: 'clean',
    hint: '不写提示词，只使用你的输入和可见参数',
    icon: 'compress',
    color: 'oklch(66% 0.13 225)',
    cover: 'product',
    generationModel: 'seedream-5.0-lite',
    prompt: '',
    imageOptions: { style_mode: 'clean', group_mode: 'auto', ratio: '1:1', resolution: '2K', count: 1 },
  },
  {
    id: 'product-main-image',
    label: '商品主图',
    tag: '电商',
    category: 'commerce',
    hint: '白底或纯色背景，突出商品主体',
    icon: 'shop',
    color: 'oklch(66% 0.16 245)',
    cover: 'product',
    pluginKey: 'product-photo-set',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成一张电商商品主图。请以用户描述或上传参考图中的商品为唯一主体，居中完整展示，白底或浅色纯色背景，自然柔和光线，材质和边缘清晰，画面干净可信，不添加无关道具、虚假 Logo、价格或夸张促销文字。',
    imageOptions: { group_mode: 'auto', ratio: '1:1', resolution: '2K', count: 1 },
  },
  {
    id: 'product-photo-set',
    label: '商品套图',
    tag: '套图',
    category: 'commerce',
    hint: '主图、副图、尺寸、卖点、展示图',
    icon: 'grid',
    color: 'oklch(69% 0.17 160)',
    cover: 'product-set',
    pluginKey: 'product-photo-set',
    generationModel: 'seedream-5.0-lite',
    prompt: '为同一件商品生成一组电商素材：1 张主图、1 张细节副图、1 张尺寸/规格说明图、1 张卖点介绍图、1 张真实使用展示图。保持商品外观、材质、颜色和品牌调性一致，版式克制，文字少而清晰，不编造认证、奖项或价格。',
    imageOptions: { group_mode: 'auto', ratio: '1:1', resolution: '2K', count: 5 },
  },
  {
    id: 'marketplace-compliant-main-image',
    label: '商品主图合规版',
    tag: '合规',
    category: 'commerce',
    hint: '白底、主体完整、适合平台首图',
    icon: 'shop',
    color: 'oklch(62% 0.13 235)',
    cover: 'product',
    pluginKey: 'product-photo-set',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成一张电商平台合规商品主图。以用户描述或上传参考图中的商品为唯一主体，纯白背景 RGB(255,255,255)，商品居中完整展示并占画面约 85%，边缘清晰，光线均匀，保留真实颜色、材质、比例、包装和 Logo。不要添加文字、价格、促销角标、道具、水印、额外 Logo 或虚构配件。',
    imageOptions: { group_mode: 'auto', ratio: '1:1', resolution: '2K', count: 1 },
  },
  {
    id: 'product-feature-bento-infographic',
    label: '卖点 Bento 信息图',
    tag: 'Bento',
    category: 'commerce',
    hint: '主商品图 + 4-6 个卖点模块',
    icon: 'workflow',
    color: 'oklch(69% 0.14 205)',
    cover: 'infographic',
    pluginKey: 'ecommerce-product-infographic',
    generationModel: 'seedream-4.5',
    prompt: '生成一张电商卖点 Bento 信息图。画面以同一商品主视觉为核心，周围使用 4 到 6 个模块化卡片展示用户提供的核心卖点、使用价值、材质或细节。版式干净，细线图标、箭头标注和局部特写统一，文字短而可读；只使用用户提供或可从商品图明确看出的信息，不编造认证、功效、参数、销量或价格。',
    imageOptions: { group_mode: 'auto', ratio: '3:4', resolution: '2K', count: 1 },
  },
  {
    id: 'product-spec-sheet',
    label: '尺寸/规格图',
    tag: '规格',
    category: 'commerce',
    hint: '尺寸、容量、材质和参数标注',
    icon: 'file',
    color: 'oklch(66% 0.13 170)',
    cover: 'infographic',
    pluginKey: 'ecommerce-product-infographic',
    generationModel: 'seedream-4.5',
    prompt: '生成一张商品尺寸/规格图。保留商品真实外观，使用简洁标注线、比例尺感和参数表区域展示用户提供的长宽高、重量、容量、材质、型号或兼容信息。所有数字、单位和参数必须严格来自用户输入；缺失的数据用清晰占位区域呈现，不要自行编造。整体像电商详情页规格模块，移动端可读。',
    imageOptions: { group_mode: 'auto', ratio: '3:4', resolution: '2K', count: 1 },
  },
  {
    id: 'product-exploded-view',
    label: '爆炸拆解图',
    tag: '拆解',
    category: 'commerce',
    hint: '结构分层、组件关系和工艺细节',
    icon: 'cube',
    color: 'oklch(68% 0.16 300)',
    cover: 'product-set',
    pluginKey: 'ecommerce-product-infographic',
    generationModel: 'seedream-4.5',
    prompt: '生成一张商品爆炸拆解/结构分层信息图。以用户提供的商品为唯一参考，把外壳、可见组件、包装层、附件或材质层以有序分离的方式展示，使用细线、编号和短标签说明结构关系。只展示用户提供或外观可见的结构，不编造不可见内部零件、芯片、认证或技术参数；如果商品不适合拆解，改为外观结构分层示意。',
    imageOptions: { group_mode: 'auto', ratio: '3:4', resolution: '2K', count: 1 },
  },
  {
    id: 'product-comparison-matrix',
    label: '对比矩阵图',
    tag: '对比',
    category: 'commerce',
    hint: '本品 vs 普通方案，突出选择理由',
    icon: 'workflow',
    color: 'oklch(67% 0.14 145)',
    cover: 'before-after',
    pluginKey: 'ecommerce-product-infographic',
    generationModel: 'seedream-4.5',
    prompt: '生成一张电商对比矩阵图。左侧展示用户商品，右侧展示普通方案或使用前后状态，用 3 到 5 行对比维度说明选择理由。对比文字必须基于用户提供的卖点、材质、规格或可观察差异；证据不足时使用温和、品类级表达，不编造竞品名称、测试数据、认证、销量、评分或夸张功效。版式清楚、移动端可读。',
    imageOptions: { group_mode: 'auto', ratio: '3:4', resolution: '2K', count: 1 },
  },
  {
    id: 'product-whats-in-box',
    label: '包装清单图',
    tag: '清单',
    category: 'commerce',
    hint: '商品、包装、配件和数量说明',
    icon: 'package',
    color: 'oklch(70% 0.15 80)',
    cover: 'product-set',
    pluginKey: 'ecommerce-product-infographic',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成一张包装清单图。把商品本体、包装盒、说明书、配件、赠品或组合装以整齐平铺或轻微透视方式展示，使用短标签说明每个物件和数量。只展示用户提供或参考图中明确存在的物件；未知配件用留白占位，不要自行添加充电线、工具、赠品、Logo 或包装信息。画面适合电商副图和 A+ 模块。',
    imageOptions: { group_mode: 'auto', ratio: '1:1', resolution: '2K', count: 1 },
  },
  {
    id: 'model-lifestyle-product',
    label: '模特场景图',
    tag: '模特',
    category: 'people',
    hint: '产品上身、手持或生活方式展示',
    icon: 'users',
    color: 'oklch(70% 0.15 35)',
    cover: 'model',
    pluginKey: 'product-photo-set',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成模特生活方式商品展示图。以用户描述或上传参考图中的商品为核心，安排真实可信的模特上身、手持或使用场景，人物姿态自然，商品尺寸感明确，光线像真实商业摄影，背景干净有生活气息，避免夸张摆拍、脸部变形和无关品牌元素。',
    imageOptions: { group_mode: 'auto', ratio: '3:4', resolution: '2K', count: 3 },
  },
  {
    id: 'fashion-tryon-kv',
    label: '穿搭试穿',
    tag: '服饰',
    category: 'people',
    hint: '适合服饰、鞋包和配件',
    icon: 'image',
    color: 'oklch(67% 0.18 315)',
    cover: 'fashion',
    pluginKey: 'product-photo-set',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成服饰或配件试穿展示图。保持用户提供的服装、鞋包或配件款式、颜色、纹理和版型稳定，模特站姿自然，画面包含全身或半身展示、局部细节和生活场景氛围，像电商详情页与社媒投放共用素材，不出现错误文字和额外品牌。',
    imageOptions: { group_mode: 'auto', ratio: '3:4', resolution: '2K', count: 3 },
  },
  {
    id: 'lifestyle-daily-scene',
    label: '日常生活',
    tag: '生活',
    category: 'social',
    hint: '朋友圈、小红书、品牌日常配图',
    icon: 'sun',
    color: 'oklch(75% 0.15 95)',
    cover: 'lifestyle',
    pluginKey: 'daily-life',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成自然生活方式图片。画面像真实日常记录的一帧，人物或物品状态松弛可信，光线自然，构图有呼吸感；如果包含商品，让商品融入场景而不是硬广摆拍；整体适合朋友圈、小红书、品牌日常或轻量内容配图。',
    imageOptions: { group_mode: 'auto', ratio: '4:3', resolution: '2K', count: 3 },
  },
  {
    id: 'campaign-poster',
    label: '活动海报',
    tag: '竖版',
    category: 'social',
    hint: '社媒活动、优惠或上新预热',
    icon: 'sparkles',
    color: 'oklch(68% 0.20 25)',
    cover: 'poster',
    pluginKey: 'product-brochure',
    generationModel: 'seedream-4.5',
    prompt: '生成一张竖版营销活动海报。请围绕用户给出的产品、活动或主题建立清晰主视觉，保留标题区、卖点区和行动入口的版式空间，视觉有冲击力但不杂乱，适合移动端发布；不编造真实折扣、日期、联系方式或认证信息。',
    imageOptions: { group_mode: 'auto', ratio: '9:16', resolution: '4K', count: 1 },
  },
  {
    id: 'brand-kv-banner',
    label: '品牌 KV',
    tag: '横幅',
    category: 'brand',
    hint: '官网首屏、广告横幅、直播间背景',
    icon: 'marketing',
    color: 'oklch(61% 0.15 255)',
    cover: 'brand-kv',
    pluginKey: 'product-brochure',
    generationModel: 'seedream-4.5',
    prompt: '生成一张品牌 KV 横幅。根据用户提供的品牌、产品或服务定位，设计宽屏主视觉，主体明确，背景空间有层次，预留标题与副标题位置，整体可信、现代、适合官网首屏、广告横幅或直播间背景，不写不可验证的宣传语。',
    imageOptions: { group_mode: 'auto', ratio: '16:9', resolution: '4K', count: 1 },
  },
  {
    id: 'feature-infographic',
    label: '卖点信息图',
    tag: '卖点',
    category: 'brand',
    hint: '3-5 个核心价值，适合详情页',
    icon: 'workflow',
    color: 'oklch(69% 0.14 205)',
    cover: 'infographic',
    pluginKey: 'product-brochure',
    generationModel: 'seedream-4.5',
    prompt: '生成产品卖点信息图。把用户给出的 3 到 5 个核心卖点整理成清晰模块，使用图标、局部特写、流程或对比结构辅助理解，文字短且可读，视觉统一，适合电商详情页、招商介绍或社媒长图的一页。',
    imageOptions: { group_mode: 'auto', ratio: '4:3', resolution: '2K', count: 3 },
  },
  {
    id: 'product-brochure-pages',
    label: '产品宣传册',
    tag: '册页',
    category: 'brand',
    hint: '封面、卖点、功能、对比、行动页',
    icon: 'file',
    color: 'oklch(64% 0.14 280)',
    cover: 'brochure',
    pluginKey: 'product-brochure',
    generationModel: 'seedream-4.5',
    prompt: '生成一组产品宣传册页面图片：封面、核心卖点页、功能介绍页、对比说明页、行动页。每页像同一份 brochure 的连续页面，统一字体风格、色彩、栅格和图标语言，信息层级清楚，不编造客户案例、认证、价格或联系方式。',
    imageOptions: { group_mode: 'auto', ratio: '16:9', resolution: '2K', count: 5 },
  },
  {
    id: 'business-intro-pdf',
    label: '业务介绍 PDF',
    tag: '商务',
    category: 'brand',
    hint: '封面、概览、流程、封底草案',
    icon: 'briefcase',
    color: 'oklch(63% 0.12 230)',
    cover: 'business-doc',
    pluginKey: 'business-intro-pdf',
    generationModel: 'seedream-4.5',
    prompt: '生成业务介绍 PDF 的页面图片草案：封面、业务概览页、服务流程或方案路径页、封底页。版式正式可信，适合对外发送，使用中性商务视觉；缺少企业名称、联系方式、案例数据时用明确占位，不编造真实信息。',
    imageOptions: { group_mode: 'auto', ratio: '16:9', resolution: '2K', count: 4 },
  },
  {
    id: 'storybook-sequence',
    label: '绘本分镜',
    tag: '绘本',
    category: 'story',
    hint: '连续角色、画风和叙事',
    icon: 'grid',
    color: 'oklch(73% 0.16 75)',
    cover: 'storybook',
    pluginKey: 'daily-life',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成一组绘本式连续分镜。保持主角外观、服装、色彩和画风一致，每张图推进一个小情节，画面温暖、干净、叙事清楚，适合儿童绘本、品牌故事或轻量内容栏目；不要出现密集文字和不一致角色。',
    imageOptions: { group_mode: 'storybook', ratio: '1:1', resolution: '2K', count: 4 },
  },
  {
    id: 'comic-sequence',
    label: '连环画分镜',
    tag: '漫画',
    category: 'story',
    hint: '多场景连续动作和情节',
    icon: 'message-square',
    color: 'oklch(66% 0.17 20)',
    cover: 'comic',
    pluginKey: 'daily-life',
    generationModel: 'seedream-5.0-lite',
    prompt: '生成一组连环画分镜。按用户给出的主题拆成连续场景，保持角色、服装、道具和空间关系一致，动作清楚，镜头有近景、中景和远景变化，画面适合社媒连载或故事说明；文字气泡留白即可，不生成大段不可读文字。',
    imageOptions: { group_mode: 'comic', ratio: '16:9', resolution: '2K', count: 4 },
  },
  {
    id: 'multi-reference-composite',
    label: '多图融合',
    tag: '融合',
    category: 'commerce',
    hint: '商品、场景、风格参考合成',
    icon: 'wand',
    color: 'oklch(72% 0.16 185)',
    cover: 'composite',
    pluginKey: 'product-photo-set',
    generationModel: 'seedream-4.5',
    prompt: '基于用户上传的多张参考素材生成一张融合图。请分别保留商品主体、目标场景、色调风格和关键构图关系，让它们自然合成在同一画面中，光线方向和透视一致，主体边缘干净，不产生额外 Logo、错误文字或无关物体。',
    imageOptions: { group_mode: 'auto', ratio: 'auto', resolution: '4K', count: 1 },
  },
]

const ARK_VIDEO_TEMPLATE_ITEMS: ArkVideoTemplate[] = [
  {
    id: 'clean-video-template',
    label: '纯净模板',
    category: 'clean',
    virtualPortraitPolicy: 'blocked',
    hint: '不写提示词，只使用你的输入和可见参数',
    icon: 'compress',
    color: 'oklch(66% 0.13 225)',
    cover: 'product-spin',
    prompt: '',
    videoOptions: { style_mode: 'clean', frame_mode: 'first', ratio: 'auto', resolution: '720p', duration: 5, generate_audio: false },
  },
  {
    id: 'tiktok-shop-15s-ad',
    label: 'TikTok Shop 15s',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '竖屏带货，2 秒钩子 + 商品展示 + CTA',
    icon: 'brand-bytedance',
    color: 'oklch(64% 0.18 25)',
    cover: 'product-spin',
    prompt: '参考上传的商品图，生成一段 15 秒 TikTok Shop 竖屏带货短视频。0-2 秒用强视觉钩子让商品快速进入画面；2-7 秒展示商品全貌、核心卖点和材质细节；7-12 秒加入真实使用场景或手部演示；12-15 秒回到商品英雄镜头并预留简短 CTA 文字区。节奏快但清楚，商品外观、颜色、包装和比例保持一致，不编造价格、折扣、销量、认证或夸张功效。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 15, generate_audio: false },
  },
  {
    id: 'marketplace-product-page-video',
    label: 'Amazon/Shopify 产品页视频',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '横版产品页，多角度、细节和场景',
    icon: 'shop',
    color: 'oklch(62% 0.13 235)',
    cover: 'product-spin',
    prompt: '参考上传的商品图，生成一段 15 秒 Amazon 或 Shopify 产品页视频。0-3 秒展示干净背景中的商品英雄角度；3-8 秒用平滑镜头展示正面、侧面、背面或 45 度角；8-12 秒切到材质、接口、纹理、包装或关键结构特写；12-15 秒展示使用场景并回到清晰商品定格。画面专业、可信、适合商品页轮播，不出现水印、第三方 Logo、价格、促销角标或不可验证文字。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 15, generate_audio: false },
  },
  {
    id: 'commerce-product-360-showcase',
    label: '产品 360 旋转',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '平滑旋转，展示材质、边缘和结构',
    icon: 'cube',
    color: 'oklch(68% 0.16 300)',
    cover: 'product-spin',
    prompt: '参考上传的商品图，生成一段产品 360 旋转展示视频。商品位于干净浅色或中性渐变背景中央，镜头围绕商品缓慢旋转，先展示英雄角度，再展示侧面、背面、顶部或底部细节，材质高光、边缘、纹理和包装保持清晰。运动平滑无跳变，主体占画面 50%-80%，不添加多余文字、虚构部件、价格、促销信息或不相关道具。',
    videoOptions: { frame_mode: 'first', ratio: '1:1', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'commerce-unboxing-showcase',
    label: '开箱展示',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '包装、打开、配件、本体展示',
    icon: 'package',
    color: 'oklch(70% 0.15 80)',
    cover: 'unboxing',
    prompt: '参考上传的商品包装或商品图，生成一段 15 秒开箱展示视频。0-3 秒展示包装盒外观和开箱动作；3-7 秒打开包装并展示内部摆放；7-11 秒依次展示商品本体、说明书、配件或组合内容；11-15 秒把商品放到桌面形成完整英雄镜头。只展示参考图或用户明确提供的物件，不自行添加配件、赠品、品牌文字、价格或促销信息。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 15, generate_audio: false },
  },
  {
    id: 'commerce-ugc-demo',
    label: 'UGC 试用演示',
    category: 'commerce',
    virtualPortraitPolicy: 'allowed',
    hint: '人物或手部试用，适合种草和口播素材',
    icon: 'users',
    color: 'oklch(66% 0.16 345)',
    cover: 'spokesperson',
    prompt: '参考上传的商品图和可选人物形象，生成一段 15 秒 UGC 试用演示视频。0-2 秒人物或手部把商品带入镜头；2-7 秒自然展示商品外观、尺寸感和关键细节；7-12 秒模拟真实使用或试用动作；12-15 秒人物看向镜头或商品定格，预留短 CTA/推荐语位置。风格像真实创作者测评，语气可信克制，不夸张表演，不编造功效、价格、销量、认证或真实评价。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 15, generate_audio: false },
  },
  {
    id: 'portrait-camera-move',
    label: '写实人像运镜',
    category: 'portrait',
    virtualPortraitPolicy: 'allowed',
    hint: '参考生成，稳定主体与自然光影',
    icon: 'brand-bytedance',
    color: 'oklch(65% 0.18 20)', /* 温暖的肤色偏红 */
    cover: 'portrait-video',
    prompt: '参考上传的人物形象，生成一段写实人像短片。镜头从半身中景缓慢推进到近景，人物自然转头看向镜头，表情克制自信，背景为柔和城市天台或室内窗边，浅景深，真实皮肤质感，电影级自然光，画面稳定，无夸张变形。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 5, generate_audio: false },
  },
  {
    id: 'cinematic-long-take',
    label: '电影感长镜头',
    category: 'brand',
    virtualPortraitPolicy: 'blocked',
    hint: '宽画幅长镜头，适合场景叙事',
    icon: 'video',
    color: 'oklch(60% 0.15 250)', /* 电影感的冷蓝色 */
    cover: 'cinematic',
    prompt: '生成一段电影感长镜头：主体从画面远处缓慢走入前景，摄影机横向跟随，环境有层次丰富的前景遮挡和远处光源，黄昏逆光，空气中有轻微雾气，色调高级克制，镜头运动平滑，叙事感强，避免文字和水印。',
    videoOptions: { frame_mode: 'first', ratio: '21:9', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'food-commercial-closeup',
    label: '美食广告特写',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '首尾帧，突出质感与食欲',
    icon: 'sparkles',
    color: 'oklch(70% 0.22 45)', /* 充满食欲的橙黄色 */
    cover: 'food',
    prompt: '根据首帧和尾帧生成一段美食广告特写。镜头从食材细节滑动到成品特写，酱汁缓慢流动，热气自然升起，表面高光真实，背景干净，商业广告质感，色彩鲜明但不过曝，动作连贯，突出香气和新鲜感。',
    videoOptions: { frame_mode: 'first', ratio: '1:1', resolution: '720p', duration: 5, generate_audio: false },
  },
  {
    id: 'product-3d-spin',
    label: '产品 3D 旋转',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '参考生成，展示材质和卖点',
    icon: 'cube',
    color: 'oklch(68% 0.16 300)', /* 科技感的紫色 */
    cover: 'product-spin',
    prompt: '参考上传的产品图，生成一段产品 3D 旋转展示。产品位于干净浅色背景中央，镜头轻微环绕，主体缓慢旋转 180 度，材质高光和边缘细节清晰，加入柔和反射和阴影，整体像高端电商广告，不出现多余文字。',
    videoOptions: { frame_mode: 'first', ratio: '1:1', resolution: '1080p', duration: 5, generate_audio: false },
  },
  {
    id: 'city-vlog-travel',
    label: '城市旅拍 Vlog',
    category: 'social',
    virtualPortraitPolicy: 'blocked',
    hint: '移动镜头，适合短视频开场',
    icon: 'globe',
    color: 'oklch(72% 0.18 180)', /* 清新的青绿色 */
    cover: 'city',
    prompt: '生成一段城市旅拍 Vlog 画面：手持跟拍视角穿过有生活气息的街区，路边灯牌、行人、咖啡店橱窗自然掠过，镜头轻微晃动但稳定可看，阳光从建筑之间洒入，节奏轻快，真实旅行记录感，适合短视频开场。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'anime-character-action',
    label: '动漫风人物',
    category: 'portrait',
    virtualPortraitPolicy: 'allowed',
    hint: '参考生成，强化动作和光效',
    icon: 'image',
    color: 'oklch(75% 0.20 340)', /* 活泼的粉红色 */
    cover: 'anime',
    prompt: '参考上传的人物设定，生成一段动漫风格人物短片。角色站在风中转身，衣摆和发丝随风摆动，镜头从侧面缓慢绕到正面，背景有柔和粒子光效，线条干净，色彩通透，动作自然连贯，保持角色五官和服装一致。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '720p', duration: 5, generate_audio: false },
  },
  {
    id: 'sci-fi-vfx-scene',
    label: '科幻特效场景',
    category: 'brand',
    virtualPortraitPolicy: 'blocked',
    hint: '参考生成，含环境音输出',
    icon: 'bolt',
    color: 'oklch(70% 0.15 220)', /* 未来的亮蓝色 */
    cover: 'sci-fi',
    prompt: '生成一段科幻特效场景：未来城市夜景中能量装置逐步启动，蓝白色光束从地面向天空聚集，地面反射微微震动，镜头缓慢后退展示宏大空间，光效真实，金属和玻璃材质清晰，氛围紧张但不杂乱，输出环境音。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 5, generate_audio: true },
  },
  {
    id: 'cartoon-pet-daily',
    label: '卡通宠物日常',
    category: 'social',
    virtualPortraitPolicy: 'blocked',
    hint: '方图，适合社媒轻内容',
    icon: 'sparkles',
    color: 'oklch(80% 0.18 90)', /* 可爱的明黄色 */
    cover: 'pet',
    prompt: '生成一段卡通宠物日常短片：一只圆润可爱的宠物在明亮房间里追逐小玩具，动作轻快，表情有趣，镜头保持低机位跟随，色彩温暖，线条柔和，背景整洁，适合社交媒体轻松内容，避免写实恐怖或夸张变形。',
    videoOptions: { frame_mode: 'first', ratio: '1:1', resolution: '720p', duration: 5, generate_audio: false },
  },
  {
    id: 'first-last-object-morph',
    label: '首尾帧变形',
    category: 'brand',
    virtualPortraitPolicy: 'blocked',
    hint: '首尾帧，展示形态变化',
    icon: 'grid',
    color: 'oklch(65% 0.18 140)', /* 过渡的自然绿 */
    cover: 'morph',
    prompt: '根据首帧和尾帧生成一段物体变形示意。主体从首帧形态平滑过渡到尾帧形态，过程包含柔和粒子、液态或折纸式转场效果，镜头保持稳定，背景简洁，变化路径清楚，主体边缘不破碎，适合展示产品升级或概念转化。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 5, generate_audio: false },
  },
  {
    id: 'beauty-kol-demo',
    label: '美妆达人演示',
    category: 'portrait',
    virtualPortraitPolicy: 'allowed',
    hint: '手部动作和产品细节',
    icon: 'sparkles',
    color: 'oklch(72% 0.19 345)',
    cover: 'beauty',
    prompt: '参考上传的产品或人物，生成一段美妆达人演示短片。镜头从产品包装切到手部试用和面部近景，动作自然、皮肤质感真实、光线柔和干净，强调质地、涂抹动作和使用氛围，适合短视频带货素材，避免夸张功效和错误文字。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'fashion-tryon-transition',
    label: '换装转场',
    category: 'portrait',
    virtualPortraitPolicy: 'allowed',
    hint: '首尾帧，服饰试穿变化',
    icon: 'video',
    color: 'oklch(64% 0.18 305)',
    cover: 'tryon',
    prompt: '根据首帧和尾帧生成一段换装转场视频。人物姿态和身份保持一致，服装从首帧平滑切换到尾帧，转场可以使用转身、镜头遮挡或布料掠过效果，动作连贯，面部和手部稳定，背景不突变，适合服饰试穿展示。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 5, generate_audio: false },
  },
  {
    id: 'unboxing-handheld',
    label: '开箱手持',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '真实开箱和细节扫拍',
    icon: 'package',
    color: 'oklch(70% 0.15 80)',
    cover: 'unboxing',
    prompt: '参考上传的产品包装或商品图，生成一段开箱手持短片。镜头从包装外观开始，手部打开盒子，展示产品本体和关键配件，镜头有轻微手持感但稳定，真实桌面光线，材质细节清晰，适合电商开箱或短视频种草，不出现多余品牌文字。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'short-drama-scene',
    label: '短剧剧情片段',
    category: 'portrait',
    virtualPortraitPolicy: 'allowed',
    hint: '人物互动，强叙事开头',
    icon: 'message',
    color: 'oklch(62% 0.14 260)',
    cover: 'drama',
    prompt: '生成一段短剧开头片段。两名人物在真实室内或街景中发生简短互动，镜头先给环境再切到人物反应，动作和表情推动冲突，画面有电视剧质感，节奏紧凑但不夸张，避免字幕、水印和不自然肢体变形。',
    videoOptions: { frame_mode: 'first', ratio: '9:16', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'brand-logo-opener',
    label: '品牌开场',
    category: 'brand',
    virtualPortraitPolicy: 'blocked',
    hint: '产品/Logo 氛围开场',
    icon: 'bolt',
    color: 'oklch(68% 0.17 210)',
    cover: 'logo-opener',
    prompt: '生成一段品牌或产品开场短片。主体从暗到亮逐渐出现，背景有简洁的光线扫过、粒子或反射效果，镜头轻微推进，整体高级、克制、干净，适合广告片头或直播间开场；如果有上传 Logo 或产品参考，保持形状和配色稳定。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 5, generate_audio: true },
  },
  {
    id: 'app-ui-walkthrough',
    label: 'App 界面演示',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '界面流程、指针和镜头推进',
    icon: 'dashboard',
    color: 'oklch(65% 0.14 235)',
    cover: 'app-demo',
    prompt: '参考上传的 App、网页或软件界面截图，生成一段产品界面演示视频。镜头从整体界面缓慢推进到关键功能区，加入自然的指针移动、点击反馈和页面切换感，界面文字尽量保持原截图结构，不新增错误文案，适合功能介绍或演示开场。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 10, generate_audio: false },
  },
  {
    id: 'before-after-service',
    label: '前后对比',
    category: 'commerce',
    virtualPortraitPolicy: 'blocked',
    hint: '首尾帧，展示改善效果',
    icon: 'workflow',
    color: 'oklch(68% 0.15 145)',
    cover: 'before-after',
    prompt: '根据首帧和尾帧生成一段前后对比视频。画面从改善前状态平滑过渡到改善后状态，中间用擦除、推拉、光线变化或空间移动完成转场，主体位置清楚，变化路径直观，适合服务效果、空间改造、产品升级或清洁修复展示。',
    videoOptions: { frame_mode: 'first', ratio: '16:9', resolution: '1080p', duration: 5, generate_audio: false },
  },
]

const ARK_VIDEO_TEMPLATE_INDEX = new Map(ARK_VIDEO_TEMPLATE_ITEMS.map((template, index) => [template.id, index]))

function resolveArkImageTemplate(template: ArkImageTemplate, locale: Locale): ArkImageTemplate {
  const l10n = ARK_IMAGE_TEMPLATE_L10N[template.id]
  if (!l10n)
    return template
  return {
    ...template,
    label: resolveL10n(l10n.label, locale),
    hint: l10n.hint ? resolveL10n(l10n.hint, locale) : template.hint,
    tag: l10n.tag ? resolveL10n(l10n.tag, locale) : template.tag,
    prompt: resolveL10n(l10n.prompt, locale),
  }
}

function resolveArkVideoTemplate(template: ArkVideoTemplate, locale: Locale): ArkVideoTemplate {
  const l10n = ARK_VIDEO_TEMPLATE_L10N[template.id]
  if (!l10n)
    return template
  return {
    ...template,
    label: resolveL10n(l10n.label, locale),
    hint: l10n.hint ? resolveL10n(l10n.hint, locale) : template.hint,
    prompt: resolveL10n(l10n.prompt, locale),
  }
}

export function getArkImageTemplates(locale: Locale): ArkImageTemplate[] {
  return ARK_IMAGE_TEMPLATES.map(template => resolveArkImageTemplate(template, locale))
}

export function getArkVideoTemplates(locale: Locale): ArkVideoTemplate[] {
  return [...ARK_VIDEO_TEMPLATE_ITEMS]
    .map(template => resolveArkVideoTemplate(template, locale))
    .sort((left, right) => {
      const byCategory = ARK_VIDEO_TEMPLATE_CATEGORY_ORDER.indexOf(left.category) - ARK_VIDEO_TEMPLATE_CATEGORY_ORDER.indexOf(right.category)
      if (byCategory !== 0)
        return byCategory
      return (ARK_VIDEO_TEMPLATE_INDEX.get(left.id) ?? 0) - (ARK_VIDEO_TEMPLATE_INDEX.get(right.id) ?? 0)
    })
}

export function findArkImageTemplate(id: string | null | undefined, locale: Locale): ArkImageTemplate | null {
  const normalized = String(id || '').trim()
  if (!normalized)
    return null
  return getArkImageTemplates(locale).find(template => template.id === normalized) || null
}

export function findArkVideoTemplate(id: string | null | undefined, locale: Locale): ArkVideoTemplate | null {
  const normalized = String(id || '').trim()
  if (!normalized)
    return null
  return getArkVideoTemplates(locale).find(template => template.id === normalized) || null
}

export const ARK_VIDEO_TEMPLATES: ArkVideoTemplate[] = getArkVideoTemplates('zh')

export const ARK_PUBLIC_VIDEO_TEMPLATES = ARK_VIDEO_TEMPLATES

const ARK_IMAGE_CATEGORY_I18N: Record<ArkImageTemplateCategory, string> = {
  clean: 'common.ark.image.clean',
  commerce: 'common.ark.image.commerce',
  people: 'common.ark.image.people',
  social: 'common.ark.image.social',
  brand: 'common.ark.image.brand',
  story: 'common.ark.image.story',
}

const ARK_VIDEO_CATEGORY_I18N: Record<ArkVideoTemplateCategory, string> = {
  clean: 'common.ark.video.clean',
  commerce: 'common.ark.video.commerce',
  portrait: 'common.ark.video.portrait',
  brand: 'common.ark.video.brand',
  social: 'common.ark.video.social',
}

export function getArkImageTemplateCategoryLabels(locale: Locale): Record<ArkImageTemplateCategory, string> {
  const result = {} as Record<ArkImageTemplateCategory, string>
  for (const cat of ARK_IMAGE_TEMPLATE_CATEGORY_ORDER) {
    result[cat] = uiT(locale, ARK_IMAGE_CATEGORY_I18N[cat], ARK_IMAGE_TEMPLATE_CATEGORY_LABELS[cat])
  }
  return result
}

export function getArkVideoTemplateCategoryLabels(locale: Locale): Record<ArkVideoTemplateCategory, string> {
  const result = {} as Record<ArkVideoTemplateCategory, string>
  for (const cat of ARK_VIDEO_TEMPLATE_CATEGORY_ORDER) {
    result[cat] = uiT(locale, ARK_VIDEO_CATEGORY_I18N[cat], ARK_VIDEO_TEMPLATE_CATEGORY_LABELS[cat])
  }
  return result
}

export function getArkTemplateCategoryLabels(locale: Locale) {
  return {
    image: getArkImageTemplateCategoryLabels(locale),
    video: getArkVideoTemplateCategoryLabels(locale),
  }
}
