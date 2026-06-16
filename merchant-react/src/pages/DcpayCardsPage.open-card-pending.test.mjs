import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, "DcpayCardsPage.tsx"), "utf8")
const styles = readFileSync(join(dir, "dcpay-cards-page.css"), "utf8")
const openDialogBlocks = [...styles.matchAll(/\.dcpay-open-dialog\s*\{([^}]*)\}/g)].map(match => match[1])

assert.match(source, /const openCardProcessing = openCardM\.isPending/, "open card pending state should be named and reusable")
assert.match(
  source,
  /BillingAPI\.dcpayCardOpenCard\(\{[\s\S]*card_manage_id:\s*product\.card_manage_id[\s\S]*idempotency_key:\s*dcpayIdempotencyKey\('dcpay_open',\s*product\.card_manage_id\)[\s\S]*\}\)/,
  "open-card requests should send a fresh dcpay_open idempotency key scoped to the card segment",
)
assert.match(source, /onOpenChange=\{\(open\) => !openCardProcessing && setOpenProductsDialog\(open\)\}/, "open-card dialog should not close while opening")
assert.match(source, /className="dcpay-open-dialog__processing"/, "open-card dialog should render a blocking processing mask")
assert.match(source, /role="status"/, "processing mask should expose status semantics")
assert.match(source, /aria-live="polite"/, "processing mask should announce progress politely")
assert.match(source, /开卡处理中/, "processing mask should tell users the card is being opened")
assert.match(styles, /\.dcpay-open-dialog__processing\s*\{[\s\S]*position:\s*absolute/, "processing mask should cover the open-card dialog")
assert.match(styles, /\.dcpay-open-dialog__spinner\s*\{[\s\S]*animation:\s*dcpay-open-spin/, "processing mask should include an animated spinner")
assert.match(styles, /@keyframes dcpay-open-spin/, "spinner animation keyframes should be defined")
assert.ok(openDialogBlocks.length > 0, "open-card dialog should have local sizing styles")
assert.equal(
  openDialogBlocks.some(block => /position\s*:/.test(block)),
  false,
  "open-card dialog must not override DialogContent positioning",
)

console.log("DCPay open-card pending mask contract passed")
