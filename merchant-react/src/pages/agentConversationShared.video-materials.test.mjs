import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, "agentConversationShared.ts"), "utf8")

function functionBody(name) {
  const start = source.indexOf("export function " + name + "(")
  if (start < 0) throw new Error(name + " is missing")
  const bodyStart = source.indexOf("{", start)
  let depth = 0
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1
    if (source[i] === "}") depth -= 1
    if (depth === 0) return source.slice(bodyStart + 1, i)
  }
  throw new Error(name + " body is incomplete")
}

const stripBody = functionBody("stripTransientVideoReferenceOptions")
if (!stripBody.includes("portraitRefs") || !stripBody.includes("next.reference_images = portraitRefs")) {
  throw new Error("persistent video options should preserve virtual portrait defaults")
}

const clearBody = functionBody("clearVideoComposerMaterials")
if (!/delete\s+next\.reference_images/.test(clearBody)) {
  throw new Error("sent video materials must clear selected virtual portrait/reference images")
}
if (!/delete\s+next\.reference_assets/.test(clearBody)) {
  throw new Error("sent video materials must clear selected reference assets")
}
if (clearBody.includes("stripTransientVideoReferenceOptions(")) {
  throw new Error("send cleanup must not reuse persistent video reference preservation")
}

console.log("agentConversationShared video material cleanup contract ok")
