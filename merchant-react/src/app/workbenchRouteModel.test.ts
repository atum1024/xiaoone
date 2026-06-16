import assert from 'node:assert/strict'

import {
  activeNewConversationCard,
  resolveWorkbenchRoute,
  routeForModule,
  routeForThread,
} from './workbenchRouteModel'

function pickRoute(pathname: string, search = '') {
  const route = resolveWorkbenchRoute(pathname, search)
  assert.ok(route, `expected ${pathname} to resolve`)
  return {
    kind: route.kind,
    pageKind: route.pageKind,
    moduleId: route.moduleId,
    domain: route.domain,
    entry: route.entry,
    modeKey: route.modeKey,
    threadId: route.threadId,
    cardId: route.cardId,
    routeContextKey: route.routeContextKey,
    canonicalPath: route.canonicalPath,
    isLegacyPath: route.isLegacyPath,
  }
}

assert.deepEqual(pickRoute('/workbench'), {
  kind: 'page',
  pageKind: 'home',
  moduleId: 'newChat',
  domain: 'general',
  entry: 'consultant',
  modeKey: null,
  threadId: null,
  cardId: null,
  routeContextKey: 'agent:newChat:dashboard',
  canonicalPath: '/workbench',
  isLegacyPath: false,
})

assert.deepEqual(pickRoute('/workbench/assistant'), {
  kind: 'agent',
  pageKind: 'new',
  moduleId: 'consultant',
  domain: 'general',
  entry: 'consultant',
  modeKey: null,
  threadId: null,
  cardId: 'xiaoone',
  routeContextKey: 'agent:consultant:assistant',
  canonicalPath: '/workbench/assistant',
  isLegacyPath: false,
})

assert.deepEqual(pickRoute('/workbench/consultant'), {
  kind: 'agent',
  pageKind: 'new',
  moduleId: 'consultant',
  domain: 'general',
  entry: 'consultant',
  modeKey: null,
  threadId: null,
  cardId: 'xiaoone',
  routeContextKey: 'agent:consultant:assistant',
  canonicalPath: '/workbench/assistant',
  isLegacyPath: true,
})

assert.deepEqual(pickRoute('/workbench/marketing/image'), {
  kind: 'agent',
  pageKind: 'new',
  moduleId: 'marketingImage',
  domain: 'marketing',
  entry: 'marketing',
  modeKey: 'image',
  threadId: null,
  cardId: 'marketingImage',
  routeContextKey: 'agent:marketingImage:image',
  canonicalPath: '/workbench/marketing/image',
  isLegacyPath: false,
})

assert.deepEqual(pickRoute('/workbench/marketing/video/threads/t-video'), {
  kind: 'agent',
  pageKind: 'detail',
  moduleId: 'marketingVideo',
  domain: 'marketing',
  entry: 'marketing',
  modeKey: 'video',
  threadId: 't-video',
  cardId: 'marketingVideo',
  routeContextKey: 'agent:marketingVideo:video:thread:t-video',
  canonicalPath: '/workbench/marketing/video',
  isLegacyPath: false,
})

assert.deepEqual(pickRoute('/workbench/automation'), {
  kind: 'agent',
  pageKind: 'new',
  moduleId: 'automation',
  domain: 'general',
  entry: 'automation',
  modeKey: null,
  threadId: null,
  cardId: null,
  routeContextKey: 'agent:automation:automation',
  canonicalPath: '/workbench/automation',
  isLegacyPath: false,
})

assert.equal(activeNewConversationCard('/workbench'), null)
assert.equal(activeNewConversationCard('/workbench/assistant'), 'xiaoone')
assert.equal(activeNewConversationCard('/workbench/system'), 'software')
assert.equal(activeNewConversationCard('/workbench/marketing/image'), 'marketingImage')
assert.equal(activeNewConversationCard('/workbench/marketing/video'), 'marketingVideo')
assert.equal(activeNewConversationCard('/workbench/marketing/video/threads/t-video'), null)
assert.equal(activeNewConversationCard('/workbench/marketing/copy'), 'marketingCopy')
assert.equal(activeNewConversationCard('/workbench/generation-assets'), null)

assert.equal(routeForModule('newChat'), '/workbench/assistant')
assert.equal(routeForModule('consultant'), '/workbench/assistant')
assert.equal(routeForModule('marketingImage'), '/workbench/marketing/image')
assert.equal(routeForModule('marketingVideo'), '/workbench/marketing/video')
assert.equal(routeForModule('marketingCopy'), '/workbench/marketing/copy')
assert.equal(routeForModule('automation'), '/workbench/automation')

assert.equal(
  routeForThread({ id: 'thread-video', domain: 'marketing', mode_key: 'video' }),
  '/workbench/marketing/video/threads/thread-video',
)
assert.equal(
  routeForThread({ id: 'thread-assistant', domain: 'general', plugin_key: 'xiaowan-asst' }),
  '/workbench/assistant/threads/thread-assistant',
)
assert.equal(
  routeForThread({ id: 'thread-consultant', domain: 'general', plugin_key: 'consultant' }),
  '/workbench/assistant/threads/thread-consultant',
)
assert.equal(
  routeForThread({ id: 'thread-auto', domain: 'general', plugin_key: 'hot-product' }),
  '/workbench/automation/threads/thread-auto',
)

console.log('Workbench route model contract passed')
