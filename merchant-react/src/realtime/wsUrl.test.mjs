import assert from 'node:assert/strict'
import { buildChatWsUrl } from './wsUrl.ts'

assert.equal(
  buildChatWsUrl({
    explicit: 'wss://ws.xiaoone.cn/ws/team/',
    fallbackOrigin: 'wss://vip.xiaoone.cn',
    path: '/ws/team/',
    params: { token: 't' },
  }),
  'wss://ws.xiaoone.cn/ws/team/?token=t',
)

assert.equal(
  buildChatWsUrl({
    explicit: 'wss://ws-staging.xiaoone.cn/ws/team/',
    fallbackOrigin: 'wss://vip-staging.xiaoone.cn',
    path: '/ws/team/',
    params: { token: 't' },
  }),
  'wss://ws-staging.xiaoone.cn/ws/team/?token=t',
)

assert.equal(
  buildChatWsUrl({
    explicit: 'wss://other.example/ws/team/',
    fallbackOrigin: 'wss://vip.xiaoone.cn',
    path: '/ws/team/',
    params: { token: 't' },
  }),
  'wss://vip.xiaoone.cn/ws/team/?token=t',
)

assert.equal(
  buildChatWsUrl({
    explicit: 'wss://ws.xiaoone.cn/ws/agent/',
    fallbackOrigin: 'wss://vip.xiaoone.cn',
    path: '/ws/agent/',
    params: { token: 't' },
  }),
  'wss://ws.xiaoone.cn/ws/agent/?token=t',
)
