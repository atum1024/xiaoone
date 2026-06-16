import assert from 'node:assert/strict'
import { getPublicSiteHomeHref, getPublicSiteOrigin } from './publicSite.ts'

function setLocation(hostname, protocol = 'https:') {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        hostname,
        protocol,
        origin: `${protocol}//${hostname}`,
      },
    },
  })
}

setLocation('vip.xiaoone.cn')
assert.equal(getPublicSiteOrigin(), 'https://xiaoone.cn')
assert.equal(getPublicSiteHomeHref(), 'https://xiaoone.cn/')

setLocation('admin-staging.xiaoone.cn')
assert.equal(getPublicSiteOrigin(), 'https://staging.xiaoone.cn')

setLocation('legacy-vip.xiaoone.ai')
assert.equal(getPublicSiteOrigin(), 'https://legacy-vip.xiaoone.ai')
