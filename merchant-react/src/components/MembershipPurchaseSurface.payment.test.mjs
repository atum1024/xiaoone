import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const componentDir = dirname(fileURLToPath(import.meta.url))
const srcDir = join(componentDir, '..')

function wechatBlock(source, nextMarker) {
  const start = source.indexOf("if (purchaseChannel === 'wechat_pay')")
  assert.ok(start >= 0, 'Missing WeChat Pay branch')
  const end = source.indexOf(nextMarker, start)
  assert.ok(end > start, `Missing branch marker ${nextMarker}`)
  return source.slice(start, end)
}

function assertWechatPaidIntentNavigates(source, nextMarker, label) {
  const block = wechatBlock(source, nextMarker)
  assert.match(
    block,
    /if \(isCheckoutPaid\(intent\)\) \{[\s\S]*navigate\(`\/billing\/success\?order_id=\$\{encodeURIComponent\(intent\.checkout_id\)\}`\)[\s\S]*return[\s\S]*\}/,
    `${label} should navigate only after the checkout intent is already paid`,
  )
}

function assertWechatQrIntentStaysInDialog(source, nextMarker, label) {
  const block = wechatBlock(source, nextMarker)
  assert.match(
    block,
    /if \(intent\.qr_svg \|\| intent\.code_url\) \{[\s\S]*setWechatPayIntent\(intent\)[\s\S]*return\s*\}/,
    `${label} should keep the QR-code case inside the purchase dialog`,
  )
}

function assertWechatUnknownIntentDoesNotNavigate(source, nextMarker, label) {
  const block = wechatBlock(source, nextMarker)
  assertWechatPaidIntentNavigates(source, nextMarker, label)
  assertWechatQrIntentStaysInDialog(source, nextMarker, label)
  assert.doesNotMatch(
    block,
    /if \(intent\.qr_svg \|\| intent\.code_url\) \{[\s\S]*return\s*\}\s*navigate\(`\/billing\/success\?order_id=/,
    `${label} must not navigate to success when the WeChat intent is neither paid nor displayable`,
  )
  assert.match(
    block,
    /toast\(\{[\s\S]*title: t\('account\.billing\.toastPurchaseFailed'\)[\s\S]*description: t\('account\.membership\.toastRetryLater'\)[\s\S]*\}\)/,
    `${label} should show a retryable error when the WeChat intent is neither paid nor displayable`,
  )
}

const membershipPurchaseSource = readFileSync(join(componentDir, 'MembershipPurchaseSurface.tsx'), 'utf8')
const planPurchaseSource = readFileSync(join(srcDir, 'pages/PlanPurchasePage.tsx'), 'utf8')
const billingPanelSource = readFileSync(join(srcDir, 'panels/account/BillingPanel.tsx'), 'utf8')
assertWechatUnknownIntentDoesNotNavigate(membershipPurchaseSource, "if (purchaseChannel === 'cardixon')", 'MembershipPurchaseSurface')
assertWechatUnknownIntentDoesNotNavigate(planPurchaseSource, "if (purchaseChannel === 'alipay')", 'PlanPurchasePage')

for (const [source, label] of [
  [membershipPurchaseSource, 'MembershipPurchaseSurface'],
  [planPurchaseSource, 'PlanPurchasePage'],
  [billingPanelSource, 'BillingPanel'],
]) {
  assert.match(
    source,
    /payableChannelsFromCapabilities\(capabilities\)/,
    `${label} should derive visible payment choices from billing capabilities, not visitor-region metadata`,
  )
  assert.doesNotMatch(
    source,
    /paymentChannels\.filter\(ch => isPayableChannelCode\(ch\.code\)\)/,
    `${label} must not render payment choices from public visitor-region paymentChannels`,
  )
}

for (const [value, label] of [['195', 'TRON'], ['56', 'BSC'], ['1', 'ETH']]) {
  assert.match(
    membershipPurchaseSource,
    new RegExp(`<SelectItem value=\"${value}\">${label}</SelectItem>`),
    `MembershipPurchaseSurface should expose ${label} as a selectable Cardixon chain`,
  )
}

const sharedSelectSource = readFileSync(join(srcDir, '../../packages/react-ui/src/components/select.tsx'), 'utf8')
assert.match(
  sharedSelectSource,
  /"relative z-\[60\][^"]*max-h-96/,
  'shared SelectContent should stack above the z-index 50 dialog layer when opened inside purchase dialogs',
)

const paymentWindowSource = readFileSync(join(srcDir, 'lib/paymentWindow.ts'), 'utf8')
assert.match(
  paymentWindowSource,
  /const configured = \['wechat_pay', 'alipay', 'cardixon'\]\.find\(code => channels\[code\]\?\.enabled\)/,
  'preferredPayableChannel should first use an enabled configured channel',
)
assert.match(
  paymentWindowSource,
  /const regionalFallback = \['cardixon', 'alipay', 'wechat_pay'\]\.find\(code => code in channels\)/,
  'preferredPayableChannel should fall back to a visible regional channel, so overseas Cardixon does not become a hidden WeChat action',
)

console.log('WeChat membership payment intent contract passed')
