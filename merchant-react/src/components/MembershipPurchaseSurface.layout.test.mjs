import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(dir, 'MembershipPurchaseSurface.css'), 'utf8')

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))
  assert.ok(match, `Missing CSS rule for ${selector}`)
  return match[1]
}

const blockerPanel = ruleFor('.x1-membership-blocker__panel')
assert.doesNotMatch(
  blockerPanel,
  /overflow\s*:\s*auto\b/,
  'membership blocker panel must not create an internal scrollbar',
)
assert.match(
  blockerPanel,
  /overflow\s*:\s*hidden\b/,
  'membership blocker panel should clip to the one-screen layout instead of scrolling',
)
assert.match(
  blockerPanel,
  /display\s*:\s*flex\b/,
  'membership blocker panel should use flex layout so compact purchase content can fill the viewport predictably',
)

const compactPlan = ruleFor('.x1-membership-surface--compact .x1-membership-plan')
assert.match(
  compactPlan,
  /min-height\s*:\s*0\b/,
  'compact membership plan cards should not force a tall minimum height',
)

const compactFeatures = ruleFor('.x1-membership-surface--compact .x1-membership-plan__features li')
assert.match(
  compactFeatures,
  /font-size\s*:\s*12px\b/,
  'compact membership feature rows should use the tighter one-screen type size',
)

const lockedText = ruleFor('.x1-membership-plan__features .plan-feature--locked > span')
assert.match(
  lockedText,
  /color\s*:/,
  'locked membership feature text should explicitly render in muted grey',
)
assert.match(
  lockedText,
  /text-decoration\s*:\s*none\b/,
  'locked membership feature text should stay readable without strike-through',
)

console.log('MembershipPurchaseSurface layout contract passed')
