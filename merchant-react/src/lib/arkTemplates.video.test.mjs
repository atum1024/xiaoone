import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const templates = readFileSync(join(dir, 'arkTemplates.ts'), 'utf8')
const composer = readFileSync(join(dir, '../components/XiaooneComposer.tsx'), 'utf8')
const agentConversation = [
  readFileSync(join(dir, '../pages/agentConversationShared.ts'), 'utf8'),
  readFileSync(join(dir, '../pages/agentConversationSend.ts'), 'utf8'),
  readFileSync(join(dir, '../pages/useAgentConversation.tsx'), 'utf8'),
  readFileSync(join(dir, '../pages/AgentConversationPage.tsx'), 'utf8'),
  readFileSync(join(dir, '../pages/AgentNewConversationPage.tsx'), 'utf8'),
  readFileSync(join(dir, '../pages/AgentConversationDetailPage.tsx'), 'utf8'),
].join('\n')
const composerCatalog = readFileSync(join(dir, '../i18n/catalog/composer.ts'), 'utf8')

const requiredTemplateSnippets = [
  "export const ARK_IMAGE_TEMPLATE_CATEGORY_ORDER: ArkImageTemplateCategory[] = ['clean', 'commerce', 'people', 'social', 'brand', 'story']",
  "export const ARK_VIDEO_TEMPLATE_CATEGORY_ORDER: ArkVideoTemplateCategory[] = ['clean', 'commerce', 'portrait', 'brand', 'social']",
  "id: 'clean-image-template'",
  "id: 'clean-video-template'",
  "style_mode: 'clean'",
  "category: 'clean'",
  "virtualPortraitPolicy: 'blocked'",
  "virtualPortraitPolicy: 'allowed'",
  'export function getArkImageTemplates(locale: Locale): ArkImageTemplate[]',
  'export function findArkImageTemplate(id: string | null | undefined, locale: Locale): ArkImageTemplate | null',
  'export function findArkVideoTemplate(id: string | null | undefined, locale: Locale): ArkVideoTemplate | null',
  'export function getArkVideoTemplates(locale: Locale): ArkVideoTemplate[]',
  'export { ARK_IMAGE_TEMPLATE_L10N, ARK_VIDEO_TEMPLATE_L10N }',
]

for (const snippet of requiredTemplateSnippets) {
  if (!templates.includes(snippet)) {
    throw new Error(`arkTemplates.ts is missing video template requirement: ${snippet}`)
  }
}

const requiredCommerceImageTemplates = [
  "pluginKey: 'ecommerce-product-infographic'",
  "id: 'marketplace-compliant-main-image'",
  "label: '商品主图合规版'",
  "id: 'product-feature-bento-infographic'",
  "label: '卖点 Bento 信息图'",
  "id: 'product-spec-sheet'",
  "label: '尺寸/规格图'",
  "id: 'product-exploded-view'",
  "label: '爆炸拆解图'",
  "id: 'product-comparison-matrix'",
  "label: '对比矩阵图'",
  "id: 'product-whats-in-box'",
  "label: '包装清单图'",
]

for (const snippet of requiredCommerceImageTemplates) {
  if (!templates.includes(snippet)) {
    throw new Error(`arkTemplates.ts is missing commerce image template requirement: ${snippet}`)
  }
}

const requiredCommerceVideoTemplates = [
  "id: 'tiktok-shop-15s-ad'",
  "label: 'TikTok Shop 15s'",
  "id: 'marketplace-product-page-video'",
  "label: 'Amazon/Shopify 产品页视频'",
  "id: 'commerce-product-360-showcase'",
  "label: '产品 360 旋转'",
  "id: 'commerce-unboxing-showcase'",
  "label: '开箱展示'",
  "id: 'commerce-ugc-demo'",
  "label: 'UGC 试用演示'",
  "virtualPortraitPolicy: 'allowed'",
]

for (const snippet of requiredCommerceVideoTemplates) {
  if (!templates.includes(snippet)) {
    throw new Error(`arkTemplates.ts is missing commerce video template requirement: ${snippet}`)
  }
}

