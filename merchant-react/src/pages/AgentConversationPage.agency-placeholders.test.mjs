import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const source = [
  readFileSync(join(dir, "agentConversationShared.ts"), "utf8"),
  readFileSync(join(dir, "useAgentConversation.tsx"), "utf8"),
  readFileSync(join(dir, "AgentConversationPage.tsx"), "utf8"),
  readFileSync(join(dir, "AgentNewConversationPage.tsx"), "utf8"),
  readFileSync(join(dir, "AgentConversationDetailPage.tsx"), "utf8"),
].join("\n")
const catalog = readFileSync(join(dir, "../i18n/catalog/composer.ts"), "utf8")

assert.match(source, /function agencyPlaceholderKeyForPlugin/, "agency placeholders should be plugin-specific")
assert.match(source, /conversationCopy\(entry, locale, label, activeMarketingMode, plugin\)/, "conversation copy should recompute from selected agency plugin")
assert.match(source, /composer\.conv\.agency\.plugin\.\$\{placeholderKey\}\.hero/, "agency copy should use plugin-specific hero keys")
assert.match(catalog, /composer\.conv\.agency\.plugin\.enterprise\.hero/, "composer catalog should include enterprise placeholder")
assert.match(catalog, /composer\.conv\.agency\.plugin\.logistics\.hero/, "composer catalog should include logistics placeholder")
assert.match(catalog, /composer\.conv\.agency\.plugin\.software-dev\.thread/, "composer catalog should include software development thread placeholder")

console.log("Agent conversation agency placeholder contract passed")
