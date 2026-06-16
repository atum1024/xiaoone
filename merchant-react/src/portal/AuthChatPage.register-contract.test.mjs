import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'AuthChatPage.tsx'), 'utf8')

assert.match(
  source,
  /import \{ buildMembershipPath, resolveAuthedLandingPath \} from '..\/lib\/membershipRouting'/,
  'chat registration should share the unified membership routing helpers',
)
assert.match(
  source,
  /navigate\(\s*buildMembershipPath\(\{[\s\S]*planCode: selectedPlanCode \|\| undefined,[\s\S]*termMonths: selectedTermMonths \|\| undefined,[\s\S]*\}\),\s*\{ replace: true \},\s*\)/,
  'chat registration should redirect to the membership page with selected plan params',
)
assert.match(
  source,
  /if \(auth\.status === 'authed' && !registeringRef\.current\)\s*return <Navigate to=\{resolveAuthedLandingPath\(auth\.subscriptionPlanCode, from\)\} replace \/>/,
  'chat auth page should send already-authed unpaid accounts to membership while registration handoff is not in progress',
)
assert.match(
  source,
  /const chatPortalHomeHref = publicHome/,
  'chat portal logo can point to the public site because registration now leaves the chat page for membership payment',
)
assert.match(
  source,
  /href=\{chatPortalHomeHref\}/,
  'chat portal logo should use the centralized href variable',
)
assert.doesNotMatch(source, /<MembershipPurchaseSurface/, 'chat registration must not keep an inline plan purchase surface')
assert.doesNotMatch(source, /showPlan/, 'chat registration must not keep the old inline plan step state')
assert.doesNotMatch(source, /allowSkip/, 'chat registration must not offer a skip path into workbench before payment')
assert.doesNotMatch(source, /onSkip/, 'chat registration must not navigate to workbench from skip')
assert.doesNotMatch(source, /skip and choose later/i, 'chat plan copy should not encourage skipping payment into the workbench')

console.log('AuthChatPage register contract passed')
