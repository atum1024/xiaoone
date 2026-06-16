import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const sendSource = readFileSync(join(dir, 'agentConversationSend.ts'), 'utf8')
const sharedSource = readFileSync(join(dir, 'agentConversationShared.ts'), 'utf8')
const composerSource = readFileSync(join(dir, '../components/XiaooneComposer.tsx'), 'utf8')

const requiredContracts = [
  ['image material optimistic attachment builder', sharedSource, 'export function buildImageSendOptimisticAttachments('],
  ['image material cleanup helper', sharedSource, 'export function clearImageComposerMaterials('],
  ['send context exposes image option setter', sendSource, 'setImageOptions: (v: ImageGenerationOptions | ((prev: ImageGenerationOptions) => ImageGenerationOptions)) => void'],
  ['image send branch is detected', sendSource, 'const isImageMarketingSend ='],
  ['image send branch uses the material attachment builder', sendSource, 'buildImageSendOptimisticAttachments({'],
  ['image send clears composer materials after optimistic append', sendSource, 'ctx.setImageOptions(prev => clearImageComposerMaterials(prev))'],
  ['send remembers whether the original input was empty', sendSource, 'const inputWasEmpty = !(contentOverride ?? ctx.draft).trim()'],
  ['stream request receives locale and empty-input metadata', sendSource, '{ locale: ctx.locale, inputWasEmpty }'],
  ['composer materials are shared by image and video', composerSource, 'const isMaterialMode = isImageGenerationMode || isVideoGenerationMode'],
  ['image composer renders the material bar above the text area', composerSource, '{renderComposerMaterialBar()}\n              <div className="cx-image-input">'],
  ['image virtual portraits are read from multi-select reference images', composerSource, 'listArkVirtualPortraitReferences(imageOptions)'],
  ['material bar guard is no longer video-only', composerSource, 'if (!isMaterialMode || composerMaterials.length === 0)'],
]

for (const [label, source, snippet] of requiredContracts) {
  if (!source.includes(snippet))
    throw new Error('missing image material contract: ' + label)
}

console.log('agentConversationSend image materials contract ok')
