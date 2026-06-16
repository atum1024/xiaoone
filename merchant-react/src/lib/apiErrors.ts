/**
 * 将 Axios / fetch 类错误整理为用户可读文案；后端逐步透出 code 时可在此集中映射。
 */

import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiErrorLike {
  code?: unknown
  status?: number
  response?: {
    data?: {
      message?: unknown
      detail?: unknown
      code?: unknown
      error_code?: unknown
      error?: unknown
      data?: {
        error?: unknown
        message?: unknown
      }
    }
    status?: number
  }
  message?: unknown
}

const MESSAGE_OVERRIDE_KEYS: Record<string, string> = {
  'invalid or expired code': 'common.api.invalidOrExpiredCode',
  'verification code attempts exceeded': 'common.api.verificationAttemptsExceeded',
  'request too frequent': 'common.api.requestTooFrequent',
  'hourly limit reached': 'common.api.hourlyLimit',
  'too many verification code requests from this network': 'common.api.tooManyFromNetwork',
  'code required': 'common.api.codeRequired',
  'invalid phone': 'common.api.invalidPhone',
  'invalid email': 'common.api.invalidEmail',
  'identity_not_found': 'common.api.identityNotFound',
  'invalid login credentials': 'common.api.invalidCredentials',
  'password login attempts exceeded': 'common.api.passwordAttemptsExceeded',
  'too many password login attempts from this network': 'common.api.tooManyPasswordAttempts',
  'phone already registered': 'common.api.phoneRegistered',
  'email already registered': 'common.api.emailRegistered',
  'phone already bound': 'common.api.phoneBound',
  'email already bound': 'common.api.emailBound',
  'invalid bind target': 'common.api.invalidBindTarget',
  'bind auth not required': 'common.api.bindAuthNotRequired',
  'bind auth method unavailable': 'common.api.bindAuthUnavailable',
  'bind auth code required': 'common.api.bindAuthCodeRequired',
  'phone change auth required': 'common.api.phoneChangeAuthRequired',
  'email change auth required': 'common.api.emailChangeAuthRequired',
  'password too short': 'common.api.passwordTooShort',
  'invalid id_card': 'common.api.invalidIdCard',
  'kyc retry too frequent': 'common.api.kycRetryFrequent',
  'kyc daily attempt limit reached': 'common.api.kycDailyLimit',
  'name and id_card required': 'common.api.nameIdRequired',
  'kyc provider unconfigured': 'common.api.kycUnconfigured',
  'plan_code not allowed via public registration': 'common.api.planNotAllowed',
  '注册需要填写优惠码或完成付款（支付通道即将上线）': 'common.api.registrationPayment',
  'content is required': 'common.api.contentRequired',
  'content required': 'common.api.contentRequired',
  'missing merchant': 'common.api.missingMerchant',
  'kefu permission required': 'common.api.kefu.permission',
  'permission denied': 'common.api.kefu.permissionDenied',
  'not found': 'common.api.kefu.notFound',
  'api_key required': 'common.api.kefu.apiKeyRequired',
  'merchant_id or app_id required': 'common.api.kefu.merchantOrAppRequired',
  'store_id does not match api credential': 'common.api.kefu.storeMismatch',
  'API 凭据无效，请检查 App ID 和 API Key 是否匹配': 'common.api.kefu.invalidCredentials',
  '当前页面来源未加入 API 凭据允许域名': 'common.api.kefu.originNotAllowed',
  'store disabled': 'common.api.kefu.storeDisabled',
  'store_disabled': 'common.api.kefu.storeDisabled',
  '店铺已停用，客服暂不可用': 'common.api.kefu.storeDisabled',
  'invalid api credentials or kefu service unreachable': 'common.api.kefu.unreachable',
  'legacy import retired': 'common.api.kefu.legacyImportRetired',
  'legacy_import_retired': 'common.api.kefu.legacyImportRetired',
  'No LiveConversation matches the given query.': 'common.api.sessionNotFound',
  'Network Error': 'common.api.network',
  'Request failed with status code 500': 'common.api.server500',
  'sms_daily_limit_exceeded': 'common.api.smsDailyLimit',
  'sms_config_missing': 'common.api.smsConfigMissing',
  'tencent sms config missing': 'common.api.smsConfigMissing',
}

