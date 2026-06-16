import type { SDKConfig as SdkConfigRow } from '@xiaoone/chat-kit'
import type { KefuTranslate, KefuTpl } from '../i18n/catalog/kefu'

export type { KefuTranslate, KefuTpl }

export type SdkConfigView = SdkConfigRow & {
  merchant_id?: number
  app_secret?: string
  visitor_entry_url?: string
  merchant_display_label?: string
  visitor_channel_label?: string
  allowed_origins?: string
  store?: number
  store_name?: string
}

export const PUBLIC_CHAT_API = {
  method: 'POST',
  path: '/api/v1/chat/visitor/handshake/',
} as const

export function getPublicChatApi(t: KefuTranslate) {
  return {
    ...PUBLIC_CHAT_API,
    title: t('kefu.integration.publicApi.title'),
    note: t('kefu.integration.publicApi.note'),
  }
}

export function getGlossary(t: KefuTranslate): Record<string, string> {
  return {
    app_id: t('kefu.integration.glossary.appId'),
    api_key: t('kefu.integration.glossary.apiKey'),
    visitor_token: t('kefu.integration.glossary.visitorToken'),
    'conversation.id': t('kefu.integration.glossary.conversationId'),
    allowed_origins: t('kefu.integration.glossary.allowedOrigins'),
    visitor_key: t('kefu.integration.glossary.visitorKey'),
    client_message_id: t('kefu.integration.glossary.clientMessageId'),
  }
}

export type GuideSnippet = {
  lang: string
  label: string
  code: string
}

export type GuideStep = {
  title: string
  explain: string
  snippets?: GuideSnippet[]
}

export type GuideMethod = {
  id: 'widget' | 'rest'
  title: string
  tabLabel: string
  plainIntro: string
  steps: GuideStep[]
}

export type GuideFieldRow = {
  field: string
  required: string
  description: string
}

export type GuideWsEventRow = {
  direction: 'client' | 'server'
  type: string
  fields: string
  description: string
}

export type GuideErrorRow = {
  http: string
  code: string
  fix: string
}

export type GuideEnvRow = {
  label: string
  value: string
  note?: string
}

export type IntegrationGuide = {
  meta: {
    generatedAt: string
    storeName: string
    appId: string
    merchantId: string
    apiBase: string
    wsBase: string
    widgetUrl: string
    credentialCount: number
    sampleHint?: string
  }
  aiHandoff: {
    headline: string
    instruction: string
  }
  environment: GuideEnvRow[]
  quickTip: string
  security: {
    headline: string
    advanced: string[]
  }
  methods: GuideMethod[]
  handshake: {
    method: string
    url: string
    contentType: string
    authNote: string
    fields: GuideFieldRow[]
    payload: Record<string, string>
    successResponse: object
    curl: string
  }
  restApis: {
    messages: { method: string; url: string; body: object; explain: string }
    history: { method: string; url: string; explain: string }
    attachments: { method: string; url: string; fields: GuideFieldRow[]; explain: string }
  }
  websocket: {
    url: string
    clientEvents: GuideWsEventRow[]
    serverEvents: GuideWsEventRow[]
    sendExample: object
    messageEnvelopeExample: object
  }
  fetchExample: string
  errors: GuideErrorRow[]
  appendix: string[]
  checklist: string[]
  scope: string[]
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || /^10\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    || /^192\.168\./.test(hostname)
  )
}

function registrableRoot(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const parts = host.split('.')
  if (parts.length >= 2)
    return parts.slice(-2).join('.')
  return host
}

/** 公开 REST API 根地址：本地开发保持同源，生产用 api.<根域> */
export function deriveApiOrigin(currentOrigin: string): string {
  if (!currentOrigin.trim())
    return 'https://api.xiaoone.cn'
  try {
    const url = new URL(currentOrigin)
    if (isLocalHostname(url.hostname))
      return url.origin
    return `https://api.${registrableRoot(url.hostname)}`
  }
  catch {
    return currentOrigin.replace(/\/$/, '')
  }
}

