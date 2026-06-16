import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'Topbar.tsx'), 'utf8')

assert.match(
  source,
  /from '\.\.\/app\/workbenchRouteModel'/,
  'Topbar should consume the shared workbench route model',
)

assert.match(
  source,
  /const workbenchRoute = resolveWorkbenchRoute\(pathname, search\)/,
  'Topbar current module should be derived from route model',
)

assert.match(
  source,
  /workbenchRoute\.path === '\/workbench\/assistant' && workbenchRoute\.pageKind === 'new'/,
  'Assistant runtime status should only show on /workbench/assistant without a thread',
)

assert.match(
  source,
  /\/api\/v1\/iam\/account\/debug-region\//,
  'Topbar local region toggle should update the current user debug billing region in non-prod',
)

assert.match(
  source,
  /<LocalIpRegionToggle[\s\S]*onToggleRegion=\{syncLocalBillingRegion\}/,
  'Topbar should wire LocalIpRegionToggle to the debug billing region sync handler',
)

assert.doesNotMatch(
  source,
  /function\s+isXiaowanNewConversationRoute/,
  'Topbar should not keep a separate xiaoone route parser',
)

assert.doesNotMatch(
  source,
  /pathname\.startsWith\('\/workbench\/marketing'\)[\s\S]{0,160}AssistantRuntimeStatus/,
  'Marketing routes should not opt into the xiaoone runtime status slot',
)

console.log('Topbar navigation contract passed')
