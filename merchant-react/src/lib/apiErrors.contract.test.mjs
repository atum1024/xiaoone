import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const apiErrorsSource = readFileSync(join(dir, 'apiErrors.ts'), 'utf8')
const commonCatalogSource = readFileSync(join(dir, '../i18n/catalog/common.ts'), 'utf8')

assert.match(
  apiErrorsSource,
  /'sms_config_missing': 'common\.api\.smsConfigMissing'/,
  'stable SMS config error code should map to a user-facing message',
)
assert.match(
  apiErrorsSource,
  /'tencent sms config missing': 'common\.api\.smsConfigMissing'/,
  'legacy Tencent config message should remain user-friendly while backend rollout catches up',
)
assert.match(commonCatalogSource, /'common\.api\.smsConfigMissing': '短信服务暂未配置，请联系平台管理员处理。'/)
assert.match(commonCatalogSource, /'common\.api\.smsConfigMissing': 'SMS verification is not configured\. Contact platform admin\.'/)