/** 访客 WebSocket 根地址：本地用当前 host，生产用 ws.<根域> */
export function deriveWsOrigin(currentOrigin: string): string {
  if (!currentOrigin.trim())
    return 'wss://ws.xiaoone.cn'
  try {
    const url = new URL(currentOrigin)
    if (isLocalHostname(url.hostname)) {
      const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProto}//${url.host}`
    }
    return `wss://ws.${registrableRoot(url.hostname)}`
  }
  catch {
    return 'wss://ws.xiaoone.cn'
  }
}

/** Widget 脚本 URL：与当前商户 web 宿主同源分发 */
export function deriveWidgetUrl(currentOrigin: string): string {
  if (!currentOrigin.trim())
    return 'https://xiaoone.cn/kefu-widget.js'
  return `${currentOrigin.replace(/\/$/, '')}/kefu-widget.js`
}

function sdkValue(row: SdkConfigView | undefined, key: keyof SdkConfigView, fallback: string) {
  const val = row?.[key]
  if (val == null || val === '')
    return fallback
  return String(val)
}

export function buildHandshakePayload(row: SdkConfigView | undefined, t: KefuTranslate) {
  return {
    app_id: row?.app_id || '<app_id>',
    api_key: row?.app_secret ? '<API Key>' : '<api_key>',
    visitor_name: t('kefu.integration.payload.visitorName'),
    visitor_key: 'website-user-001',
    channel: 'official_site',
    locale: 'zh-CN',
    subject: t('kefu.integration.payload.subject'),
  }
}

export function allowedOriginsLabel(row: SdkConfigView | undefined, t: KefuTranslate) {
  const value = sdkValue(row, 'allowed_origins', '')
  if (!value.trim())
    return t('kefu.tech.allowedOriginsPending')
  return value
}

export function sdkInstallSummary(row: SdkConfigView | undefined, origin: string, t: KefuTranslate, tpl: KefuTpl) {
  const storeName = sdkValue(row, 'store_name', t('kefu.integration.sampleStore'))
  const appId = sdkValue(row, 'app_id', t('kefu.common.autoGenerated'))
  const channelLabel = sdkValue(row, 'visitor_channel_label', t('kefu.tech.defaultChannel'))
  const merchantLabel = sdkValue(row, 'merchant_display_label', storeName)
  const entryUrl = sdkValue(row, 'visitor_entry_url', t('kefu.tech.entryFromButton'))
  const apiKeyText = row?.app_secret ? t('kefu.integration.apiKeyGenerated') : t('kefu.common.autoGenerated')
  const apiBase = deriveApiOrigin(origin)
  const wsBase = deriveWsOrigin(origin)
  const widgetUrl = deriveWidgetUrl(origin)

  return [
    t('kefu.integration.summary.title'),
    tpl('kefu.integration.summary.store', storeName),
    tpl('kefu.integration.summary.visitorName', merchantLabel),
    tpl('kefu.integration.summary.entryName', channelLabel),
    tpl('kefu.integration.summary.appId', appId),
    tpl('kefu.integration.summary.apiKey', apiKeyText),
    tpl('kefu.integration.summary.allowedSites', allowedOriginsLabel(row, t)),
    tpl('kefu.integration.summary.visitorEntry', entryUrl),
    tpl('kefu.integration.summary.publicApi', apiBase),
    tpl('kefu.integration.summary.ws', wsBase),
    tpl('kefu.integration.summary.widget', widgetUrl),
    '',
    t('kefu.integration.summary.recommend'),
    t('kefu.integration.summary.autoReply'),
    t('kefu.integration.summary.verify'),
  ].join('\n')
}

export function sdkCredentialText(row: SdkConfigView | undefined, t: KefuTranslate, tpl: KefuTpl) {
  return [
    tpl('kefu.integration.summary.appId', sdkValue(row, 'app_id', t('kefu.common.autoGenerated'))),
    tpl('kefu.integration.summary.apiKey', row?.app_secret || t('kefu.common.autoGenerated')),
  ].join('\n')
}

