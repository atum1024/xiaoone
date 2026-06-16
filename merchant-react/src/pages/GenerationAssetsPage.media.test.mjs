import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'GenerationAssetsPage.tsx'), 'utf8')
const asyncImageSource = readFileSync(join(dir, '../components/AsyncImage.tsx'), 'utf8')
const asyncImageCss = readFileSync(join(dir, '../components/async-image.css'), 'utf8')

const required = [
  "from '../lib/warehouseAssets'",
  'warehouseAssetPreviewCandidates',
  'warehouseAssetPlaybackUrl',
  'resolveWarehouseAssetMediaSource',
  'warehouseAssetDownloadCandidates',
  'warehouseAssetFileName',
  'const PREVIEW_RESOLVE_CONCURRENCY = 6',
  'async function downloadBlobUrl',
  'for (const url of warehouseAssetDownloadCandidates(asset))',
  'await downloadBlobUrl(url, asset, t)',
  'function closeMediaPreview()',
  'async function openMediaPreview(asset: AgentMaterialAsset',
  'const resolved = await resolveWarehouseAssetMediaSource(asset',
  'mediaPreviewObjectUrlRef.current',
  'mediaPreviewVideoRef.current',
  'video.pause()',
  "video.removeAttribute('src')",
  'video.load()',
  'mediaPreviewVideoRef.current = null',
  'setMediaPreview(null)',
  'onOpenChange={(open) => !open && closeMediaPreview()}',
  'warehouseAssetPreviewCandidates(asset)',
  'resolvePreviewPool(previewItems',
  'const [previewFailures, setPreviewFailures]',
  'function closeMediaPreview()',
  'onError={() => void handlePreviewError(asset)}',
  'gap-asset-placeholder--failed',
  'previewFailureLabel(previewFailures[asset.id]',
  'onFailed: (assetId, failure)',
  '<Play size={18} aria-hidden />',
]

assert.match(
  source,
  /import \{[^}]*Play[^}]*\} from 'lucide-react'/,
  'GenerationAssetsPage should use a lucide Play icon for the video play affordance',
)
assert.ok(
  asyncImageCss.includes('async-image-shimmer'),
  'AsyncImage should keep a modern shimmer loading state after spinner removal',
)
assert.ok(
  readFileSync(join(dir, 'generation-assets-page.css'), 'utf8').includes('.gap-gallery-item__play'),
  'Video gallery cards should style the play affordance as an overlay control',
)

for (const snippet of required) {
  if (!source.includes(snippet)) {
    throw new Error(`GenerationAssetsPage.tsx is missing warehouse media behavior: ${snippet}`)
  }
}


assert.match(
  source,
  /const directVideoCover = asset\.kind === 'video'[\s\S]*warehouseAssetRequestUrl\(asset\.cover_url \|\| asset\.thumbnail_url \|\| ''\)[\s\S]*const videoCover = directVideoCover \|\| preview/,
  'Video cards must render cover images from cover_url/thumbnail_url/preview, not the full video asset',
)
assert.match(
  source,
  /warehouseAssetPlaybackUrl\(asset\)/,
  'Video playback should resolve through a dedicated playback URL only when the user opens the video',
)
assert.ok(
  !source.includes('<video src={preview} muted loop playsInline'),
  'GenerationAssetsPage must not attach full video URLs to gallery cards',
)
assert.ok(
  !asyncImageSource.includes('async-image__spinner'),
  'AsyncImage loading state should use skeleton/shimmer, not a circular spinner element',
)
assert.ok(
  !asyncImageCss.includes('@keyframes async-image-spin') && !asyncImageCss.includes('border-top-color'),
  'AsyncImage CSS should not define circular spinner animation styles',
)
assert.match(
  source,
  /function previewFailureLabel\([\s\S]*status === 410[\s\S]*sourceUnavailable[\s\S]*status === 404[\s\S]*sourceMissing[\s\S]*reason === 'no_candidate'[\s\S]*noCover/,
  'GenerationAssetsPage should show specific preview failure labels for missing files, unavailable source, and missing covers',
)

if (source.includes('window.open(url')) {
  throw new Error('GenerationAssetsPage should not window.open media URLs for downloads')
}


assert.ok(
  !source.includes("setMediaPreview({ kind: 'video', url: playableUrl"),
  'Video playback dialog must not assign protected artifact URLs directly to <video>',
)
assert.ok(
  !source.includes("setMediaPreview({ kind: 'image', url: fullUrl"),
  'Image preview dialog must not assign protected artifact URLs directly to <img>',
)

const directPreviewHelpers = ['function generationTaskArtifactUrl(asset: AgentMaterialAsset)', 'function assetPreviewCandidates(asset: AgentMaterialAsset)', 'function previewBlobIsUsable(asset: AgentMaterialAsset, blob: Blob)']
for (const snippet of directPreviewHelpers) {
  if (source.includes(snippet)) {
    throw new Error(`GenerationAssetsPage should use warehouseAssets helper instead of local duplicate: ${snippet}`)
  }
}

console.log('GenerationAssetsPage media preview cleanup check passed')


assert.ok(
  source.includes("gap-gallery-item__button--placeholder"),
  "GenerationAssetsPage should include gap-gallery-item__button--placeholder",
)

assert.ok(
  source.includes("const canPlay = Boolean(playableUrl)"),
  "GenerationAssetsPage should include const canPlay = Boolean(playableUrl)",
)
