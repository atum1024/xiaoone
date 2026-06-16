import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'KefuOverviewPage.tsx'), 'utf8')

const topTabsMatch = source.match(/const KEFU_TOP_TABS:[\s\S]*?= \[([\s\S]*?)\] as const/)

assert.ok(topTabsMatch, 'KefuOverviewPage.tsx should define KEFU_TOP_TABS')
assert.equal(
  topTabsMatch[1].includes("key: 'help-center'"),
  false,
  '客服顶部入口本版本不应显示帮助中心',
)
assert.ok(
  source.includes("return '/workbench/kefu/help-center'"),
  '帮助中心直达路由应保留，便于下个版本恢复入口',
)

console.log('KefuOverviewPage visible tab contract passed')
