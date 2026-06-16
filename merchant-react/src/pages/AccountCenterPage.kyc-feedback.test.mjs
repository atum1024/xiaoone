import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const accountSource = readFileSync(join(dir, 'AccountCenterPage.tsx'), 'utf8')
const dialogSource = readFileSync(join(dir, '../components/RealNameVerifyDialog.tsx'), 'utf8')

assert.match(
  accountSource,
  /import\s*\{\s*setLocalRealNameOverride\s*\}\s*from\s*'@xiaoone\/region'/,
  'Account KYC success should import the shared local real-name override helper',
)

assert.match(
  accountSource,
  /if\s*\(nextKyc\?\.verified\)\s*\{[\s\S]*setLocalRealNameOverride\(true\)[\s\S]*notifySuccess\(t\('account\.security\.kycPassed'\)\)/,
  'Account KYC success should update local real-name state and show a toast',
)

assert.doesNotMatch(
  accountSource,
  /setNotice\(t\('account\.security\.kycPassed'\)\)/,
  'Account KYC success must not write to the non-rendered notice state',
)


assert.match(
  accountSource,
  /if\s*\(nextKyc\?\.verified\)\s*\{[\s\S]*setKycIdCard\(''\)[\s\S]*setLocalRealNameOverride\(true\)/,
  'Account KYC success must immediately clear plaintext ID-card input before showing verified state',
)

assert.match(
  accountSource,
  /const\s*\[resetCodeCooldown,\s*setResetCodeCooldown\]\s*=\s*useState\(0\)/,
  'Password reset code request should track a dedicated cooldown',
)

assert.match(
  accountSource,
  /setResetCodeCooldown\(30\)/,
  'Password reset code request should start a 30 second cooldown after successful send',
)

assert.match(
  accountSource,
  /disabled=\{busy === 'reset-request' \|\| !canReset \|\| resetCodeCooldown > 0\}/,
  'Password reset send button should be disabled during the cooldown',
)

assert.match(
  dialogSource,
  /import\s*\{\s*setLocalRealNameOverride\s*\}\s*from\s*'@xiaoone\/region'/,
  'Inline KYC dialog should import the shared local real-name override helper',
)

assert.match(
  dialogSource,
  /if\s*\(nextKyc\.verified\)\s*\{\s*setLocalRealNameOverride\(true\)\s*toast\.success\(t\('account\.security\.kycPassed'\)/,
  'Inline KYC dialog should update local real-name state and show a success toast before closing',
)

console.log('KYC feedback and local real-name sync contract passed')