function widgetScriptSnippet(appId: string, apiBase: string, wsBase: string, widgetUrl: string, t: KefuTranslate) {
  const visitorName = t('kefu.integration.payload.visitorName')
  const subject = t('kefu.integration.payload.subject')
  return [
    `<!-- ${t('kefu.integration.script.comment')} -->`,
    '<script',
    `  src="${widgetUrl}"`,
    '  data-xiaoone-kefu',
    `  data-app-id="${appId}"`,
    '  data-api-key="<API Key>"',
    `  data-api-base-url="${apiBase}"`,
    `  data-ws-base-url="${wsBase}"`,
    `  data-visitor-name="${visitorName}"`,
    '  data-visitor-key="website-user-001"',
    '  data-channel="official_site"',
    '  data-locale="zh-CN"',
    `  data-subject="${subject}"`,
    '></script>',
    `<!-- ${t('kefu.integration.script.optionalFields')} -->`,
  ].join('\n')
}

function widgetMountSnippet(appId: string, apiBase: string, wsBase: string, widgetUrl: string, t: KefuTranslate) {
  const visitorName = t('kefu.integration.payload.visitorName')
  const subject = t('kefu.integration.payload.subject')
  return [
    `<!-- ${t('kefu.integration.script.mountComment')} -->`,
    `<script src="${widgetUrl}"></script>`,
    '<script>',
    '  window.XiaooneKefuWidget.mount({',
    `    appId: ${JSON.stringify(appId)},`,
    "    apiKey: '<API Key>',",
    `    apiBaseUrl: ${JSON.stringify(apiBase)},`,
    `    wsBaseUrl: ${JSON.stringify(wsBase)},`,
    `    visitorName: ${JSON.stringify(visitorName)},`,
    "    visitorKey: 'website-user-001',",
    "    channel: 'official_site',",
    "    locale: 'zh-CN',",
    `    subject: ${JSON.stringify(subject)},`,
    '  })',
    '</script>',
  ].join('\n')
}

function buildWsMessageEnvelopeExample(t: KefuTranslate) {
  return {
    type: 'message',
    message: {
      id: 'msg_xxxxxxxx',
      conversation: '<conversation_id>',
      sender_role: 'agent',
      sender_id: 7001,
      sender_name: t('kefu.integration.example.agentName'),
      content: t('kefu.integration.example.agentGreeting'),
      content_translated: '',
      content_type: 'text',
      metadata: {},
      client_message_id: '',
      created_at: '2026-06-04T12:00:00.000Z',
    },
  }
}

