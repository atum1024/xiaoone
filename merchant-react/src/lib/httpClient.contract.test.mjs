import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(__dirname, 'httpClient.ts'), 'utf8')

assert.match(
  source,
  /export function shouldBounceAfterRefreshFailure\(url\?: string\): boolean/,
  'httpClient must expose a small policy helper for refresh-failure logout decisions',
)

assert.match(
  source,
  /if \(shouldBounceAfterRefreshFailure\(cfg\?\.url \|\| ''\)\) \{\s*clearTokensAndBounce\(\)\s*\}/s,
  'refresh failure must only bounce for auth-critical requests',
)

assert.ok(
  !/if \(next\) \{[\s\S]*?return api\.request\(cfg\)[\s\S]*?\}\s*\/\/ Refresh 失败[\s\S]*?clearTokensAndBounce\(\)/.test(source),
  'non-critical business 401s must reject instead of clearing the whole login session',
)

console.log('httpClient refresh-failure contract passed')
