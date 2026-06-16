import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'visitorWidget.ts'), 'utf8')

const handler = source.match(/onJson:\s*\(payload\)\s*=>\s*\{([\s\S]*?)\n\s*\},\n\s*onClose:/)

assert.ok(handler, 'visitor widget should handle websocket JSON payloads')
assert.match(
  handler[1],
  /if\s*\(\s*msg\?\.sender_role\s*===\s*'visitor'\s*\)\s*return/,
  'visitor widget must ignore websocket echoes of visitor messages because it already renders a local optimistic bubble',
)

console.log('visitor widget websocket echo filter check passed')
