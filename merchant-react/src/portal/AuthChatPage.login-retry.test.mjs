import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'AuthChatPage.tsx'), 'utf8')

const restartMatch = source.match(
  /const\s+restartLoginIdentityFlow\s*=\s*useCallback\(\(errorText:\s*string\)\s*=>\s*\{([\s\S]*?)\n\s*\},\s*\[appendAssistant,\s*appendError,\s*identifierType,\s*t\]\)/,
)

assert.ok(
  restartMatch,
  'Auth chat should define restartLoginIdentityFlow for failed login verification',
)

const restartBody = restartMatch?.[1] || ''
for (const snippet of [
  "identifierRef.current = ''",
  "passwordRef.current = ''",
  "codeRef.current = ''",
  'appendError(errorText)',
  "setInputKind('identifier')",
  'appendAssistant(',
  "identifierType === 'phone'",
  'portalDict.chatAskIdentifierPhone',
  'portalDict.chatAskIdentifierEmail',
]) {
  assert.ok(
    restartBody.includes(snippet),
    `restartLoginIdentityFlow should include ${snippet}`,
  )
}

const passwordFailureBlock = source.match(
  /catch \(err\) \{\n([\s\S]*?)\n\s*\}\n\s*finally \{\n\s*setBusy\(false\)\n\s*\}\n\s*\}\n\n\s*const handleConfirmPasswordSubmit/,
)
assert.ok(passwordFailureBlock, 'Could not find password login failure block')
assert.match(
  passwordFailureBlock?.[1] || '',
  /restartLoginIdentityFlow\(/,
  'password login verification failure should ask for the account again',
)
assert.doesNotMatch(
  passwordFailureBlock?.[1] || '',
  /setInputKind\('password'\)/,
  'password login verification failure should not keep the user on password input',
)

const smsLoginBlock = source.match(
  /if \(flow === 'sms'\) \{\n\s*setBusy\(true\)\n\s*try \{\n\s*await finishLogin\(\)\n\s*\}\n\s*catch \(err\) \{\n([\s\S]*?)\n\s*\}\n\s*finally \{/,
)
assert.ok(smsLoginBlock, 'Could not find sms login failure block')
assert.match(
  smsLoginBlock?.[1] || '',
  /restartLoginIdentityFlow\(/,
  'sms/email code login verification failure should ask for the account again',
)

console.log('AuthChatPage login retry contract passed')
