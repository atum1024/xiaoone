import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const composer = readFileSync(new URL("./composer.ts", import.meta.url), "utf8")
const component = readFileSync(new URL("../components/XiaooneComposer.tsx", import.meta.url), "utf8")
const css = readFileSync(new URL("../components/XiaooneComposer.css", import.meta.url), "utf8")

const agencyKeys = [
  "enterprise",
  "license",
  "logistics",
  "settlement",
  "software-dev",
  "tax-consult",
  "mini-program",
  "domestic-app",
  "apple-store",
  "google-play",
]

for (const key of agencyKeys) {
  assert.ok(composer.includes("key: '" + key + "'"), key + " should be present in agency plugins")
  assert.ok(
    composer.includes("coverImage: '/agency-template-covers/" + key + ".jpg'"),
    key + " should define an agency cover image",
  )
}

assert.match(component, /className="cx-plugin-cover-image"/, "plugin cards should render cover images")
assert.match(css, /\.cx-plugin-cover-image/, "plugin cover images should be styled")

console.log("Agency cover image contract passed")
