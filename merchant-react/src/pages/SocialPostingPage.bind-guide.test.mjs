import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, "SocialPostingPage.tsx"), "utf8")

assert.ok(!source.includes("/workbench/assistant?draft="), "beginner social bind guide must stay inside social posting instead of opening the generic xiaoone assistant")
assert.match(source, /const \[socialBindGuideOpen, setSocialBindGuideOpen\] = useState\(false\)/, "social posting should own the beginner guide dialog state")
assert.match(source, /guidePrompt\(bindGuideLabel/, "guide dialog should render the platform-specific bind guide in this module")
assert.match(source, /automation\.social\.bindTimeout/, "bind startup timeout should show retry and manual path copy")

const platformTabsStart = source.indexOf('<nav className="social-platform-tabs"')
assert.notEqual(platformTabsStart, -1, "social posting should render the top platform tab rail")
const platformTabsEnd = source.indexOf('</nav>', platformTabsStart)
assert.notEqual(platformTabsEnd, -1, "social platform tab rail should close its nav")
const platformTabsSource = source.slice(platformTabsStart, platformTabsEnd)
assert.ok(
  platformTabsSource.includes('void openSocialBindTab()'),
  "clicking an unlinked top platform tab should immediately open the social binding tab",
)
assert.ok(
  !platformTabsSource.includes('setBindChoicePlatform(option.value)'),
  "clicking an unlinked top platform tab should not open the local bind-choice dialog first",
)
assert.ok(
  !source.includes("window.open('', '_blank')"),
  "social binding should not create a temporary blank tab before the Ayrshare URL is ready",
)
assert.ok(
  !source.includes('window.location.assign(start.linking_url)'),
  "social binding must not redirect the current page when opening the Ayrshare tab fails",
)
assert.match(
  source,
  /window\.open\(socialBindRedirectHref\(\), '_blank'\)/,
  "social binding should open a same-origin redirect page directly in the new tab",
)
assert.match(
  source,
  /export function SocialBindRedirectPage\(\)/,
  "the same-origin redirect page should be exported for the router",
)
assert.match(
  source,
  /window\.location\.replace\(start\.linking_url\)/,
  "the redirect page should navigate its own tab to Ayrshare after the link API returns",
)

assert.match(
  source,
  /function packPostAccountDetail\([\s\S]*fallbackBindings: SocialPlatformAccountBinding\[\]/,
  "posted pack account metadata should accept platform account fallbacks",
)
assert.match(
  source,
  /const packPlatformBindings = \(pack\.platforms \|\| \[\]\)[\s\S]*platformBindings\.get\(platform\)\?\.\[0\]/,
  "pack cards should derive same-platform account fallbacks from linked accounts",
)
assert.match(
  source,
  /packPostAccountDetail\(pack, packAccountBinding, packPlatformBindings, t, tpl\)/,
  "pack cards should show the platform account fallback instead of an unsynced label",
)

assert.match(
  source,
  /deleteSocialPack/,
  "social packs should expose a delete API client",
)
assert.match(
  source,
  /type: 'publish' \| 'unbind' \| 'deletePack'/,
  "the shared confirm dialog should support deleting packs as a confirmed action",
)
assert.match(
  source,
  /const deletePack = async \(pack: SocialMaterialPack\)/,
  "pack deletion should be triggered from a dedicated handler",
)
assert.match(
  source,
  /setConfirmAction\(\{ type: 'deletePack', pack \}\)/,
  "clicking delete should open the second-confirmation dialog before mutation",
)
assert.match(
  source,
  /await deleteSocialPack\(pack\.id\)[\s\S]*await loadPacks\(\)/,
  "confirmed deletion should call the pack delete API and refresh the list",
)
assert.match(
  source,
  /social-pack-delete-button[\s\S]*deletePack\(pack\)/,
  "each social pack card should render a delete action",
)


console.log("Social posting bind guide contract passed")
