import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'AuthChatPage.tsx'), 'utf8')
const css = readFileSync(join(dir, '../styles.css'), 'utf8')

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(?:^|})\\s*${escaped}\\s*\\{([\\s\\S]*?)\\}`))
  assert.ok(match, `Missing CSS rule for ${selector}`)
  return match[1]
}

assert.match(
  source,
  /const\s+messagesEndRef\s*=\s*useRef<HTMLElement\s*\|\s*null>\(null\)/,
  'Auth chat should keep an explicit end-of-message scroll anchor',
)

assert.match(
  source,
  /messagesEndRef\.current\?\.scrollIntoView\(\{\s*block:\s*'end'/s,
  'Auth chat should scroll the latest message anchor into view',
)

assert.match(
  source,
  /const\s+lastMessageId\s*=\s*messages\.at\(-1\)\?\.id\s*\|\|\s*''/,
  'Auth chat should key the auto-scroll effect from the latest message identity',
)

assert.match(
  source,
  /<span\s+ref=\{messagesEndRef\}\s+className="x1-chat-portal__messages-end"/,
  'Auth chat should render the scroll anchor after all message content',
)

const shellRule = ruleFor('.x1-chat-portal .x1-portal__shell')
assert.match(
  shellRule,
  /height\s*:\s*min\(760px,\s*calc\(100dvh - 8\.5rem\)\)/,
  'auth chat shell should be height constrained so the message pane scrolls',
)
assert.match(
  shellRule,
  /max-height\s*:\s*calc\(100dvh - 6\.5rem\)/,
  'auth chat shell should stay within the visible viewport',
)

const mainRule = ruleFor('.x1-chat-portal .x1-portal__split-main.x1-chat-portal__split-main')
assert.match(
  mainRule,
  /min-height\s*:\s*0\b/,
  'auth chat main column should allow the message pane to shrink',
)

const messagesRule = ruleFor('.x1-chat-portal__messages')
assert.match(
  messagesRule,
  /overflow-y\s*:\s*auto\b/,
  'auth chat messages should own vertical scrolling',
)
assert.match(
  messagesRule,
  /scrollbar-width\s*:\s*thin\b/,
  'auth chat messages should expose a visible native thin scrollbar',
)

console.log('AuthChatPage scroll contract passed')