const WORKSPACE_GATE_KEYS: Record<string, string> = {
  workspace_suspended: 'common.api.workspace.suspended',
  workspace_provisioning: 'common.api.workspace.provisioning',
  workspace_failed: 'common.api.workspace.failed',
  workspace_deleted: 'common.api.workspace.deleted',
}

const SDK_VERIFY_KEYS: Record<string, string> = {
  invalid_secret: 'common.api.sdk.invalidSecret',
  invalid_origin: 'common.api.sdk.invalidOrigin',
  kefu_unreachable: 'common.api.sdk.kefuUnreachable',
  invalid_api_credentials: 'common.api.kefu.invalidCredentials',
  origin_not_allowed: 'common.api.kefu.originNotAllowed',
  store_mismatch: 'common.api.kefu.storeMismatch',
  workspace_suspended: 'common.api.workspace.suspended',
  workspace_provisioning: 'common.api.workspace.provisioning',
  workspace_failed: 'common.api.workspace.failed',
  workspace_deleted: 'common.api.workspace.deleted',
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  store: 'common.api.field.store',
  name: 'common.api.field.name',
  merchant_display_label: 'common.api.field.merchantDisplay',
  app_id: 'common.api.field.appId',
  app_secret: 'common.api.field.appSecret',
}

function resolveMessageOverride(rawMsg: string, locale: Locale): string | undefined {
  const key = MESSAGE_OVERRIDE_KEYS[rawMsg]
  if (key) return uiT(locale, key)
  return undefined
}

function resolveWorkspaceGateMessage(error: unknown, locale: Locale): string | undefined {
  const e = error as ApiErrorLike
  const topCode = cleanText(e?.response?.data?.code)
  const payloadError = cleanText(e?.response?.data?.data?.error)
  const code = topCode || payloadError
  if (code && WORKSPACE_GATE_KEYS[code])
    return uiT(locale, WORKSPACE_GATE_KEYS[code])
  return undefined
}

function resolveSmsFriendlyMessage(message: string, locale: Locale): string | undefined {
  const lowered = message.toLowerCase()
  if (lowered.includes('exceeds the upper limit') || lowered.includes('sms messages sent from a single mobile number'))
    return uiT(locale, 'common.api.smsDailyLimit')
  return undefined
}

function cleanText(value: unknown): string {
  if (typeof value === 'string')
    return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value).trim()
  return ''
}

/** 统一错误文案：优先服务端 message，附带业务 code（若有）。 */
export function describeAxiosError(
  error: unknown,
  fallback?: string,
  timeoutHint?: string,
  locale: Locale = 'zh',
): string {
  const fb = fallback ?? uiT(locale, 'common.api.fallback')
  const e = error as ApiErrorLike
  const data = e?.response?.data
  const rawMsg = cleanText(data?.message || data?.detail || e?.message)
  const transportCode = cleanText(e?.code)
  if (transportCode === 'ECONNABORTED' || /^timeout of \d+ms exceeded$/i.test(rawMsg))
    return timeoutHint || uiT(locale, 'common.api.timeout')
  const smsFriendly = resolveSmsFriendlyMessage(rawMsg, locale)
  if (smsFriendly)
    return smsFriendly
  const override = resolveMessageOverride(rawMsg, locale)
  const msg = override || rawMsg
  const rawCode = cleanText(data?.code || data?.error_code || data?.error)
  const code = /^\d+$/.test(rawCode) ? '' : rawCode
  if (msg && code)
    return `${msg}（${code}）`
  if (msg)
    return msg
  return fb
}

export function describeFormValidationError(
  error: unknown,
  fallback?: string,
  timeoutHint?: string,
  locale: Locale = 'zh',
): string {
  const fb = fallback ?? uiT(locale, 'common.api.fallback')
  const e = error as ApiErrorLike & { response?: { data?: Record<string, unknown> } }
  const data = e?.response?.data
  if (!data || typeof data !== 'object')
    return describeAxiosError(error, fb, timeoutHint, locale)
  const parts: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (key === 'message' || key === 'detail' || key === 'code')
      continue
    const labelKey = FIELD_LABEL_KEYS[key]
    const label = labelKey ? uiT(locale, labelKey) : key
    const text = Array.isArray(value) ? value.map(cleanText).filter(Boolean).join('；') : cleanText(value)
    if (key === 'store' && /sdk config|api 凭据|API 凭据|已存在|already exists/i.test(text))
      return uiT(locale, 'common.api.kefu.storeDuplicate')
    if (text)
      parts.push(`${label}：${text}`)
  }
  if (parts.length)
    return parts.join('；')
  return describeAxiosError(error, fb, timeoutHint, locale)
}

