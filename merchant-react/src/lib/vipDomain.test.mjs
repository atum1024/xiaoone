import assert from 'node:assert/strict'
import { isVipPublicHost } from './vipDomain.ts'

assert.equal(isVipPublicHost('vip.xiaoone.cn'), true)
assert.equal(isVipPublicHost('VIP.XIAOONE.CN'), true)
assert.equal(isVipPublicHost('vip-staging.xiaoone.cn'), true)
assert.equal(isVipPublicHost('xiaoone.cn'), false)
assert.equal(isVipPublicHost('admin.xiaoone.cn'), false)
