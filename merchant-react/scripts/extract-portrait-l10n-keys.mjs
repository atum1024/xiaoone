import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const jsonPath = join(dir, '../src/data/arkVirtualPortraits.json')
const outPath = join(dir, '../src/lib/arkVirtualPortraitL10nData.ts')

const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
const countries = new Set()
const occupations = new Set()
const temperaments = new Set()

for (const item of data) {
  const m = item.metadata || {}
  if (m.country) countries.add(m.country)
  if (m.occupation) occupations.add(m.occupation)
  if (m.temperament) temperaments.add(m.temperament)
}

function emitDict(name, items) {
  const lines = [`export const ${name}: Record<string, { en: string }> = {`]
  for (const zh of [...items].sort()) {
    lines.push(`  '${zh.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}': { en: '' },`)
  }
  lines.push('}')
  return lines.join('\n')
}

const header = '/** Locale strings for Ark virtual portrait metadata. Regenerate skeleton with scripts/extract-portrait-l10n-keys.mjs */'
const body = [
  emitDict('ARK_PORTRAIT_COUNTRY_L10N', countries),
  emitDict('ARK_PORTRAIT_OCCUPATION_L10N', occupations),
  emitDict('ARK_PORTRAIT_TEMPERAMENT_L10N', temperaments),
  emitDict('ARK_PORTRAIT_GENDER_L10N', new Set(['?', '?'])),
].join('\n\n')

writeFileSync(outPath, `${header}\n\n${body}\n`)
console.log(`Wrote skeleton to ${outPath}`)
console.log(`countries=${countries.size} occupations=${occupations.size} temperaments=${temperaments.size}`)
