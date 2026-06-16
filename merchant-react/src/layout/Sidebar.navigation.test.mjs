import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'Sidebar.tsx'), 'utf8')
const moduleRegistrySource = readFileSync(join(dir, '../app/moduleRegistry.ts'), 'utf8')
const localeSource = readFileSync(join(dir, '../store/locale.ts'), 'utf8')
const routeRegistrySource = readFileSync(join(dir, '../app/workbenchRouteRegistry.ts'), 'utf8')

assert.match(
  source,
  /from '\.\.\/app\/workbenchRouteModel'/,
  'Sidebar should consume the shared workbench route model',
)

assert.match(
  source,
  /function\s+moduleRouteMatches\(moduleId:\s*string,\s*pathname:\s*string,\s*search = ''\)/,
  'Sidebar should centralize module route matching by module id',
)

assert.match(
  source,
  /const route = resolveWorkbenchRoute\(pathname, search\)/,
  'Sidebar module matching should be derived from route model output',
)

assert.match(
  source,
  /const threadRoute = routeForThread\(thread\)/,
  'Sidebar thread links should use canonical thread routes from route model',
)

assert.match(
  moduleRegistrySource,
  /\{ id: 'quick', title: '快捷入口', items: \['kefu', 'automation', 'socialPosting', 'repository', 'generationAssets', 'standaloneSite'\] \}/,
  'Quick nav should no longer render newChat or search as standalone text rows',
)

assert.match(
  moduleRegistrySource,
  /\{ id: 'business', title: '智能工作台', items: \['consultant', 'system', 'marketingImage', 'marketingVideo', 'marketingCopy', 'support', 'agency', 'feedback'\] \}/,
  'Smart workbench should own the smart assistant entry before other agent modules',
)

assert.match(
  moduleRegistrySource,
  /consultant: \{[\s\S]*?label: '智能助手'[\s\S]*?route: '\/workbench\/assistant'/,
  'The assistant entry label should be 智能助手 in the smart workbench',
)

assert.doesNotMatch(
  moduleRegistrySource,
  /\{ id: 'consultant', title: 'xiaoone', items: \['consultant'\] \}/,
  'Assistant threads should no longer live in a separate sidebar section',
)

assert.match(
  localeSource,
  /'biz\.consultant': '智能助手',[\s\S]*?'biz\.xiaoone': '智能助手'/,
  'Chinese sidebar assistant labels should read 智能助手',
)

assert.match(
  localeSource,
  /'sidebar\.newAgentThread': '智能助手'/,
  'Untitled assistant conversations should use 智能助手 as the fallback label',
)

assert.match(
  routeRegistrySource,
  /labelKey: 'biz\.xiaoone',[\s\S]*?fallbackLabel: '智能助手'/,
  'Assistant routes should fall back to 智能助手 when translations are unavailable',
)

assert.match(
  source,
  /import \{ Menu, PanelLeftClose, Pencil, Search, Settings2 \} from 'lucide-react'/,
  'Sidebar should render search as a compact icon action beside the smart workbench title',
)

assert.match(
  source,
  /className="mr-nav-section-title mr-nav-section-title--static mr-nav-section-title--actions"[\s\S]{0,700}className="mr-section-search-button"[\s\S]{0,220}<Search size=\{14\}/,
  'Smart workbench title should expose the search dialog from a magnifier icon button',
)

assert.match(
  source,
  /const renderChildren = Boolean\(isExpanded\)/,
  'The smart assistant conversation list should follow the normal collapsible section state',
)

assert.doesNotMatch(
  source,
  /id === 'consultant' \? true : Boolean\(isExpanded\)/,
  'The smart assistant conversation list must not be forced open',
)

assert.doesNotMatch(
  source,
  /if \(id !== 'consultant'\)\s+toggleBusinessItem\(id\)/,
  'The smart assistant row should be allowed to collapse and expand like other workbench entries',
)

assert.doesNotMatch(
  source,
  /HERO_ROUTE_BY_MODULE/,
  'Sidebar should not keep a local hero route map',
)

assert.doesNotMatch(
  source,
  /location\.pathname\.startsWith\(heroRoute\)/,
  'Sidebar must not use raw startsWith(heroRoute), because /workbench would match every workbench child route',
)

const legacyThreadQueryPattern = new RegExp('to=\\{`\\$\\{threadRoute\\}' + '\\?' + 'thread=')
assert.doesNotMatch(
  source,
  legacyThreadQueryPattern,
  'Sidebar must not append legacy thread query after routeForThread already produced the canonical URL',
)

console.log('Sidebar navigation contract passed')
