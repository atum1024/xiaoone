import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const panelSource = readFileSync(join(dir, 'TeamMembersPanel.tsx'), 'utf8')
const cssSource = readFileSync(join(dir, 'team-members-panel.css'), 'utf8')
const apiSource = readFileSync(join(dir, '../../lib/teamApi.ts'), 'utf8')

assert.match(panelSource, /const EMAIL_PATTERN =/, 'Team member forms should use a real email pattern')
assert.match(panelSource, /normalizeTeamErrorMessage/, 'Team member API errors should be mapped to business-facing copy')
assert.match(panelSource, /kefu_max_concurrent:\s*5/, 'Invite form should include concurrent session limit')
assert.match(panelSource, /validateConcurrentLimit\(inviteForm\.kefu_max_concurrent\)/, 'Invite submit should validate concurrent session limits')
assert.match(panelSource, /kefu_max_concurrent:\s*inviteForm\.kefu_max_concurrent/, 'Invite payload should include the validated concurrent limit')
assert.match(apiSource, /kefu_max_concurrent\?: number/, 'Team API add payload should expose the concurrent limit field')
assert.match(cssSource, /\.tm-search-field\s*\{[\s\S]*position:\s*relative/, 'Search field wrapper should reserve icon space')
assert.match(cssSource, /\.tm-search-field__input[\s\S]*padding-left/, 'Search input should have CSS-owned left padding')

console.log('TeamMembersPanel validation and search layout contract passed')
