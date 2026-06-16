import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const composer = readFileSync(join(dir, 'XiaooneComposer.tsx'), 'utf8')
const composerCss = readFileSync(join(dir, 'XiaooneComposer.css'), 'utf8')
const useAgentConversation = readFileSync(join(dir, '../pages/useAgentConversation.tsx'), 'utf8')
const agentConversation = [
  readFileSync(join(dir, '../pages/agentConversationShared.ts'), 'utf8'),
  readFileSync(join(dir, '../pages/agentConversationSend.ts'), 'utf8'),
  readFileSync(join(dir, '../pages/AgentConversationPage.tsx'), 'utf8'),
  readFileSync(join(dir, '../pages/AgentNewConversationPage.tsx'), 'utf8'),
  readFileSync(join(dir, '../pages/AgentConversationDetailPage.tsx'), 'utf8'),
  useAgentConversation,
].join('\n')
const composerPackage = readFileSync(join(dir, '../../package.json'), 'utf8')

const inlinePortraitListRule = composerCss.match(/\.cx-ark-portrait-list\.cx-ark-portrait-list--inline\s*\{[^}]*\}/)?.[0] || ''
if (!/overflow-y:\s*auto/.test(inlinePortraitListRule))
  throw new Error('Inline Ark portrait list must keep vertical scrolling enabled')

const inlinePortraitGalleryRule = composerCss.match(/\.cx-ark-portrait-gallery-shell\.cx-ark-portrait-list--inline\s*\{[^}]*\}/)?.[0] || ''
if (/overflow:\s*hidden/.test(inlinePortraitGalleryRule))
  throw new Error('Inline Ark portrait gallery shell must not hide list scrolling')
if (!/overflow-x:\s*hidden/.test(inlinePortraitGalleryRule) || !/overflow-y:\s*auto/.test(inlinePortraitGalleryRule))
  throw new Error('Inline Ark portrait gallery shell must preserve vertical scrolling while clipping horizontal overflow')

const inlineFilterBarStart = composer.indexOf('const renderArkPortraitInlineFilterBar = () => {')
const inlineFilterBarEnd = composer.indexOf('const renderMaterialPreview =', inlineFilterBarStart)
const inlineFilterBarSource = inlineFilterBarStart >= 0 && inlineFilterBarEnd > inlineFilterBarStart
  ? composer.slice(inlineFilterBarStart, inlineFilterBarEnd)
  : ''
if (!inlineFilterBarSource)
  throw new Error('Inline Ark portrait filter bar source is missing')
if (inlineFilterBarSource.includes('<Popover') || inlineFilterBarSource.includes('<PopoverContent'))
  throw new Error('Inline Ark portrait filters must use an in-stage menu instead of portal popovers')
if (!inlineFilterBarSource.includes('cx-ark-portrait-filter-stack'))
  throw new Error('Inline Ark portrait filters must render a local filter stack')
if (!inlineFilterBarSource.includes('setArkPortraitFilterMenu(arkPortraitFilterMenu === menu ? null : menu)'))
  throw new Error('Inline Ark portrait filter buttons must explicitly toggle the active menu')
if (!composerCss.includes('.cx-ark-portrait-filter-menu--inline'))
  throw new Error('Inline Ark portrait filter menu CSS is missing')