export function describeKefuError(
  error: unknown,
  fallback?: string,
  timeoutHint?: string,
  locale: Locale = 'zh',
): string {
  const fb = fallback ?? uiT(locale, 'common.api.kefu.fallback')
  const workspaceMessage = resolveWorkspaceGateMessage(error, locale)
  if (workspaceMessage)
    return workspaceMessage
  const e = error as ApiErrorLike
  const status = e?.response?.status || e?.status
  const payload = e?.response?.data?.data
  const payloadError = cleanText(payload?.error)
  const payloadMessage = cleanText(payload?.message)
  const isWarehouseImageReuse = /仓库|复用|warehouse|reuse/i.test(fb)
  if (status === 429)
    return uiT(locale, 'common.api.kefu.rateLimited')
  if (status === 404 && /会话|conversation/i.test(fb))
    return uiT(locale, 'common.api.sessionNotFound')
  if (payloadError === 'warehouse_image_reuse_store_unavailable')
    return payloadMessage || uiT(locale, 'common.api.kefu.warehouseReuseFailed')
  if (payloadError === 'legacy_import_retired')
    return uiT(locale, 'common.api.kefu.legacyImportRetired')
  if (payloadError === 'invalid_api_credentials' || payloadError === 'api_key_required' || payloadError === 'merchant_or_app_required')
    return payloadMessage || uiT(locale, 'common.api.kefu.invalidCredentials')
  if (payloadError === 'origin_not_allowed')
    return payloadMessage || uiT(locale, 'common.api.kefu.originNotAllowed')
  if (payloadError === 'store_mismatch')
    return payloadMessage || uiT(locale, 'common.api.kefu.storeMismatch')
  if (payloadError === 'kefu_unreachable')
    return payloadMessage || uiT(locale, 'common.api.kefu.unreachable')
  if (payloadError === 'workspace_suspended')
    return payloadMessage || uiT(locale, WORKSPACE_GATE_KEYS.workspace_suspended)
  if (payloadError === 'workspace_provisioning')
    return payloadMessage || uiT(locale, WORKSPACE_GATE_KEYS.workspace_provisioning)
  if (payloadError === 'workspace_failed')
    return payloadMessage || uiT(locale, WORKSPACE_GATE_KEYS.workspace_failed)
  if (payloadError === 'workspace_deleted')
    return payloadMessage || uiT(locale, WORKSPACE_GATE_KEYS.workspace_deleted)
  if (payloadError === 'ai_suggest_ai_unavailable')
    return payloadMessage || uiT(locale, 'common.api.kefu.aiUnavailable')
  if (payloadError === 'ai_suggest_corpus_unavailable')
    return payloadMessage || uiT(locale, 'common.api.kefu.corpusUnavailable')
  if (payloadError === 'product_image_store_unavailable') {
    if (isWarehouseImageReuse)
      return uiT(locale, 'common.api.kefu.warehouseReuseFailed')
    return payloadMessage || uiT(locale, 'common.api.kefu.imageUploadFailed')
  }
  if (payloadError === 'remote_store_unavailable') {
    if (isWarehouseImageReuse)
      return uiT(locale, 'common.api.kefu.warehouseReuseFailed')
    if (/图片|image/i.test(fb))
      return uiT(locale, 'common.api.kefu.imageUploadFailed')
    return payloadMessage || uiT(locale, 'common.api.kefu.imageUploadFailed')
  }
  if (status && status >= 500)
    return uiT(locale, 'common.api.kefu.unreachable')
  const text = describeAxiosError(error, fb, timeoutHint, locale)
  if (text !== fb)
    return text
  if (status === 401)
    return uiT(locale, 'common.api.kefu.unauthorized')
  if (status === 403)
    return uiT(locale, 'common.api.kefu.permission')
  if (status === 404)
    return uiT(locale, 'common.api.kefu.notFound')
  if (status === 409)
    return uiT(locale, 'common.api.kefu.conflict')
  if (status === 413)
    return uiT(locale, 'common.api.kefu.payloadTooLarge')
  return fb
}

export function describeSdkVerifyCode(code: string | undefined, locale: Locale = 'zh'): string | undefined {
  if (!code)
    return undefined
  const key = SDK_VERIFY_KEYS[code]
  return key ? uiT(locale, key) : undefined
}
