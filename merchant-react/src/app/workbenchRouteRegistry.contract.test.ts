import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { MODULES } from './moduleRegistry'
import { menuIdForLocation, menuIdForPath } from './menuPermissions'
import {
  WORKBENCH_ROUTE_REGISTRY,
  menuRoutesFromRegistry,
} from './workbenchRouteRegistry'
import {
  resolveWorkbenchRoute,
  routeForModule,
  type WorkbenchModuleId,
} from './workbenchRouteModel'
import { mapRouteContextToWorkspacePatch } from '../store/workspaceRouteSync'

const dir = dirname(fileURLToPath(import.meta.url))
const routerSource = readFileSync(join(dir, 'router.tsx'), 'utf8')

const AGENT_MODULE_IDS: WorkbenchModuleId[] = [
  'consultant', 'automation', 'system', 'marketingImage', 'marketingVideo', 'marketingCopy',
  'support', 'agency', 'feedback',
]

for (const { id, route } of menuRoutesFromRegistry()) {
  if (id === 'search') continue
  const pathname = route.split('?')[0]
  const search = route.includes('?') ? route.slice(route.indexOf('?')) : ''
  const resolved = resolveWorkbenchRoute(pathname, search)
  assert.ok(resolved, `menu route ${route} should resolve`)
  assert.equal(menuIdForLocation(pathname, search), id, `menuIdForLocation(${route})`)
}

for (const moduleId of AGENT_MODULE_IDS) {
  const canonical = routeForModule(moduleId)
  assert.equal(resolveWorkbenchRoute(canonical)?.canonicalPath, canonical, `${moduleId} canonical`)
  const moduleRoute = MODULES[moduleId]?.route?.split('?')[0]
  if (moduleRoute && moduleRoute.startsWith('/workbench/')) {
    assert.equal(moduleRoute, canonical, `MODULES[${moduleId}].route should match registry`)
  }
}

assert.equal(resolveWorkbenchRoute('/workbench/automation')?.moduleId, 'automation')
assert.equal(resolveWorkbenchRoute('/workbench/automation/threads/t1')?.moduleId, 'automation')

const legacyConsultant = resolveWorkbenchRoute('/workbench/consultant')
assert.ok(legacyConsultant)
assert.equal(legacyConsultant?.isLegacyPath, true)
assert.equal(legacyConsultant?.canonicalPath, '/workbench/assistant')
assert.equal(routeForModule('consultant'), '/workbench/assistant')
assert.notEqual(legacyConsultant?.path, legacyConsultant?.canonicalPath)

assert.equal(menuIdForLocation('/workbench/generation-assets', '?tab=numbers'), 'generationAssets')
assert.equal(menuIdForLocation('/workbench/generation-assets', '?tab=ad-card'), 'generationAssets')
assert.equal(menuIdForLocation('/workbench/kefu/settings', '?tab=stores'), 'kefu')
assert.equal(menuIdForLocation('/workbench/account', '?section=team'), 'teamManagement')

const kefuPatch = mapRouteContextToWorkspacePatch('/workbench/kefu/settings', '?tab=tech-config')
assert.equal(kefuPatch?.selectedKefuItem, 'tech-config')

const accountPatch = mapRouteContextToWorkspacePatch('/workbench/account', '?section=archives')
assert.equal(accountPatch?.accountSettingsSubTab, 'archives')

for (const entry of WORKBENCH_ROUTE_REGISTRY) {
  if (!entry.threadPath) continue
  const routerPath = entry.threadPath.replace(/^\//, '')
  assert.match(routerSource, new RegExp("path: '" + routerPath + "'"), 'router should declare ' + entry.canonicalPath)
}

assert.equal(menuIdForPath('/workbench/automation'), menuIdForLocation('/workbench/automation', ''))

console.log('Workbench route registry contract passed')