const requiredComposerSnippets = [
  'const mediaSendBlockReason = (() => {',
  "return t('composer.send.templateInvalid')",
  "return t('composer.send.templateUnavailable')",
  "return t('composer.send.assetReferenceUnsupported')",
  "return t('composer.send.invalidImageCount')",
  'if (mediaSendBlockReason) {',
  'if (mediaSendBlockReason) return false',
  'if (mediaSendBlockReason) return mediaSendBlockReason',
  'function imageModelSupportsArkAssetReference(modelKey?: string | null)',
  'function videoModelSupportsArkAssetReference(modelKey?: string | null)',
  'const COPY_REFERENCE_ACCEPT =',
  'isSupportedCopyReferenceFile(file)',
  'const showImageMediaStage = isImageGenerationMode && Boolean(imageOptions) && (showArkImageTemplates || showArkVirtualPortraits)',
  'const showUnifiedMediaStage = showImageMediaStage || showVideoMediaStage',
  'const imagePortraitReferenceUrl = coverUrl || url',
  'if (isImageGenerationMode && !coverUrl)',
  "return t('composer.send.portraitCoverMissing')",
  'imageModelSupportsArkAssetReference(generationModel)',
  'videoModelSupportsArkAssetReference(generationModel)',
  "accept={isImageGenerationMode ? SUPPORTED_REFERENCE_IMAGE_ACCEPT : isVideoGenerationMode ? VIDEO_REFERENCE_ACCEPT : isMarketingTextMode ? COPY_REFERENCE_ACCEPT : undefined}",
  'const imageTemplateRecommendedCount =',
  "t('composer.image.templateRecommendedCount')",
  "t('composer.image.userSelectedCount')",
  'patchImageOptions({ count: imageTemplateRecommendedCount, role_counts: undefined })',
  'formatEstimatedPlatformPoints(',
  "tpl('composer.points.estimateTitle'",
  'const hasRemotePluginResult = Object.prototype.hasOwnProperty.call(remotePluginsByMode, remotePluginKey)',
  'if (hasRemotePluginResult)',
  'const remotePluginItemsForMode = remotePluginsByMode[remotePluginKey]',
]

for (const snippet of requiredComposerSnippets) {
  if (!composer.includes(snippet))
    throw new Error('XiaooneComposer generation state contract is missing: ' + snippet)
}

const requiredSmartAssistantSnippets = [
  'const initialMode = isAssistantEntry || supportsXiaooneConversationClassify\n    ? XIAOWAN_WORKSPACE_MODE_KEY',
  'const heroTitle = isAssistantEntry\n    ? label\n    : copy.title',
  "if (isAssistantEntry || supportsXiaooneConversationClassify)\n      return ''",
  'const hideConversationModelPicker = isAssistantEntry || isPlatformDefaultAgentEntry || isConsultantTheme',
  'const xiaooneConversationClassSlot = null',
  'const xiaooneWorkspaceRuntimeSlot = null',
  "const xiaooneAttachButtonPlacement = supportsXiaooneConversationClassify\n    ? 'left'\n    : 'right'",
  'leftExtraSlot: null',
  'rightExtraSlot: null',
]

for (const snippet of requiredSmartAssistantSnippets) {
  if (!useAgentConversation.includes(snippet))
    throw new Error('Smart assistant composer contract is missing: ' + snippet)
}

const forbiddenSmartAssistantSnippets = [
  "handleXiaooneConversationClassChange('ark')",
  "t('common.agent.modelChat')",
  '<span>xiaoone</span>',
  'leftExtraSlot: xiaooneConversationClassSlot',
  'rightExtraSlot: xiaooneWorkspaceRuntimeSlot',
  "requestedXiaooneConversationClass === 'workspace' ? XIAOWAN_WORKSPACE_MODE_KEY : XIAOWAN_ARK_MODE_KEY",
]

for (const snippet of forbiddenSmartAssistantSnippets) {
  if (useAgentConversation.includes(snippet))
    throw new Error('Smart assistant composer must not expose legacy selection UI: ' + snippet)
}

const forbiddenMerchantCostSnippets = [
  '¥{videoCost.cost.toFixed(2)}',
  'formatImageModelPriceLocalized(selectedImagePrice.unitPriceCny)',
  'seedancePricingLineLocalized(m.key)',
  'composer.seedance.pricingLine',
  'composer.image.refPriceTitle',
]
for (const snippet of forbiddenMerchantCostSnippets) {
  if (composer.includes(snippet))
    throw new Error('Merchant composer must hide internal RMB cost detail: ' + snippet)
}

