import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'workspaceStatusApi.ts'), 'utf8')

const paidIndex = source.indexOf("const paid = Boolean(subscriptionPlanCode && subscriptionPlanCode !== 'free')")
const statusIndex = source.indexOf('const status = await getWorkspaceStatus()')
assert.ok(paidIndex >= 0, 'syncWorkspaceAfterLogin should compute paid membership state')
assert.ok(statusIndex >= 0, 'syncWorkspaceAfterLogin should still read workspace status for paid users')
assert.ok(paidIndex < statusIndex, 'unpaid accounts should return before workspace status/provision checks')
assert.match(
  source,
  /const paid = Boolean\(subscriptionPlanCode && subscriptionPlanCode !== 'free'\)[\s\S]*if \(!paid\)\s*return[\s\S]*const status = await getWorkspaceStatus\(\)/,
  'syncWorkspaceAfterLogin should skip workspace sync entirely for unpaid accounts',
)

console.log('workspace status sync contract passed')