export function buildIntegrationGuide(
  row: SdkConfigView | undefined,
  origin: string,
  t: KefuTranslate,
  tpl: KefuTpl,
  options?: { credentialCount?: number },
): IntegrationGuide {
  const publicChatApi = getPublicChatApi(t)
  const apiBase = deriveApiOrigin(origin)
  const wsBase = deriveWsOrigin(origin)
  const widgetUrl = deriveWidgetUrl(origin)
  const payload = buildHandshakePayload(row, t)
  const endpoint = `${apiBase}${publicChatApi.path}`
  const messageEndpoint = `${apiBase}/api/v1/chat/visitor/messages/`
  const historyEndpoint = `${apiBase}/api/v1/chat/visitor/conversations/<conversation_id>/`
  const attachmentEndpoint = `${apiBase}/api/v1/chat/visitor/conversations/<conversation_id>/attachments/`
  const visitorWsUrl = `${wsBase.replace(/\/$/, '')}/ws/visitor/?conversation=<conversation_id>&token=<visitor_token>`
  const storeName = sdkValue(row, 'store_name', t('kefu.integration.sampleStore'))
  const appId = sdkValue(row, 'app_id', '<app_id>')
  const merchantId = sdkValue(row, 'merchant_id', '<merchant_id>')
  const merchantLabel = sdkValue(row, 'merchant_display_label', storeName)
  const channelLabel = sdkValue(row, 'visitor_channel_label', t('kefu.tech.defaultChannel'))
  const credentialCount = options?.credentialCount ?? 1
  const hasCredential = Boolean(row?.app_id)
  const messageEnvelopeExample = buildWsMessageEnvelopeExample(t)
  const yes = t('kefu.common.required')
  const no = t('kefu.common.optional')
  const dash = t('kefu.common.dash')

  const successResponse = {
    code: 0,
    message: 'ok',
    data: {
      visitor_token: '<visitor_token>',
      visitor_key: '<visitor_identity_key>',
      conversation: {
        id: '<conversation_id>',
        state: 'waiting',
        store_name: storeName,
      },
    },
  }

  const sampleHint = credentialCount > 1 && hasCredential
    ? tpl('kefu.integration.sampleHint', storeName, appId)
    : undefined

  const environment: GuideEnvRow[] = [
    { label: t('kefu.integration.env.publicApi'), value: apiBase },
    { label: t('kefu.integration.env.ws'), value: wsBase },
    { label: t('kefu.integration.env.widget'), value: widgetUrl },
    { label: 'App ID', value: appId },
    { label: 'API Key', value: '<API Key>', note: t('kefu.integration.env.apiKeyNote') },
    { label: t('kefu.integration.env.allowedSites'), value: allowedOriginsLabel(row, t) },
    { label: t('kefu.integration.env.visitorDisplay'), value: merchantLabel },
    { label: t('kefu.integration.env.entryName'), value: channelLabel },
    { label: 'channel', value: 'official_site' },
    { label: 'locale', value: 'zh-CN' },
  ]

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      storeName,
      appId,
      merchantId,
      apiBase,
      wsBase,
      widgetUrl,
      credentialCount,
      sampleHint,
    },
    aiHandoff: {
      headline: t('kefu.integration.aiHandoff.headline'),
      instruction: t('kefu.integration.aiHandoff.instruction'),
    },
    environment,
    quickTip: t('kefu.integration.quickTip'),
    security: {
      headline: t('kefu.integration.security.headline'),
      advanced: [
        t('kefu.integration.security.advanced1'),
        t('kefu.integration.security.advanced2'),
        t('kefu.integration.security.advanced3'),
        t('kefu.integration.security.advanced4'),
      ],
    },
    scope: [
      t('kefu.integration.scope1'),
      t('kefu.integration.scope2'),
      t('kefu.integration.scope3'),
    ],
    methods: [
      {
        id: 'widget',
        title: t('kefu.integration.widget.title'),
        tabLabel: t('kefu.integration.widget.tabLabel'),
        plainIntro: t('kefu.integration.widget.intro'),
        steps: [
          {
            title: t('kefu.integration.widget.step1Title'),
            explain: t('kefu.integration.widget.step1Explain'),
          },
          {
            title: t('kefu.integration.widget.step2Title'),
            explain: t('kefu.integration.widget.step2Explain'),
          },
          {
            title: t('kefu.integration.widget.step3Title'),
            explain: t('kefu.integration.widget.step3Explain'),
            snippets: [
              { lang: 'html', label: t('kefu.integration.widget.snippetInline'), code: widgetScriptSnippet(appId, apiBase, wsBase, widgetUrl, t) },
              { lang: 'html', label: t('kefu.integration.widget.snippetMount'), code: widgetMountSnippet(appId, apiBase, wsBase, widgetUrl, t) },
            ],
          },
          {
            title: t('kefu.integration.widget.step4Title'),
            explain: t('kefu.integration.widget.step4Explain'),
          },
        ],
      },
      {
        id: 'rest',
        title: t('kefu.integration.rest.title'),
        tabLabel: t('kefu.integration.rest.tabLabel'),
        plainIntro: t('kefu.integration.rest.intro'),
        steps: [
          {
            title: t('kefu.integration.rest.step1Title'),
            explain: t('kefu.integration.rest.step1Explain'),
            snippets: [
              { lang: 'bash', label: t('kefu.integration.rest.snippetCurl'), code: `curl -X POST '${endpoint}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(payload)}'` },
              { lang: 'json', label: t('kefu.integration.rest.snippetRequest'), code: JSON.stringify(payload, null, 2) },
              { lang: 'json', label: t('kefu.integration.rest.snippetSuccess'), code: JSON.stringify(successResponse, null, 2) },
            ],
          },
          {
            title: t('kefu.integration.rest.step2Title'),
            explain: t('kefu.integration.rest.step2Explain'),
            snippets: [
              { lang: 'text', label: t('kefu.integration.rest.snippetWsUrl'), code: visitorWsUrl },
              { lang: 'json', label: t('kefu.integration.rest.snippetSend'), code: JSON.stringify({
                type: 'visitor.send',
                content: t('kefu.integration.example.visitorQuestion'),
                client_message_id: 'website-unique-message-id',
              }, null, 2) },
            ],
          },
          {
            title: t('kefu.integration.rest.step3Title'),
            explain: t('kefu.integration.rest.step3Explain'),
            snippets: [
              { lang: 'json', label: t('kefu.integration.rest.snippetSendPost'), code: JSON.stringify({
                conversation: '<conversation_id>',
                token: '<visitor_token>',
                content: t('kefu.integration.example.visitorGreeting'),
                client_message_id: 'website-unique-message-id',
              }, null, 2) },
              { lang: 'text', label: t('kefu.integration.rest.snippetHistoryGet'), code: `${historyEndpoint}?token=<visitor_token>` },
            ],
          },
          {
            title: t('kefu.integration.rest.step4Title'),
            explain: t('kefu.integration.rest.step4Explain'),
            snippets: [
              { lang: 'text', label: t('kefu.integration.rest.snippetUploadPost'), code: attachmentEndpoint },
            ],
          },
        ],
      },
    ],
    handshake: {
      method: publicChatApi.method,
      url: endpoint,
      contentType: 'application/json',
      authNote: t('kefu.integration.handshake.authNote'),
      fields: [
        { field: 'app_id', required: yes, description: t('kefu.integration.handshake.field.appId') },
        { field: 'api_key', required: yes, description: t('kefu.integration.handshake.field.apiKey') },
        { field: 'visitor_name', required: no, description: t('kefu.integration.handshake.field.visitorName') },
        { field: 'visitor_key', required: no, description: t('kefu.integration.handshake.field.visitorKey') },
        { field: 'visitor_email', required: no, description: t('kefu.integration.handshake.field.visitorEmail') },
        { field: 'channel', required: no, description: t('kefu.integration.handshake.field.channel') },
        { field: 'locale', required: no, description: t('kefu.integration.handshake.field.locale') },
        { field: 'subject', required: no, description: t('kefu.integration.handshake.field.subject') },
      ],
      payload,
      successResponse,
      curl: `curl -X POST '${endpoint}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(payload)}'`,
    },
    restApis: {
      messages: {
        method: 'POST',
        url: messageEndpoint,
        body: {
          conversation: '<conversation_id>',
          token: '<visitor_token>',
          content: t('kefu.integration.example.visitorGreeting'),
          client_message_id: 'website-unique-message-id',
        },
        explain: t('kefu.integration.rest.messages.explain'),
      },
      history: {
        method: 'GET',
        url: `${historyEndpoint}?token=<visitor_token>`,
        explain: t('kefu.integration.rest.history.explain'),
      },
      attachments: {
        method: 'POST',
        url: attachmentEndpoint,
        fields: [
          { field: 'token', required: yes, description: t('kefu.integration.rest.attachments.field.token') },
          { field: 'file', required: yes, description: t('kefu.integration.rest.attachments.field.file') },
          { field: 'client_message_id', required: no, description: t('kefu.integration.rest.attachments.field.clientMessageId') },
        ],
        explain: t('kefu.integration.rest.attachments.explain'),
      },
    },
    websocket: {
      url: visitorWsUrl,
      clientEvents: [
        { direction: 'client', type: 'visitor.send', fields: 'content, client_message_id', description: t('kefu.integration.ws.client.send') },
        { direction: 'client', type: 'visitor.typing', fields: 'typing', description: t('kefu.integration.ws.client.typing') },
        { direction: 'client', type: 'ping', fields: 'ts', description: t('kefu.integration.ws.client.ping') },
      ],
      serverEvents: [
        { direction: 'server', type: 'ready', fields: dash, description: t('kefu.integration.ws.server.ready') },
        { direction: 'server', type: 'message', fields: dash, description: t('kefu.integration.ws.server.message') },
        { direction: 'server', type: 'message_updated', fields: dash, description: t('kefu.integration.ws.server.messageUpdated') },
        { direction: 'server', type: 'state', fields: dash, description: t('kefu.integration.ws.server.state') },
        { direction: 'server', type: 'presence', fields: dash, description: t('kefu.integration.ws.server.presence') },
        { direction: 'server', type: 'message_ack / message_nack', fields: dash, description: t('kefu.integration.ws.server.ack') },
        { direction: 'server', type: 'pong', fields: dash, description: t('kefu.integration.ws.server.pong') },
      ],
      sendExample: {
        type: 'visitor.send',
        content: t('kefu.integration.example.visitorQuestion'),
        client_message_id: 'website-unique-message-id',
      },
      messageEnvelopeExample,
    },
    fetchExample: [
      `const response = await fetch('${endpoint}', {`,
      "  method: 'POST',",
      "  headers: { 'Content-Type': 'application/json' },",
      '  body: JSON.stringify({',
      `    app_id: ${JSON.stringify(payload.app_id)},`,
      "    api_key: '<API Key>',",
      `    visitor_name: ${JSON.stringify(payload.visitor_name)},`,
      "    visitor_key: 'website-user-001',",
      "    channel: 'official_site',",
      '  }),',
      '})',
      'const { data } = await response.json()',
      t('kefu.integration.fetchSaveComment'),
    ].join('\n'),
    errors: [
      { http: '400', code: 'api_key_required', fix: t('kefu.integration.error.apiKeyRequired') },
      { http: '400', code: 'merchant_or_app_required', fix: t('kefu.integration.error.merchantOrAppRequired') },
      { http: '403', code: 'invalid_api_credentials', fix: t('kefu.integration.error.invalidCredentials') },
      { http: '403', code: 'origin_not_allowed', fix: t('kefu.integration.error.originNotAllowed') },
      { http: '403', code: 'store_disabled', fix: t('kefu.integration.error.storeDisabled') },
      { http: '403', code: 'visitor_blocked', fix: t('kefu.integration.error.visitorBlocked') },
      { http: '409', code: 'store_mismatch', fix: t('kefu.integration.error.storeMismatch') },
      { http: '429', code: 'visitor_rate_limited', fix: t('kefu.integration.error.rateLimited') },
      { http: '503', code: 'remote_store_unavailable', fix: t('kefu.integration.error.remoteStoreUnavailable') },
    ],
    appendix: [
      tpl('kefu.integration.appendix1', merchantId),
      t('kefu.integration.appendix2'),
      t('kefu.integration.appendix3'),
      t('kefu.integration.appendix4'),
    ],
    checklist: [
      t('kefu.integration.checklist1'),
      t('kefu.integration.checklist2'),
      t('kefu.integration.checklist3'),
      t('kefu.integration.checklist4'),
      t('kefu.integration.checklist5'),
      t('kefu.integration.checklist6'),
      t('kefu.integration.checklist7'),
    ],
  }
}

