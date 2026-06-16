import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const cardSource = readFileSync(join(dir, 'NewConversationCards.tsx'), 'utf8')
const pageSource = readFileSync(join(dir, '../pages/useAgentConversation.tsx'), 'utf8')

assert.match(
  cardSource,
  /from '\.\.\/app\/workbenchRouteModel'/,
  'new-conversation cards should consume the shared workbench route model',
)

assert.match(
  cardSource,
  /import \{ Link, useLocation, useNavigate \} from 'react-router'/,
  'new-conversation cards should render route labels as links with href fallback navigation',
)

assert.match(
  cardSource,
  /<Link[\s\S]*?to=\{card\.route\}[\s\S]*?role="tab"/,
  'new-conversation cards should expose each card route as a tab link',
)

assert.match(
  cardSource,
  /return activeNewConversationCard\(pathname\)/,
  'new-conversation card active state should be delegated to route model',
)

assert.match(
  cardSource,
  /route:\s*routeForModule\('marketingImage'\)/,
  'image card route should come from route model',
)

assert.match(
  cardSource,
  /route:\s*routeForModule\('marketingVideo'\)/,
  'video card route should come from route model',
)

assert.match(
  cardSource,
  /route:\s*routeForModule\('marketingCopy'\)/,
  'copy card route should come from route model',
)

assert.doesNotMatch(
  cardSource,
  /pathname\.startsWith\(/,
  'new-conversation cards must not parse routes locally with startsWith',
)

assert.doesNotMatch(
  cardSource,
  /URLSearchParams\s*\(\s*\{\s*draft\b/,
  'new-conversation card switching must not encode the current input as ?draft= because the page auto-sends draft query params',
)

assert.match(
  cardSource,
  /navigate\(\s*card\.route\s*,\s*\{\s*state:\s*\{\s*draft:\s*text\s*\}\s*\}\s*\)/,
  'new-conversation cards should carry typed text through router state when switching labels',
)

assert.match(
  pageSource,
  /draftFromNavigationState/,
  'useAgentConversation should read draft text carried by card navigation state',
)

assert.match(
  pageSource,
  /setDraft\(\s*draftFromSearch\s*\|\|\s*draftFromNavigationState\s*\|\|\s*promptFromSearch\s*\)/,
  'navigation-state draft should fill the composer without participating in the query-draft auto-send path',
)

console.log('NewConversationCards navigation contract passed')
