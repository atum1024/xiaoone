import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'WorkbenchHomePage.tsx'), 'utf8')

assert.match(source, /import \{ Navigate, useNavigate, useSearchParams \} from 'react-router'/)
assert.match(
  source,
  /const subscriptionPlanCode = useAuthStore\(state => state\.subscriptionPlanCode\)/,
  'workbench should read active subscription state before showing workspace runtime status',
)
assert.match(
  source,
  /const hasPaidSubscription = Boolean\(subscriptionPlanCode && subscriptionPlanCode !== 'free'\)/,
  'workbench should treat empty and free plans as unpaid',
)
assert.match(
  source,
  /const assistantRuntimeStatusQuery = useAssistantRuntimeStatusQuery\(hasPaidSubscription\)/,
  'workbench should not query workspace runtime status before the merchant has a paid plan',
)
assert.match(
  source,
  /if \(!hasPaidSubscription\)\s*return <Navigate to="\/membership" replace \/>/,
  'workbench should redirect unpaid accounts to the membership page instead of showing workspace preparing',
)

const redirectIndex = source.indexOf('return <Navigate to="/membership" replace />')
const statusQueryIndex = source.indexOf('useAssistantRuntimeStatusQuery(hasPaidSubscription)')
assert.ok(redirectIndex > statusQueryIndex, 'redirect should be in component flow after hooks are declared')

console.log('Workbench membership gate contract passed')
