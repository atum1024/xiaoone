import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(dir, 'KefuStoresPage.tsx'), 'utf8')

// Store management no longer owns the product concept. The stores page must stay
// store-only; the "产品或服务" knowledge concept lives in the uploads tab, not here.
const forbidden = [
  'ProductAPI',
  'ProductFormState',
  'productForm',
  "from '../lib/warehouseAssets'",
  'warehouseAssetPreviewCandidates',
  'warehouseAssetToFile',
]
for (const snippet of forbidden) {
  if (source.includes(snippet))
    throw new Error(`KefuStoresPage.tsx should no longer manage products: ${snippet}`)
}

console.log('KefuStoresPage store-only contract passed')

const kefuCatalog = readFileSync(join(dir, '../i18n/catalog/kefu.ts'), 'utf8')
const storeZhProductLeak = kefuCatalog.match(/'kefu\.stores\.[^']+': '[^']*商品[^']*'/g) || []
if (storeZhProductLeak.length)
  throw new Error(`Kefu store catalog should say 产品/服务, not 商品: ${storeZhProductLeak.join('; ')}`)