const forbiddenImageCountSnippets = [
  'patchImageOptions({ role_counts: normalizedImageRoleState.counts, count: normalizedImageRoleState.count })',
  'sameImageRoleCounts(',
  'className="cx-role-steppers"',
  "t('composer.image.quota.referenceLabel')",
  "t('composer.image.quota.outputLabel')",
  "tpl('composer.image.quota.outputCap'",
]
for (const snippet of forbiddenImageCountSnippets) {
  if (composer.includes(snippet))
    throw new Error('Image count panel must stay in simple template/user-count mode: ' + snippet)
}

const requiredMediaFreedomSnippets = [
  ['image template picker remains available when detail route locks the plugin', composer, 'const showArkImageTemplates = isImageGenerationMode && Boolean(imageOptions) && Boolean(onImageOptionsChange)'],
  ['video template lock only follows active generation busy state', useAgentConversation, "const videoTemplateLocked = entry === 'marketing' && activeMarketingMode === 'video' && currentConversationBusy"],
  ['template recommendation comes only from an explicitly selected image template', composer, 'const rawImageTemplateRecommendedCount = selectedImageTemplateById?.imageOptions.count'],
]

for (const [label, source, snippet] of requiredMediaFreedomSnippets) {
  if (!source.includes(snippet))
    throw new Error('Marketing media freedom contract is missing: ' + label)
}

const forbiddenMediaFreedomSnippets = [
  ['image template picker must not be hidden by compact plugin lock', composer, '&& (!compact || !pluginLocked)'],
  ['video template picker must not lock existing conversation details', useAgentConversation, '|| Boolean(selectedId && effectiveThreadMessageCount(detail || selected) > 0)'],
  ['template recommendation must not come from inferred matching templates', composer, '?? selectedArkImageTemplate?.imageOptions.count'],
  ['template recommendation must not come from image skill defaults', composer, '?? selectedImageSkill?.recommendedCount'],
]

for (const [label, source, snippet] of forbiddenMediaFreedomSnippets) {
  if (source.includes(snippet))
    throw new Error('Marketing media freedom contract was violated: ' + label)
}

const forbiddenRemotePluginSnippets = [
  'remotePluginsByMode[remotePluginKey]?.length',
  '}, [cfg.key, locale, mode, remotePluginKey, remotePluginsByMode, usesRemotePlugins])',
]
for (const snippet of forbiddenRemotePluginSnippets) {
  if (composer.includes(snippet))
    throw new Error('Remote plugin loading must not retry forever after an empty or failed result: ' + snippet)
}

const requiredConversationSnippets = [
  'type MarketingComposerSessionState = {',
  'function composerSessionKeyForThread(',
  'function marketingComposerStateForThreadCreate(',
  'function imageOptionsFromComposerState(',
  'function videoOptionsFromComposerState(',
  'function targetLanguageFromComposerState(',
  'setImageOptions(imageOptionsFromComposerState(payload.composer_state))',
  'setVideoOptions(videoOptionsFromComposerState(payload.composer_state))',
  'setCopyTargetLanguage(targetLanguageFromComposerState(payload.composer_state))',
  "composer_state: ctx.entry === 'marketing' ? marketingComposerStateForThreadCreate({",
  'sessionComposerStateRef.current[composerSessionKeyForThread(currentConversationKey, location.pathname)]',
  'writeMarketingComposerPrefs({ imageOptions: stripTransientImageSessionOptions(imageOptions) })',
]


const requiredMediaPageSnippets = [
  'mediaDockPlacement="inline"',
  'mediaDockPlacement="drawer"',
  "conversation.isMarketingMediaEntry ? ' mr-agent-thread-page--media' : ''",
]

for (const snippet of requiredMediaPageSnippets) {
  if (!agentConversation.includes(snippet))
    throw new Error('Marketing media page composer contract is missing: ' + snippet)
}

for (const snippet of requiredConversationSnippets) {
  if (!agentConversation.includes(snippet))
    throw new Error('AgentConversationPage session state contract is missing: ' + snippet)
}

if (!composerPackage.includes('test:generation-state'))
  throw new Error('package.json must expose test:generation-state for repair package 3')
