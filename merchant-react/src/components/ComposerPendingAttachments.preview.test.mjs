import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'ComposerPendingAttachments.tsx'), 'utf8')

assert.doesNotMatch(
  source,
  /useMemo[\s\S]*?URL\.createObjectURL/,
  'pending attachment previews must not create object URLs during render/useMemo because React dev StrictMode can revoke the active URL',
)

assert.match(
  source,
  /useState<[^>]*PreviewUrl/,
  'pending attachment previews should store object URLs in state so a StrictMode remount can create fresh URLs',
)

assert.match(
  source,
  /useEffect[\s\S]*?URL\.createObjectURL[\s\S]*?URL\.revokeObjectURL/,
  'pending attachment preview URLs should be created and revoked inside an effect lifecycle',
)

console.log('ComposerPendingAttachments preview URL lifecycle check passed')
