import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'PresentationPreviewPane.tsx'), 'utf8')

if (source.includes('????')) {
  throw new Error('PresentationPreviewPane.tsx contains corrupted placeholder text')
}

const required = [
  '商业企划书',
  '辣鸡PPT 预览区',
  '下载 .pptx',
  'ppp-warning-banner',
]

for (const label of required) {
  if (!source.includes(label)) {
    throw new Error(`PresentationPreviewPane.tsx is missing expected label: ${label}`)
  }
}

console.log('PresentationPreviewPane label encoding check passed')