const categoryBlock = composer.match(/const arkVideoTemplateCategories[\s\S]+?\}\)\)/)?.[0] || ''
if (categoryBlock.includes("'all'") || categoryBlock.includes('"all"')) {
  throw new Error('Video template category tabs must not include 全部/all')
}

const videoBlock = composer.split('aria-label="Ark 视频模板列表"')[1]?.split('aria-label="Ark 虚拟人物"')[0] || ''
if (videoBlock.includes('template.tag')) {
  throw new Error('Video template cards must not render template.tag badges')
}

if (composer.includes('cx-clean-toggle')) {
  throw new Error('Pure mode must be selected from templates, not a separate composer toggle')
}

if (!composer.includes("const DEFAULT_ARK_IMAGE_TEMPLATE_CATEGORY: ArkImageTemplateCategory = 'clean'")) {
  throw new Error('Image template popover must default to 纯净/clean')
}

if (!composer.includes("const DEFAULT_ARK_VIDEO_TEMPLATE_CATEGORY: ArkVideoTemplateCategory = 'commerce'")) {
  throw new Error('Video template popover must default to commerce templates')
}

if (!composer.includes('arkImageTemplateCategories') || !composer.includes('filteredArkImageTemplates')) {
  throw new Error('Image templates must be grouped by category tabs')
}

if (!composer.includes('if ((template.prompt || usesCommerceBriefMerge) && nextPrompt)')) {
  throw new Error('Pure templates must not overwrite user input with an empty prompt')
}

const requiredCommerceBriefFlowSnippets = [
  "const COMMERCE_BRIEF_STORAGE_KEY = 'xiaoone:marketing:commerce-brief:last'",
  "const COMMERCE_BRIEF_PROFILE_STORAGE_KEY = 'xiaoone:marketing:commerce-brief:profiles:v1'",
  'writeStoredCommerceBrief(brief)',
  'readStoredCommerceBrief()',
  'readStoredCommerceBriefProfiles()',
  'writeStoredCommerceBriefProfiles(nextProfiles)',
  'function upsertCommerceBriefProfile(profiles: CommerceBriefProfile[], brief: Partial<CommerceBrief>)',
  'stripGeneratedCommerceTemplateBrief(params.currentValue)',
  'function generatedCommerceTemplateBrief(text: string)',
  'function commerceTemplateBriefPreview(text: string)',
  'function extractCommerceBriefDraft(source: string)',
  'function mergeCommerceBriefDraft(current: Partial<CommerceBrief>, draft: Partial<CommerceBrief>)',
  'function commerceBriefDraftMissingHints(brief?: Partial<CommerceBrief> | null)',
  'function commerceReadableCurrentInputSource(text: string)',
  'function normalizeCommerceAttachmentNames(names?: string[] | null)',
  '生成前 Brief 预览',
  '导入资料',
  '从粘贴资料生成草稿',
  '从当前输入生成草稿',
  '从上传素材生成草稿',
  '当前素材未包含可读文字，请粘贴商品说明或参数表',
  'attachmentNames?: string[]',
  '应用到商品资料',
  '使用最近资料',
  '选择商品档案',
  '保存为商品档案',
  '保存当前',
  '清空当前',
  'function commerceTemplateBriefMarkerCount(text: string)',
  'function commerceBriefRiskHints(brief?: Partial<CommerceBrief> | null)',
  'const [commerceSendConfirmEnabled, setCommerceSendConfirmEnabled] = useState(true)',
  'const [commerceSendConfirmOpen, setCommerceSendConfirmOpen] = useState(false)',
  '发送前确认',
  '本次编辑只影响当前发送，不写回商品档案',
  'composer.commerce.confirm.briefMarkerCount',
  'onSubmit?.(contentOverride)',
  'showCommerceBriefControl && SHOW_COMMERCE_BRIEF_TRIGGER',
]

for (const snippet of requiredCommerceBriefFlowSnippets) {
  if (!`${composer}\n${composerCatalog}`.includes(snippet)) {
    throw new Error(`Commerce brief reuse/preview flow is missing: ${snippet}`)
  }
}

