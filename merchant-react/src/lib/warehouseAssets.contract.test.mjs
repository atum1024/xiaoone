import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'warehouseAssets.ts'), 'utf8')

assert.match(source, /export type WarehouseAssetPreviewFailureReason/, 'warehouse preview failures should be typed for diagnostics')
assert.match(source, /reason: WarehouseAssetPreviewFailureReason/, 'preview resolver should return a diagnostic failure reason')
assert.match(source, /status: resp\.status/, 'preview resolver should preserve HTTP status for failed preview candidates')
assert.match(source, /export function warehouseAssetPlaybackUrl/, 'video playback should use a dedicated playback URL helper')
assert.match(source, /function attachmentPreviewEndpoint/, 'user-upload image previews should use a same-origin proxy endpoint')
assert.match(source, /const WAREHOUSE_PREVIEW_CACHE_NAME/, 'preview resolver should define a browser-local preview cache')
assert.match(source, /caches\.open\(WAREHOUSE_PREVIEW_CACHE_NAME\)/, 'preview resolver should use Cache Storage for reusable preview blobs')

function functionBody(name) {
  const plainMarker = 'export function ' + name
  const asyncMarker = 'export async function ' + name
  const plainStart = source.indexOf(plainMarker)
  const asyncStart = source.indexOf(asyncMarker)
  const marker = asyncStart !== -1 ? asyncMarker : plainMarker
  const start = asyncStart !== -1 ? asyncStart : plainStart
  assert.notEqual(start, -1, name + ' should be exported')
  const next = source.indexOf('\nexport ', start + marker.length)
  return source.slice(start, next === -1 ? source.length : next)
}


const previewBody = functionBody('warehouseAssetPreviewCandidates')
assert.match(previewBody, /asset\.thumbnail_url[\s\S]*asset\.cover_url[\s\S]*asset\.preview_url/, 'preview candidates should prefer lightweight thumbnail and cover URLs before full media URLs')
assert.match(
  previewBody,
  /asset\.preview_url[\s\S]*\.\.\.fullMediaPreviewUrls/,
  'asset.preview_url should be ordered before full media URLs so upload proxy previews win',
)
assert.match(
  previewBody,
  /const proxyUrls = asset\.kind === 'video' \? \[\] : warehouseAssetPreviewProxyUrls\(asset\)[\s\S]*const directUrls = uniqueUrls/,
  'video preview candidates should skip full media proxy endpoints while image previews use preview-safe same-origin proxies',
)
assert.match(
  previewBody,
  /return uniqueUrls\(\[\.\.\.proxyUrls, \.\.\.directUrls\]\)/,
  'preview candidates should prefer same-origin proxy URLs before external media URLs',
)

assert.match(
  previewBody,
  /const fullMediaPreviewUrls = asset\.kind === 'video' \? \[\] : \[asset\.url, asset\.download_url\]/,
  'video preview candidates must not fall back to full media URLs before user playback',
)

assert.match(
  source,
  /if \(asset\.kind === 'video'\)[\s\S]*type\.startsWith\('image\/'\)/,
  'video previews should accept image cover blobs, not require video blobs',
)


const mediaSourceBody = functionBody('resolveWarehouseAssetMediaSource')
assert.match(
  mediaSourceBody,
  /fetchWarehouseAsset\(url/,
  'modal media source resolver should fetch protected same-origin asset URLs through authFetch',
)
assert.match(
  mediaSourceBody,
  /URL\.createObjectURL\(blob\)/,
  'modal media source resolver should convert fetched protected assets to object URLs for native media elements',
)
assert.match(
  mediaSourceBody,
  /revoke: true/,
  'modal media source resolver should tell callers to revoke generated object URLs',
)

const downloadBody = functionBody('warehouseAssetDownloadCandidates')
assert.match(
  downloadBody,
  /\.filter\(url => !isExternalHttpUrl\(url\)\)/,
  'download candidates should exclude external HTTP URLs and use same-origin proxies',
)
assert.match(
  source,
  /export async function warehouseAssetToFile\(asset: AgentMaterialAsset\)[\s\S]*warehouseAssetDownloadCandidates\(asset\)/,
  'warehouse asset file conversion should use the same download candidate order',
)

console.log('warehouseAssets candidate contract passed')