function mdCode(lang: string, code: string) {
  return ['```' + lang, code, '```'].join('\n')
}

function renderEnvironmentMarkdown(rows: GuideEnvRow[], t: KefuTranslate) {
  return [
    t('kefu.integration.md.envTableHeader'),
    '| --- | --- | --- |',
    ...rows.map(r => `| ${r.label} | \`${r.value}\` | ${r.note || t('kefu.common.dash')} |`),
  ].join('\n')
}

export function buildAiIntegrationBundle(
  row: SdkConfigView | undefined,
  origin: string,
  t: KefuTranslate,
  tpl: KefuTpl,
  options?: { credentialCount?: number },
): string {
  const guide = buildIntegrationGuide(row, origin, t, tpl, options)
  const summary = sdkInstallSummary(row, origin, t, tpl)
  return [
    t('kefu.integration.bundle.header'),
    '',
    guide.aiHandoff.instruction,
    '',
    summary,
    '',
    t('kefu.integration.bundle.docSeparator'),
    '',
    renderGuideMarkdown(guide, t, tpl),
  ].join('\n')
}

export function renderGuideMarkdown(guide: IntegrationGuide, t: KefuTranslate, tpl: KefuTpl): string {
  const w = guide.methods.find(m => m.id === 'widget')!
  const lines: string[] = [
    t('kefu.integration.md.title'),
    '',
    tpl('kefu.integration.md.generatedAt', guide.meta.generatedAt),
    tpl('kefu.integration.md.store', guide.meta.storeName),
    tpl('kefu.integration.md.appId', guide.meta.appId),
    '',
    guide.meta.sampleHint ? `> ${guide.meta.sampleHint}` : '',
    guide.meta.sampleHint ? '' : '',
    `## ${guide.aiHandoff.headline}`,
    '',
    guide.aiHandoff.instruction,
    '',
    `## ${t('kefu.integration.guide.envTitle')}`,
    '',
    renderEnvironmentMarkdown(guide.environment, t),
    '',
    t('kefu.integration.md.scope'),
    '',
    ...guide.scope.map(s => `- ${s}`),
    '',
    t('kefu.integration.md.quickStart'),
    '',
    guide.quickTip,
    '',
    `## ${w.title}`,
    '',
    w.plainIntro,
    '',
    ...w.steps.flatMap((step, i) => {
      const block = [`### ${i + 1}. ${step.title}`, '', step.explain, '']
      if (step.snippets?.length) {
        for (const sn of step.snippets)
          block.push(mdCode(sn.lang, sn.code), '')
      }
      return block
    }),
    t('kefu.integration.md.restApi'),
    '',
    ...guide.methods.find(m => m.id === 'rest')!.steps.flatMap((step, i) => {
      const block = [`### ${i + 1}. ${step.title}`, '', step.explain, '']
      if (step.snippets?.length) {
        for (const sn of step.snippets)
          block.push(mdCode(sn.lang, sn.code), '')
      }
      return block
    }),
    t('kefu.integration.md.handshakeFields'),
    '',
    `| ${t('kefu.integration.guide.tableField')} | ${t('kefu.integration.guide.tableRequired')} | ${t('kefu.integration.guide.tableDescription')} |`,
    '| --- | --- | --- |',
    ...guide.handshake.fields.map(f => `| \`${f.field}\` | ${f.required} | ${f.description} |`),
    '',
    mdCode('bash', guide.handshake.curl),
    '',
    mdCode('json', JSON.stringify(guide.handshake.payload, null, 2)),
    '',
    t('kefu.integration.md.successResponse'),
    '',
    mdCode('json', JSON.stringify(guide.handshake.successResponse, null, 2)),
    '',
    t('kefu.integration.md.sendMessage'),
    '',
    `- \`${guide.restApis.messages.method}\` \`${guide.restApis.messages.url}\``,
    '',
    mdCode('json', JSON.stringify(guide.restApis.messages.body, null, 2)),
    '',
    t('kefu.integration.md.fetchHistory'),
    '',
    `- \`${guide.restApis.history.method}\` \`${guide.restApis.history.url}\``,
    '',
    t('kefu.integration.md.uploadAttachment'),
    '',
    `- \`${guide.restApis.attachments.method}\` \`${guide.restApis.attachments.url}\``,
    '',
    t('kefu.integration.md.visitorWs'),
    '',
    `- \`${guide.websocket.url}\``,
    '',
    mdCode('json', JSON.stringify(guide.websocket.sendExample, null, 2)),
    '',
    t('kefu.integration.md.messageStructure'),
    '',
    t('kefu.integration.md.messageStructureHint'),
    '',
    mdCode('json', JSON.stringify(guide.websocket.messageEnvelopeExample, null, 2)),
    '',
    t('kefu.integration.md.commonErrors'),
    '',
    `| ${t('kefu.integration.guide.tableHttp')} | ${t('kefu.integration.guide.tableErrorCode')} | ${t('kefu.integration.guide.tableFix')} |`,
    '| --- | --- | --- |',
    ...guide.errors.map(e => `| ${e.http} | \`${e.code}\` | ${e.fix} |`),
    '',
    mdCode('ts', guide.fetchExample),
    '',
    t('kefu.integration.md.appendix'),
    '',
    ...guide.appendix.map(s => `- ${s}`),
    '',
    t('kefu.integration.md.tips'),
    '',
    guide.security.headline,
    '',
    ...guide.security.advanced.map(s => `- ${s}`),
    '',
    t('kefu.integration.md.checklist'),
    '',
    ...guide.checklist.map(s => `- ${s}`),
    '',
  ]
  return lines.filter((line, idx, arr) => !(line === '' && arr[idx - 1] === '')).join('\n')
}
