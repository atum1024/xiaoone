import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'router.tsx'), 'utf8')

assert.match(
  source,
  /function\s+AgentConversationRoute\(\)/,
  'Agent conversation routes should share one wrapper so hero and thread URLs keep the same page instance',
)

assert.match(
  source,
  /function\s+stableAgentConversationRouteKey\(/,
  'AgentConversationRoute should derive a stable key without threadId',
)

assert.match(
  source,
  /const route = resolveWorkbenchRoute\(location\.pathname, location\.search\)/,
  'AgentConversationRoute should derive its key from the shared route model',
)

assert.match(
  source,
  /<AgentConversationPage key=\{stableKey\} threadId=\{threadId\} \/>/,
  'AgentConversationPage should remount only when module or mode route context changes, not when threadId changes',
)

assert.match(
  source,
  /path: 'workbench\/marketing\/video', element: <AgentConversationRoute \/>/,
  'Marketing video new route should use the unified conversation route wrapper',
)

assert.match(
  source,
  /path: 'workbench\/marketing\/video\/threads\/:threadId', element: <AgentConversationRoute \/>/,
  'Marketing video detail route should use the same unified conversation route wrapper',
)

assert.doesNotMatch(
  source,
  /AgentNewConversationRoute/,
  'Router should not keep separate new/detail conversation route wrappers',
)

console.log('Router navigation contract passed')
