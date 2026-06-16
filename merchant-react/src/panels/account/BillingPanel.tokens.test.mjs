import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'BillingPanel.tsx'), 'utf8')

if (!source.includes("function fmtTokens(value?: string | number | null): string")) {
  throw new Error('BillingPanel.tsx is missing fmtTokens helper')
}

if (!source.includes("if (!Number.isFinite(n) || n <= 0)\n    return '—'")) {
  throw new Error('fmtTokens should render \"—\" for null/zero/invalid token values')
}

console.log('BillingPanel fmtTokens null rendering check passed')

if (!source.includes('function storageValueLabel(')) {
  throw new Error('BillingPanel.tsx is missing storageValueLabel helper')
}

for (const expected of ['未上报', '未开通', '0 GB']) {
  if (!source.includes(expected)) {
    throw new Error(`BillingPanel storage display should distinguish ${expected}`)
  }
}

if (source.includes("storageUsedBytes > 0 ? fmtGbFromBytes(storageUsedBytes) : t('account.common.notAvailable')")) {
  throw new Error('Storage used must not collapse missing and zero values into account.common.notAvailable')
}
