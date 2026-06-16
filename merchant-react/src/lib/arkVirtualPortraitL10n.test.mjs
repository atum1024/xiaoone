import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const dir = dirname(fileURLToPath(import.meta.url))
const jsonPath = join(dir, '../data/arkVirtualPortraits.json')
const dataPath = join(dir, 'arkVirtualPortraitL10nData.ts')
const modulePath = join(dir, 'arkVirtualPortraitL10n.ts')

const json = JSON.parse(readFileSync(jsonPath, 'utf8'))
const dataSource = readFileSync(dataPath, 'utf8')
const moduleSource = readFileSync(modulePath, 'utf8')

const countries = new Set()
const occupations = new Set()
const temperaments = new Set()

for (const item of json) {
  const m = item.metadata || {}
  if (m.country) countries.add(m.country)
  if (m.occupation) occupations.add(m.occupation)
  if (m.temperament) temperaments.add(m.temperament)
}

function dictEntries(source, constName) {
  const start = source.indexOf(`export const ${constName}`)
  assert.ok(start >= 0, `missing ${constName}`)
  const slice = source.slice(start)
  const keys = [...slice.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'\s*:\s*\{\s*en:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g)]
  return new Map(keys.map(([, zh, en]) => [zh, en]))
}

const countryDict = dictEntries(dataSource, 'ARK_PORTRAIT_COUNTRY_L10N')
const occupationDict = dictEntries(dataSource, 'ARK_PORTRAIT_OCCUPATION_L10N')
const temperamentDict = dictEntries(dataSource, 'ARK_PORTRAIT_TEMPERAMENT_L10N')
const genderDict = dictEntries(dataSource, 'ARK_PORTRAIT_GENDER_L10N')

for (const value of countries) {
  assert.ok(countryDict.has(value), `missing country translation: ${value}`)
  assert.ok(countryDict.get(value), `empty country translation: ${value}`)
}

for (const value of occupations) {
  assert.ok(occupationDict.has(value), `missing occupation translation: ${value}`)
  assert.ok(occupationDict.get(value), `empty occupation translation: ${value}`)
}

for (const value of temperaments) {
  assert.ok(temperamentDict.has(value), `missing temperament translation: ${value}`)
  assert.ok(temperamentDict.get(value), `empty temperament translation: ${value}`)
}

for (const value of ['男', '女']) {
  assert.ok(genderDict.has(value), `missing gender translation: ${value}`)
}

assert.match(moduleSource, /export function formatPortraitLabel/)
assert.match(moduleSource, /export function formatPortraitHint/)
assert.match(moduleSource, /export function portraitSearchTokens/)

const sample = json.find(item => item.metadata?.country === '阿根廷' && item.metadata?.occupation === 'DJ/音乐制作人')
assert.ok(sample, 'expected sample portrait')

const { formatPortraitLabel, formatPortraitHint, portraitSearchTokens } = await import('./arkVirtualPortraitL10n.ts')
const enLabel = formatPortraitLabel(sample, 'en')
const enHint = formatPortraitHint(sample, 'en')

assert.match(enLabel, /Argentina/)
assert.match(enLabel, /Male|DJ/)
assert.doesNotMatch(enLabel, /阿根廷|男|DJ\/音乐制作人/)
assert.match(enHint, /Argentina/)
assert.match(portraitSearchTokens(sample, 'en'), /argentina/)

console.log('arkVirtualPortraitL10n.test.mjs passed')
