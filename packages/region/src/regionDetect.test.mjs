import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultLocaleForRegion, merchantSubdomainFqdn, regionFromHostname } from './regionDetect.ts'
import { localIpRegionHeaders } from './localIpRegionDebug.ts'

test('regionFromHostname detects mainland cn domain', () => {
  assert.equal(regionFromHostname('api.xiaoone.cn'), 'mainland')
  assert.equal(regionFromHostname('www.xiaoone.cn'), 'mainland')
})

test('regionFromHostname returns null for unknown hosts', () => {
  assert.equal(regionFromHostname('vip.example.com'), null)
  assert.equal(regionFromHostname('localhost'), null)
})

test('defaultLocaleForRegion maps region to locale', () => {
  assert.equal(defaultLocaleForRegion('mainland'), 'zh')
  assert.equal(defaultLocaleForRegion('overseas'), 'en')
})

test('merchantSubdomainFqdn uses cn product root', () => {
  assert.equal(merchantSubdomainFqdn('acme'), 'acme.xiaoone.cn')
})

test('localIpRegionHeaders maps simulated region to dev headers', () => {
  assert.deepEqual(localIpRegionHeaders('mainland'), {
    'X-Dev-Region': 'mainland',
    'X-Dev-Country': 'CN',
  })
  assert.deepEqual(localIpRegionHeaders('overseas'), {
    'X-Dev-Region': 'overseas',
    'X-Dev-Country': 'US',
  })
})