const requiredVirtualPortraitFlowSnippets = [
  "const VIRTUAL_PORTRAIT_MARKER = '【虚拟人物】'",
  "const VIRTUAL_PORTRAIT_MARKERS = [VIRTUAL_PORTRAIT_MARKER, '[Virtual character]']",
  'const SHOW_COMMERCE_BRIEF_TRIGGER = false',
  'const [arkPortraitFiltersOpen, setArkPortraitFiltersOpen] = useState(false)',
  'cx-ark-portrait-filter-toggle',
  'arkPortraitFiltersOpen &&',
  'function stripPortraitBlock(text: string)',
  'function generationOptionsHaveArkAssetReference(',
  'const selectedVirtualPortraitAssetIds = useMemo',
  'const selectedVirtualPortraitLabel = useMemo',
  'formatPortraitLabel(portrait, locale)',
  'localizePortraitField(country, locale, \'country\')',
  'const showArkVirtualPortraits =',
  'virtual_portrait?: {',
  'hasSelectedVirtualPortrait',
  'selectedVirtualPortraitAssetId',
]

for (const snippet of requiredVirtualPortraitFlowSnippets) {
  if (!composer.includes(snippet)) {
    throw new Error(`Virtual portrait flow is missing: ${snippet}`)
  }
}

if (composer.includes('arkVirtualPortraitBlockedReason')) {
  throw new Error('Virtual portrait must not be blocked by video template policy')
}

const portraitPanelBlock = composer.split('const renderArkPortraitPanelContent = (layout')[1]?.split('const renderArkVirtualPortraitControl')[0] || ''
const portraitSearchIndex = portraitPanelBlock.indexOf('<label className="cx-ark-portrait-search">')
const portraitListIndex = portraitPanelBlock.indexOf('className="cx-ark-portrait-list"')
if (portraitSearchIndex >= 0 && portraitListIndex >= 0 && portraitSearchIndex < portraitListIndex) {
  const precedingSearchContext = portraitPanelBlock.slice(Math.max(0, portraitSearchIndex - 240), portraitSearchIndex)
  if (!precedingSearchContext.includes('arkPortraitFiltersOpen')) {
    throw new Error('Virtual portrait picker should show the portrait list first; search/filter controls must be behind the filter toggle')
  }
}

if (composer.includes('onChange(commerceSendConfirmText)')) {
  throw new Error('Send confirmation edits must not write back to the composer input')
}

if (!composer.includes('getArkImageTemplates(locale)') || !composer.includes('getArkVideoTemplates(locale)')) {
  throw new Error('Composer must resolve Ark templates by locale')
}

if (!composer.includes('selectedImageTemplateById?.label') || !composer.includes('imageOptions?.template_id === template.id')) {
  throw new Error('Image template trigger must resolve labels from template_id for locale switching')
}

if (!agentConversation.includes('getArkVideoTemplates(locale)')) {
  throw new Error('Agent conversation must resolve video templates by locale')
}

if (!agentConversation.includes('function isMarketingMediaSubmitCommand(content: string)') || !agentConversation.includes('!isMarketingMediaSubmitCommand(resolvedContent)')) {
  throw new Error('Marketing video confirmation commands must be sent as user-visible text, not wrapped into template prompts')
}

if (!agentConversation.includes('function stripTransientVideoReferenceOptions(options: VideoGenerationOptions): VideoGenerationOptions')) {
  throw new Error('Marketing video preferences must strip transient reference media before persistence')
}

if (!agentConversation.includes('return stripTransientVideoReferenceOptions(normalizeVideoOptions(saved))')) {
  throw new Error('Legacy marketing video preferences must ignore stale reference media when restored')
}

if (!agentConversation.includes('writeMarketingComposerPrefs({ videoOptions: stripTransientVideoReferenceOptions(videoOptions) })')) {
  throw new Error('Marketing video preferences must not persist current reference_images/reference_assets')
}

if (!agentConversation.includes('attachmentNames: attachablePendingFiles.map(file => file.name)')) {
  throw new Error('Marketing composer must receive attachment names for commerce brief material draft sources')
}

console.log('Ark video template flow check passed')
