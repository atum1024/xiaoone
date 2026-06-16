import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(dir, 'KefuTechConfigPage.tsx'), 'utf8')
const css = readFileSync(join(dir, 'kefu-tech-config-page.css'), 'utf8')
const i18n = readFileSync(join(dir, '../i18n/catalog/kefu.ts'), 'utf8')

assert.doesNotMatch(
  page,
  /rows\[0\]/,
  'KefuTechConfigPage must not use the first SDK config as an implicit global integration',
)

assert.doesNotMatch(
  page,
  /credentialFlow/,
  'KefuTechConfigPage should not render the old credential flow bar',
)

assert.doesNotMatch(
  page,
  /mr-kefu-tech-onboard/,
  'KefuTechConfigPage should not render the old top onboarding/summary module',
)

assert.match(
  page,
  /buildAiIntegrationBundle\(row,\s*availableOrigin,\s*t,\s*tpl,\s*\{\s*credentialCount:\s*rows\.length\s*\}\)/,
  'Each store credential card should copy an AI integration bundle generated from that card row',
)

assert.doesNotMatch(
  css,
  /mr-kefu-tech-onboard/,
  'Removed onboarding module styles should not remain in the page stylesheet',
)

assert.doesNotMatch(
  css,
  /mr-kefu-tech-flow/,
  'Removed credential flow styles should not remain in the page stylesheet',
)

assert.doesNotMatch(
  i18n,
  /第一条凭据|first credential|integration card above|本页上方「网站接入」卡片/,
  'Integration copy should not describe the first credential or old top integration card as the source of truth',
)

console.log('KefuTechConfigPage multi-store integration contract passed')
