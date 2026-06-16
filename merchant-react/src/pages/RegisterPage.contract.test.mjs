import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'RegisterPage.tsx'), 'utf8')
const dictSource = readFileSync(join(dir, '../portal/dict.ts'), 'utf8')
const stylesSource = readFileSync(join(dir, '../styles.css'), 'utf8')

assert.match(
  source,
  /const \[passwordConfirm, setPasswordConfirm\] = useState\(''\)/,
  'registration should track confirmation password independently',
)
assert.match(
  source,
  /if \(password !== passwordConfirm\) \{[\s\S]*setError\(t\(portalDict\.registerErrorPasswordMismatch\)\)/,
  'registration should block mismatched passwords before verification',
)
assert.match(
  source,
  /id="reg-pw-confirm"/,
  'registration should render a confirmation password field',
)
assert.match(
  dictSource,
  /registerPasswordConfirmLabel: \{ zh: '确认密码', en: 'Confirm password' \}/,
  'portal copy should include a confirmation password label',
)
assert.match(
  dictSource,
  /registerErrorPasswordMismatch: \{[\s\S]*zh: '两次输入的密码不一致'/,
  'portal copy should include a password mismatch message',
)
assert.match(
  source,
  /function switchIdentifierType[\s\S]*setSmsCooldown\(0\)[\s\S]*setIdentityVerified\(false\)/,
  'switching phone/email registration should clear the cooldown as well as stale messages and code',
)
assert.match(
  source,
  /import \{ merchantSubdomainFqdn, setLocalIpRegionOverride, useRegion \} from '@xiaoone\/region'/,
  'classic register should import the local region override helper for identifier switching',
)
assert.match(
  source,
  /function switchIdentifierType[\s\S]*if \(nextType === 'email'\) setLocalIpRegionOverride\('overseas'\)[\s\S]*if \(nextType === 'phone'\) setLocalIpRegionOverride\('mainland'\)/,
  'local phone/email registration switch should sync the backend dev region',
)
assert.doesNotMatch(
  source,
  /dev_code|devCode/,
  'registration must not consume backend dev_code or auto-fill verification codes',
)
assert.doesNotMatch(
  source,
  /开发环境验证码已生成并自动填入|Development code generated and filled in/,
  'registration must not present mock/development verification codes as sent SMS',
)

const submitStart = source.indexOf('{verifying ?')
const submitEnd = source.indexOf('</motion.button>', submitStart)
assert.ok(submitStart >= 0 && submitEnd > submitStart, 'Missing identity submit button')
assert.doesNotMatch(source.slice(submitStart, submitEnd), /!acceptedTerms/, 'terms validation should be shown after clicking continue, not hidden by a disabled button')

assert.match(
  source,
  /buildMembershipPath\(\{[\s\S]*planCode: selectedPlanCode[\s\S]*termMonths: selectedTermMonths[\s\S]*\}\)/,
  'registration should redirect to the membership page with selected plan params',
)
assert.match(
  source,
  /navigate\([\s\S]*buildMembershipPath[\s\S]*replace: true/,
  'registration should replace history when entering membership',
)
assert.doesNotMatch(source, /RegisterPlanDialog/, 'registration must not open a separate plan dialog')
assert.doesNotMatch(source, /step === 'plan'/, 'registration must not keep an inline plan step')

assert.match(
  stylesSource,
  /\.x1-register-actions \.x1-portal__btn-primary\s*\{[\s\S]*margin-top\s*:\s*0\b/,
  'workspace submit button should align with the action row instead of inheriting the generic top margin',
)

console.log('RegisterPage contract passed')
