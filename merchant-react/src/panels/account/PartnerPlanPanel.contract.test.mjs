import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const panelSource = fs.readFileSync(path.join(__dirname, 'PartnerPlanPanel.tsx'), 'utf8')
const accountCatalog = fs.readFileSync(path.join(__dirname, '../../i18n/catalog/account.ts'), 'utf8')

assert.match(
  panelSource,
  /import \{ BillingAPI \} from '\.\.\/\.\.\/lib\/billingApi'/,
  'PartnerPlanPanel should use the shared billing API client so partner calls keep the /api/v1/billing prefix',
)

assert.doesNotMatch(
  panelSource,
  /api\.(?:get|post)\('\/billing\/partner\/plan\//,
  'PartnerPlanPanel must not call bare /billing partner paths because the app host serves those through Vite instead of BFF',
)

assert.match(
  panelSource,
  /function partnerPlanErrorMessage\(err: unknown, t: \(key: string\) => string\): string/,
  'PartnerPlanPanel should normalize backend partner errors before rendering them',
)

for (const field of ['message', 'error', 'code']) {
  assert.match(
    panelSource,
    new RegExp(`response\\?\\.data\\?\\.${field}`),
    `PartnerPlanPanel should read backend ${field} payloads`,
  )
}

const expectedCodes = [
  'referral_code_invalid_length',
  'referral_code_invalid_characters',
  'referral_code_already_customized',
  'referral_code_taken',
  'referral_code_not_found',
  'referral_code_self_bind',
  'method_not_allowed',
]

for (const code of expectedCodes) {
  assert.match(panelSource, new RegExp(code), `missing partner error mapping for ${code}`)
}

for (const key of [
  'account.partner.errorInvalidCodeLength',
  'account.partner.errorInvalidCodeCharacters',
  'account.partner.errorAlreadyCustomized',
  'account.partner.errorCodeTaken',
  'account.partner.errorCodeNotFound',
  'account.partner.errorSelfBind',
  'account.partner.errorMethodNotAllowed',
]) {
  assert.match(accountCatalog, new RegExp(`'${key}'`), `missing i18n key ${key}`)
}

console.log('PartnerPlanPanel error contract passed')
