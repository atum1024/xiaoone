import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const sendSource = readFileSync(join(dir, 'agentConversationSend.ts'), 'utf8')
const sharedSource = readFileSync(join(dir, 'agentConversationShared.ts'), 'utf8')

const requiredSnippets = [
  'function hasMarketingImageGenerationReference(',
  'function hasMarketingVideoGenerationReference(',
  'selectedArkVirtualPortraitFromImageOptions(imageOptions)',
  'selectedArkVirtualPortraitFromOptions(videoOptions)',
  'hasReferenceAttachments: imageGenerationReference',
  'hasReferenceAttachments: videoGenerationReference',
  "toast.warning(ctx.t('composer.send.needContent'))",
  'if (!content.trim() && hasGenerationReference)',
]

for (const snippet of requiredSnippets) {
  if (!sendSource.includes(snippet))
    throw new Error('agentConversationSend portrait+template send contract is missing: ' + snippet)
}

// Simulate the portrait+template-only scenario at compose layer.
const TEMPLATE_INTENT_MARKER = '【模板意图】'
function stripTemplateIntentBlock(text) {
  const markerIndex = text.indexOf(TEMPLATE_INTENT_MARKER)
  if (markerIndex < 0)
    return text.trim()
  return text.slice(0, markerIndex).trim()
}

function buildCreativeLayerLines(hasReferenceAttachments) {
  if (!hasReferenceAttachments)
    return []
  return ['用户上传的图片/视频/音频是本次内容的主要依据，画面主体、场景、构图应优先来自素材实际内容与用户文字需求。']
}

function composeMarketingImagePrompt({ content, hasReferenceAttachments }) {
  const stripped = stripTemplateIntentBlock(content)
  const lines = buildCreativeLayerLines(hasReferenceAttachments)
  if (!lines.length)
    return stripped
  const userNeed = `用户生成需求：${stripped || '请根据当前参考素材生成图片'}`
  return `${lines.join('\n')}\n\n${userNeed}`
}

const templateOnlyText = '【模板意图】生成一张品牌 KV 横幅'
const oldBehavior = composeMarketingImagePrompt({
  content: templateOnlyText,
  hasReferenceAttachments: false,
})
const fixedBehavior = composeMarketingImagePrompt({
  content: templateOnlyText,
  hasReferenceAttachments: true,
})

if (oldBehavior !== '')
  throw new Error('expected old behavior to produce empty content, got: ' + oldBehavior)
if (!fixedBehavior.includes('请根据当前参考素材生成图片'))
  throw new Error('expected fixed behavior to include fallback user need, got: ' + fixedBehavior)

if (!sharedSource.includes('export function composeMarketingImagePrompt'))
  throw new Error('shared compose helper missing')

console.log('agentConversationSend portrait+template send contract ok')
