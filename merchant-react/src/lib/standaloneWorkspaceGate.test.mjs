import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const gatePath = join(dir, 'standaloneWorkspaceGate.ts')
const pagePath = join(dir, '..', 'pages', 'StandaloneSitePortalPage.tsx')

assert.ok(existsSync(gatePath), 'standalone site should have a workspace gate helper')

const {
  isStandaloneWorkspaceOpen,
  shouldEnsureStandaloneWorkspaceProvision,
} = await import('./standaloneWorkspaceGate.ts')

assert.equal(isStandaloneWorkspaceOpen(null), false)
assert.equal(isStandaloneWorkspaceOpen(undefined), false)
assert.equal(
  isStandaloneWorkspaceOpen({ status: 'not_found' }),
  false,
  'not_found workspaces should not open the standalone subdomain',
)
assert.equal(
  isStandaloneWorkspaceOpen({ status: 'provisioning' }),
  false,
  'provisioning workspaces should show the preparing modal',
)
assert.equal(
  isStandaloneWorkspaceOpen({ status: 'provision_failed' }),
  false,
  'failed workspaces should not navigate to the subdomain',
)
assert.equal(
  isStandaloneWorkspaceOpen({ status: 'suspended' }),
  false,
  'suspended workspaces should not navigate to the subdomain',
)
assert.equal(
  isStandaloneWorkspaceOpen({ status: 'active' }),
  true,
  'active workspaces may open the standalone subdomain',
)

assert.equal(shouldEnsureStandaloneWorkspaceProvision(null), false)
assert.equal(shouldEnsureStandaloneWorkspaceProvision({ status: 'not_found' }), true)
assert.equal(shouldEnsureStandaloneWorkspaceProvision({ status: 'provisioning' }), false)
assert.equal(shouldEnsureStandaloneWorkspaceProvision({ status: 'active' }), false)

const pageSource = readFileSync(pagePath, 'utf8')

assert.match(
  pageSource,
  /WorkspacePreparingModal/,
  'standalone site page should reuse the workspace preparing modal',
)
assert.match(
  pageSource,
  /ensureWorkspaceProvision/,
  'standalone site page should trigger workspace provisioning for not_found status',
)
assert.match(
  pageSource,
  /async function openStorefront\(\)/,
  'opening the storefront should wait for a fresh workspace status read',
)
assert.ok(
  pageSource.indexOf('ensureStandaloneWorkspaceReady') < pageSource.indexOf('window.open(storefrontUrl'),
  'workspace readiness must be checked before opening the storefront URL',
)

console.log('standalone workspace gate contract passed')
