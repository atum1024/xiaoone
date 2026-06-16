import type { AxiosResponse } from 'axios'
import { api } from './httpClient'

const NETWORK_ACCELERATION_TIMEOUT_MS = 330000

export interface WalletSummary {
  wallet: { balance_points: number; granted_points: number; purchased_points: number; spent_points: number; currency: string }
  tokens_30d: number
  points_30d: number
  calls_30d: number
  network?: {
    bytes_in?: number
    bytes_out?: number
    bytes_used?: number
    quota_gb?: number
    quota_bytes?: number
    remaining_gb?: string
    remaining_bytes?: number
    overage_bytes?: number
    overage_gb?: string
    overage_cny?: string
    cny_per_overage_gb?: string
    overage_points?: number
    period_start?: string
    period_end?: string
  }
  storage?: {
    total_gb?: number
    total_bytes?: number
    used_bytes?: number
    available_bytes?: number
    updated_at?: string | null
  }
}

export interface UsageEvent {
  id: string
  domain: string
  model: string
  operation: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  points_charged: number
  raw_cost_cny?: string
  sale_cny?: string
  pricing_snapshot?: Record<string, unknown>
  created_at: string
}

export interface PointLedger {
  id: string
  kind:
    | 'recharge'
    | 'membership_grant'
    | 'ai_charge'
    | 'service_purchase'
    | 'dcpay_card_topup'
    | 'dcpay_card_open'
    | 'dcpay_card_recharge'
    | 'refund'
    | 'adjust'
    | 'admin_reset'
  amount_points: number
  balance_after_points: number
  payment_amount: string
  payment_currency: string
  note: string
  related_event: string
  operator: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface UsageSummary {
  by_model: Array<{ model: string; tokens: number; points: number; calls: number }>
  by_domain: Array<{ domain: string; tokens: number; points: number; calls: number }>
  by_operation: Array<{ operation: string; tokens: number; points: number; calls: number }>
  last_7_days: Array<{ date: string; tokens: number; points: number; calls: number }>
}

export interface ModelCostRate {
  model: string
  display_name: string
  provider: string
  model_tier: string
  input_price: string
  output_price: string
  cache_price: string
  tool_price: string
  exchange_rate: string
  channel_cost_rate: string
  risk_loss_rate: string
  markup_multiplier: string
  currency: string
  tokens_per_cny_input?: string | null
  tokens_per_cny_output?: string | null
  tokens_per_cny_blended?: string | null
}

// 订阅 / 套餐（M4 商户只读）
export interface MerchantPlan {
  code: string
  name: string
  description: string
  list_price_cny: string
  display_price_cny: string
  price_cny: string
  list_price_usd?: string
  display_price_usd?: string
  price_usd?: string
  included_points_usd?: number
  term_discounts?: Array<{ term_months: number; discount_percent: string; is_active?: boolean }>
  included_points: number
  billing_period: 'monthly' | 'quarterly' | 'annual' | 'perpetual'
  entitlements: Record<string, unknown>
  is_active: boolean
  sort: number
}

export interface ServiceSku {
  code: string
  name: string
  service_type: string
  description: string
  price_cny: string
  delivery_mode: string
  is_active: boolean
  sort: number
}

export interface MerchantSubscription {
  id: string
  merchant_id: number
  plan: MerchantPlan
  status: 'active' | 'trialing' | 'canceled' | 'expired'
  current_period_start: string
  current_period_end: string | null
  auto_renew: boolean
  note: string
}

export interface MerchantServerEntitlement {
  id: number
  merchant_id: number
  plan_code: string
  server_spec: string
  public_ip: string
  status: 'invoiced' | 'provisioning' | 'active' | 'released'
  note: string
  created_at: string
  updated_at: string
}

export interface NetworkAccelerationProfile {
  id: string
  merchant_id: number
  user_id: number
  username: string
  package_code: 'shared' | 'dedicated'
  slot_index: number
  status: 'provisioning' | 'active' | 'provision_failed' | 'revoking' | 'released' | 'revoke_failed'
  ovpn_filename: string
  remote_path: string
  config_kind?: '3xui_link' | 'openvpn' | string
  config_filename?: string
  config_mime_type?: string
  client_link_present?: boolean
  expires_at: string
  provisioned_at?: string | null
  revoked_at?: string | null
  last_error: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SharedNetworkAssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface UsPhonePackage {
  id: string
  code: string
  name: string
  description: string
  country_code: string
  region: string
  provider_name: string
  external_package_id: string
  settlement_price_usd: string
  sale_price_cny: string
  billing_period: string
  metadata: Record<string, unknown>
  is_active: boolean
  sort: number
}

export interface UsPhoneNumber {
  id: string
  order_no: string
  merchant_id: number
  user_id: number
  package: UsPhonePackage | null
  package_snapshot: Record<string, unknown>
  country_code: string
  phone_code: string
  phone_number: string
  upstream_order_no: string
  status: 'pending_payment' | 'provisioning' | 'active' | 'failed' | 'expired' | 'canceled'
  sale_price_cny: string
  paid_points: number
  paid_at: string | null
  activated_at: string | null
  expires_at: string | null
  last_synced_at: string | null
  last_error: string
  metadata: Record<string, unknown>
  sms_count: number
  latest_sms_at: string | null
  created_at: string
  updated_at: string
}

export interface UsPhoneSmsMessage {
  id: string
  number: string
  upstream_message_id: string
  sender: string
  content: string
  received_at: string
  raw_payload: Record<string, unknown>
  created_at: string
}

export interface UsPhoneQuote {
  package: UsPhonePackage
  charge: {
    sale_price_cny: string
    currency: 'CNY'
    points: number
    points_per_cny: number
    wallet_balance_points: number
    balance_after_points: number
    sufficient_balance: boolean
  }
  included_addon: {
    key: 'us_phone_numbers'
    applied: boolean
    quota: number
    used_before: number
  }
  provider: {
    mode: 'openapi'
    ready: boolean
  }
}

export interface DcpayCardProduct {
  id: string
  card_manage_id: string
  card_bin: string
  card_model: string
  card_scheme: string
  card_scene: string
  card_country: string
  currency: string
  open_card_fee: string
  recharge_money: string
  recharge_fee_rate: string
  cancel_fee: string
  single_limit: string
  total_limit: string
  monthly_limit: string
  is_visible: boolean
  sort: number
  synced_at: string | null
}

export interface DcpayCardAccount {
  id: string
  merchant_id: number
  currency: string
  available_amount: string
  frozen_amount: string
  total_topup_amount: string
  total_spent_amount: string
  status: string
  updated_at: string
}

export interface DcpayCardTopupPolicy {
  payment_channel: 'platform_points'
  usd_cny_rate: string
  points_per_cny: number
  amount_usd: string
  amount_cny: string
  points: number
  monthly_limit_usd: string
  monthly_used_usd: string
  monthly_remaining_usd: string
}

export interface DcpayCardAccountLedger {
  id: string
  account_id: string
  kind: 'topup' | 'open_card' | 'card_recharge' | 'cancel_refund' | 'adjust'
  amount: string
  balance_after: string
  currency: string
  related_event: string
  source_checkout_id: string
  vendor_request_id: string
  operator: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface DcpayAdCard {
  id: string
  account_id: string
  merchant_id: number
  user_id: number
  product_id: string
  card_id: string
  card_bin: string
  card_scheme: string
  card_scene: string
  card_currency: string
  card_number_masked: string
  card_status: string
  open_card_time: string | null
  open_card_fee: string
  amount: string
  virtual_amt: string
  single_limit: string
  total_limit: string
  monthly_limit: string
  last_synced_at: string | null
  last_error: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DcpayCardSensitiveDetails {
  card_number: string
  expiration: string
  cvv: string
  available: boolean
}

export interface DcpayCardHolder {
  id: string
  merchant_id: number
  holder_id: string
  name: string
  country: string
  id_type: string
  id_number_last4: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DiscountCodeItem {
  code: string
  discount_kind?: 'percentage' | 'voucher' | 'partner_discount'
  voucher_type?: '' | 'recharge' | 'membership' | 'resource_pack'
  threshold_cny?: string
  deduct_cny?: string
  discount_rate: string
  base_discount_rate?: string
  margin_rate?: string
  assigned_user_id: number | null
  valid_plan_codes: string[]
  valid_business_types?: string[]
  batch_tag: string
  is_active: boolean
  expires_at: string | null
  redeemed_at: string | null
  is_redeemed?: boolean
  created_at: string | null
  partner_markup_cny?: string
  effective_deduct_cny?: string
  base_price_cny?: string
  max_markup_cny?: string
  sale_price_cny?: string
}

export interface DcpayCardTransaction {
  id: string
  card_id: string
  merchant_id: number
  vendor_event_id?: string
  vendor_order_id: string
  auth_amount: string
  auth_amount_currency: string
  settle_amount: string
  display_amount?: string
  product_code: string
  mask_card_number: string
  status: string
  funds_direction: string
  transaction_type: string
  failure_reason: string
  note: string
  merchant_name?: string
  notice_type?: string
  channel: string
  card_scheme: string
  available_credit: string
  vendor_create_time: string | null
  synced_at: string | null
}

export interface PaymentCapability {
  enabled: boolean
  reason?: string
  label: string
  kind: string
}

export interface AlipayIntentResult {
  checkout_id: string
  redirect_url: string
  status?: 'paid' | string
  result?: Record<string, unknown>
}

export interface WechatPayIntentResult {
  checkout_id: string
  code_url: string
  qr_svg?: string
  redirect_url?: string
  status?: 'paid' | string
  result?: Record<string, unknown>
}

export interface CardixonIntentArgs {
  purpose: 'point_recharge' | 'membership_subscription' | 'service_purchase'
  amount_cny?: number
  amount_usd?: number
  token?: 1 | 2
  chain_type?: 1 | 56 | 195
  language?: string
  subject?: string
  idempotency_key?: string
  metadata?: Record<string, unknown>
  discount_code?: string
}

export interface CheckoutStatusResult {
  checkout_id: string
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'unknown'
  purpose?: 'point_recharge' | 'membership_subscription' | 'service_purchase' | 'dcpay_card_topup' | string
  amount_cny: string
  amount_usd?: string
  payment_currency?: 'CNY' | 'USD' | string
  payable_amount_cny?: string
  original_amount_cny?: string
  original_amount_usd?: string
  final_amount_usd?: string
  credited_amount_cny?: string
  display_amount_cny?: string
  discount_code?: string
  payment_channel?: string
}

export interface PageEnvelope<T> { items: T[]; total: number; page: number; page_size: number }

export type PaymentRegion = 'domestic' | 'overseas'
// 暂未接通的支付渠道（仅类型保留，后端会返 503，前端 UI 灰显）
export type PaymentChannel =
  | 'code'
  | 'wechat_pay'
  | 'alipay'
  | 'cardixon'

export interface PaymentPayload {
  payment_region?: PaymentRegion
  payment_channel?: PaymentChannel
}

const BASE = '/api/v1/billing'

const unwrap = <T>(payload: any): T => (payload?.data ?? payload) as T

function normalizeCardixonIntentError(error: any): never {
  const status = Number(error?.response?.status || 0)
  const topMessage = String(error?.response?.data?.message || error?.message || '')
  const nestedCode = String(
    error?.response?.data?.data?.error_code
      || error?.response?.data?.error_code
      || '',
  )
  const low = `${topMessage} ${nestedCode}`.toLowerCase()
  if (status === 401 || low.includes('gateway_http_401') || low.includes('gateway_http_403') || low.includes('gateway_http_5')) {
    throw new Error('加密支付通道升级中，请稍后再试或使用支付宝')
  }
  throw error
}

export const BillingAPI = {
  wallet: async () => unwrap<WalletSummary>((await api.get(`${BASE}/wallet/`)).data),
  summary: async () => unwrap<UsageSummary>((await api.get(`${BASE}/usage/summary/`)).data),
  usageList: async (params: { operation?: string; domain?: string; page?: number; page_size?: number } = {}) =>
    (await api.get<PageEnvelope<UsageEvent>>(`${BASE}/usage/`, { params })).data,
  transactions: async (params: { kind?: string; page?: number; page_size?: number } = {}) =>
    (await api.get<PageEnvelope<PointLedger>>(`${BASE}/transactions/`, { params })).data,
  topup: async (amount: string, note = '', payment?: PaymentPayload, coupon_code?: string) =>
    unwrap<PointLedger>((await api.post(`${BASE}/topup/`, { amount, note, coupon_code, ...(payment || {}) })).data),
  redeemCoupon: async (code: string, plan_code?: string) =>
    unwrap<DiscountCodeItem>((await api.post(`${BASE}/coupons/redeem/`, { code, plan_code })).data),
  pricing: async () =>
    (await api.get<PageEnvelope<ModelCostRate>>(`${BASE}/pricing/`)).data,

  // 商户只读：当前订阅 / 平台所有可订阅套餐
  currentSubscription: async (merchant_id: number) =>
    unwrap<{ subscription: MerchantSubscription | null }>(
      (await api.get(`${BASE}/merchant-subscription/`, { params: { merchant_id } })).data,
    ),
  publicPlans: async () =>
    unwrap<{ items: MerchantPlan[] }>(
      (await api.get(`${BASE}/public/plans/`)).data,
    ),
  quotePlan: async (plan_code: string, term_months: 1 | 3 | 6 | 12, currency?: 'CNY' | 'USD') =>
    unwrap<{
      plan_code: string
      currency?: string
      list_price_cny: string
      display_price_cny: string
      list_price_usd?: string
      display_price_usd?: string
      term_months: number
      discount_percent: string
      final_price: string
      final_price_cny: string
      final_price_usd?: string
    }>((await api.get(`${BASE}/public/plans/${encodeURIComponent(plan_code)}/quote/`, {
      params: { term: term_months, ...(currency ? { currency } : {}) },
    })).data),
  purchasePlan: async (
    plan_code: string,
    payment?: PaymentPayload,
    coupon_code?: string,
    term_months: 1 | 3 | 6 | 12 = 1,
  ) =>
    unwrap<{
      subscription: MerchantSubscription
      transaction: PointLedger | null
      previous_plan: string | null
      order_id: string
      quote?: {
        plan_code: string
        currency?: string
        list_price_cny: string
        display_price_cny: string
        list_price_usd?: string
        display_price_usd?: string
        term_months: number
        discount_percent: string
        final_price: string
        final_price_cny: string
        final_price_usd?: string
      }
    }>((await api.post(`${BASE}/merchant-subscription/purchase/`, { plan_code, coupon_code, term_months, ...payment })).data),
  serviceSkus: async () =>
    unwrap<{ items: ServiceSku[] }>(
      (await api.get(`${BASE}/service-skus/`, { params: { active: 'true' } })).data,
    ),
  purchaseService: async (sku_code: string, payment: PaymentPayload, extra: Record<string, unknown> = {}) =>
    unwrap<{ order: unknown; ledger: PointLedger; order_id: string; network_profile: NetworkAccelerationProfile | null }>(
      (await api.post(`${BASE}/service-orders/purchase/`, { sku_code, ...payment, ...extra })).data,
    ),
  networkAccelerationProfiles: async (package_code?: 'shared' | 'dedicated') =>
    unwrap<{
      items: NetworkAccelerationProfile[]
      shared_ready?: boolean
      shared_unavailable_reason?: string
      dedicated_ready?: boolean
    }>(
      (await api.get(`${BASE}/network-acceleration/profiles/`, { params: package_code ? { package_code } : undefined })).data,
    ),
  networkAccelerationProfile: async (package_code: 'shared' = 'shared') =>
    unwrap<{ profile: NetworkAccelerationProfile | null }>(
      (await api.get(`${BASE}/network-acceleration/profile/`, { params: { package_code } })).data,
    ),
  activateSharedNetwork: async () =>
    unwrap<{ profiles: NetworkAccelerationProfile[]; summary?: { success: number; failed: number }; message: string }>(
      (await api.post(`${BASE}/shared-network/activate/`, {}, { timeout: NETWORK_ACCELERATION_TIMEOUT_MS })).data,
    ),
  activateDedicatedNetwork: async () =>
    unwrap<{ items: NetworkAccelerationProfile[]; summary: { success: number; failed: number }; message: string }>(
      (await api.post(`${BASE}/dedicated-network/activate/`, {}, { timeout: NETWORK_ACCELERATION_TIMEOUT_MS })).data,
    ),
  downloadSharedNetworkConfig: async () =>
    (await api.post(`${BASE}/shared-network/download/`, {}, { responseType: 'blob', timeout: NETWORK_ACCELERATION_TIMEOUT_MS })) as AxiosResponse<Blob>,
  downloadSharedNetworkConfigSlot: async (slot: number) =>
    (await api.post(`${BASE}/shared-network/download/${slot}/`, {}, { responseType: 'blob', timeout: NETWORK_ACCELERATION_TIMEOUT_MS })) as AxiosResponse<Blob>,
  downloadSharedNetworkOvpn: async () => BillingAPI.downloadSharedNetworkConfig(),
  downloadSharedNetworkOvpnSlot: async (slot: number) => BillingAPI.downloadSharedNetworkConfigSlot(slot),
  downloadDedicatedNetworkOvpn: async (slot: number) =>
    (await api.get(`${BASE}/dedicated-network/download/${slot}/`, { responseType: 'blob', timeout: NETWORK_ACCELERATION_TIMEOUT_MS })) as AxiosResponse<Blob>,
  sharedNetworkAssistant: async (messages: SharedNetworkAssistantMessage[]) =>
    unwrap<{ reply: string; model: string; tokens?: Record<string, unknown> }>(
      (await api.post(`${BASE}/shared-network/assistant/`, { messages })).data,
    ),
  usPhonePackages: async () =>
    unwrap<{ enabled: boolean; items: UsPhonePackage[] }>((await api.get(`${BASE}/us-phone/packages/`)).data),
  usPhoneNumbers: async () =>
    unwrap<{ items: UsPhoneNumber[] }>((await api.get(`${BASE}/us-phone/numbers/`)).data),
  quoteUsPhoneNumber: async (package_id: string) =>
    unwrap<UsPhoneQuote>((await api.get(`${BASE}/us-phone/packages/${encodeURIComponent(package_id)}/quote/`)).data),
  purchaseUsPhoneNumber: async (package_id: string) =>
    unwrap<{ number: UsPhoneNumber }>((await api.post(`${BASE}/us-phone/numbers/`, { package_id })).data),
  usPhoneSms: async (number_id: string) =>
    unwrap<{ items: UsPhoneSmsMessage[] }>((await api.get(`${BASE}/us-phone/numbers/${encodeURIComponent(number_id)}/sms/`)).data),
  serverEntitlements: async (params: { status?: string; server_spec?: string } = {}) =>
    unwrap<{ items: MerchantServerEntitlement[]; total: number }>(
      (await api.get(`${BASE}/server-entitlements/`, { params })).data,
    ),
  refreshUsPhoneNumber: async (number_id: string) =>
    unwrap<{ number: UsPhoneNumber; sms_created: number; messages: UsPhoneSmsMessage[] }>(
      (await api.post(`${BASE}/us-phone/numbers/${encodeURIComponent(number_id)}/refresh/`, {})).data,
    ),
  dcpayCardProducts: async (sync = false) =>
    unwrap<{ enabled: boolean; items: DcpayCardProduct[]; account: DcpayCardAccount; topup_policy: DcpayCardTopupPolicy }>(
      (await api.get(`${BASE}/dcpay-card/products/`, { params: sync ? { sync: '1' } : undefined })).data,
    ),
  dcpayCardSyncProducts: async () =>
    unwrap<{ created: number; updated: number; total: number; pages?: number }>(
      (await api.post(`${BASE}/dcpay-card/products/sync/`, {})).data,
    ),
  dcpayCardAccount: async () =>
    unwrap<{ enabled: boolean; account: DcpayCardAccount; account_id: string; topup_policy: DcpayCardTopupPolicy }>(
      (await api.get(`${BASE}/dcpay-card/account/`)).data,
    ),
  dcpayCardAccountLedger: async () =>
    unwrap<{ account: DcpayCardAccount; items: DcpayCardAccountLedger[] }>(
      (await api.get(`${BASE}/dcpay-card/account/ledger/`)).data,
    ),
  dcpayCardTopup: async (payload: { amount_usd: number | string; idempotency_key?: string }) =>
    unwrap<{
      status: 'paid'
      topup: {
        id: string
        status: string
        amount_usd: string
        amount_cny: string
        usd_cny_rate: string
        payment_channel: string
        checkout_id: string
        paid_at: string | null
      }
      ledger: DcpayCardAccountLedger | null
      point_ledger: {
        id: string
        kind: string
        amount_points: number
        balance_after_points: number
        payment_amount: string
        payment_currency: string
        related_event: string
        created_at: string
      }
      topup_policy: DcpayCardTopupPolicy
    }>(
      (await api.post(`${BASE}/dcpay-card/account/topup/`, payload)).data,
    ),
  dcpayCardTopupDetail: async (id: string) =>
    unwrap<{
      id: string
      status: string
      amount_usd: string
      amount_cny: string
      usd_cny_rate: string
      payment_channel: string
      checkout_id: string
      paid_at: string | null
    }>((await api.get(`${BASE}/dcpay-card/account/topup/${encodeURIComponent(id)}/`)).data),
  dcpayCardCards: async (sync = false) =>
    unwrap<{ items: DcpayAdCard[] }>(
      (await api.get(`${BASE}/dcpay-card/cards/`, { params: sync ? { sync: '1' } : {} })).data,
    ),
  dcpayCardHolders: async (refresh = false) =>
    unwrap<{ items: DcpayCardHolder[] }>(
      (await api.get(`${BASE}/dcpay-card/holders/`, { params: refresh ? { refresh: '1' } : {} })).data,
    ),
  dcpayCardCreateHolder: async (payload: {
    name: string
    country?: string
    id_type?: string
    id_number?: string
    metadata?: Record<string, unknown>
  }) =>
    unwrap<{ holder: DcpayCardHolder }>((await api.post(`${BASE}/dcpay-card/holders/`, payload)).data),
  dcpayCardUpdateHolder: async (
    holder_id: string,
    payload: {
      name?: string
      country?: string
      id_type?: string
      id_number?: string
      metadata?: Record<string, unknown>
    },
  ) =>
    unwrap<{ holder: DcpayCardHolder }>(
      (await api.patch(`${BASE}/dcpay-card/holders/`, { holder_id, ...payload })).data,
    ),
  dcpayCardHolderDetail: async (holder_id: string, refresh = false) =>
    unwrap<{ holder: DcpayCardHolder }>(
      (await api.get(`${BASE}/dcpay-card/holders/${encodeURIComponent(holder_id)}/`, { params: refresh ? { refresh: '1' } : {} })).data,
    ),
  dcpayCardOpenCard: async (payload: { card_manage_id: string; holder_id?: string; idempotency_key?: string }) =>
    unwrap<{ card: DcpayAdCard; ledger: DcpayCardAccountLedger }>(
      (await api.post(`${BASE}/dcpay-card/cards/`, payload)).data,
    ),
  dcpayCardCardDetail: async (card_id: string, refresh = false) =>
    unwrap<{ card: DcpayAdCard }>(
      (await api.get(`${BASE}/dcpay-card/cards/${encodeURIComponent(card_id)}/`, { params: refresh ? { refresh: '1' } : {} })).data,
    ),
  dcpayCardSensitiveAuthRequest: async () =>
    unwrap<{ sent: boolean; method: 'sms'; masked_target: string; provider: string; expires_in: number }>(
      (await api.post('/api/v1/iam/account/sensitive-auth/request/', { method: 'sms' })).data,
    ),
  dcpayCardSensitiveDetail: async (
    card_id: string,
    payload: { method: 'password' | 'sms'; password?: string; code?: string },
  ) =>
    unwrap<{ card: DcpayAdCard; sensitive: DcpayCardSensitiveDetails; revealed_at: string }>(
      (await api.post(`${BASE}/dcpay-card/cards/${encodeURIComponent(card_id)}/sensitive/`, payload)).data,
    ),
  dcpayCardRecharge: async (card_id: string, payload: { amount_usd: string | number; idempotency_key?: string }) =>
    unwrap<{ recharge: Record<string, unknown>; card: DcpayAdCard }>(
      (await api.post(`${BASE}/dcpay-card/cards/${encodeURIComponent(card_id)}/recharge/`, payload)).data,
    ),
  dcpayCardTransactions: async (card_id: string, refresh = false) =>
    unwrap<{ items: DcpayCardTransaction[] }>(
      (await api.get(`${BASE}/dcpay-card/cards/${encodeURIComponent(card_id)}/transactions/`, { params: refresh ? { refresh: '1' } : {} })).data,
    ),
  createEnterpriseInquiry: async (payload: Record<string, unknown>) =>
    unwrap<{ inquiry: unknown }>((await api.post(`${BASE}/enterprise-inquiries/`, payload)).data),
  paymentCapabilities: async () =>
    unwrap<{ region: string; channels: Record<string, PaymentCapability> }>(
      (await api.get(`${BASE}/payment-capabilities/`)).data,
    ),
  discountCodesMine: async () =>
    unwrap<{ items: DiscountCodeItem[]; total: number }>(
      (await api.get(`${BASE}/discount-codes/mine/`)).data,
    ),
  createAlipayIntent: async (args: {
    purpose: 'point_recharge' | 'membership_subscription' | 'service_purchase'
    amount_cny: number
    device_type: 'pc' | 'wap'
    subject?: string
    idempotency_key?: string
    metadata?: Record<string, unknown>
    discount_code?: string
  }) =>
    unwrap<AlipayIntentResult>((await api.post(`${BASE}/payments/intent/alipay/`, args)).data),
  createWechatPayIntent: async (args: {
    purpose: 'point_recharge' | 'membership_subscription' | 'service_purchase'
    amount_cny: number
    subject?: string
    idempotency_key?: string
    metadata?: Record<string, unknown>
    discount_code?: string
  }) =>
    unwrap<WechatPayIntentResult>((await api.post(`${BASE}/payments/intent/wechat-pay/`, args)).data),
  createCardixonIntent: async (args: CardixonIntentArgs) =>
    (async () => {
      try {
        return unwrap<AlipayIntentResult>((await api.post(`${BASE}/payments/intent/cardixon/`, args)).data)
      } catch (error: any) {
        normalizeCardixonIntentError(error)
      }
    })(),
  checkoutStatus: async (orderId: string) =>
    unwrap<CheckoutStatusResult>((await api.get(`${BASE}/payments/checkout/${encodeURIComponent(orderId)}/status/`)).data),
  partnerPlanOverview: async () =>
    unwrap<any>((await api.get(`${BASE}/partner/plan/overview/`)).data),
  partnerPlanBind: async (referral_code: string) =>
    unwrap<any>((await api.post(`${BASE}/partner/plan/bind/`, { referral_code })).data),
  partnerPlanSetReferralCode: async (referral_code: string) =>
    unwrap<any>((await api.post(`${BASE}/partner/plan/referral-code/`, { referral_code })).data),
  partnerBindings: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/partner/bindings/`, { params })).data),
  partnerRewards: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/partner/rewards/`, { params })).data),
  partnerCoupons: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/partner/coupons/`, { params })).data),
  partnerDiscountPolicy: async () =>
    unwrap<any>((await api.get(`${BASE}/partner/discount-policy/`)).data),
  partnerGenerateCoupon: async (payload: {
    voucher_type: 'recharge' | 'membership'
    discount_rate?: string
    assigned_user_identifier?: string
    count?: number
  }) =>
    unwrap<any>((await api.post(`${BASE}/partner/coupons/generate/`, payload)).data),
  partnerAssignCoupon: async (payload: {
    code: string
    assigned_user_identifier?: string
    user_id?: number
    discount_rate?: string
  }) =>
    unwrap<any>((await api.post(`${BASE}/partner/coupons/assign/`, payload)).data),
  partnerCouponMarkup: async (payload: {
    voucher_type: string
    base_discount_rate: string
    discount_rate: string
  }) =>
    unwrap<any>((await api.post(`${BASE}/partner/coupons/markup/`, payload)).data),
  partnerRebates: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/partner/rebates/`, { params })).data),
  partnerWithdrawals: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/partner/withdrawals/`, { params })).data),
  partnerApplyWithdrawal: async (amount_cny: string) =>
    unwrap<any>((await api.post(`${BASE}/partner/withdrawals/`, { amount_cny })).data),
  standaloneSmsRecords: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/merchant/standalone/sms-records/`, { params })).data),
  standaloneEmailRecords: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/merchant/standalone/email-records/`, { params })).data),
  standalonePaymentRecords: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/merchant/standalone/payment-records/`, { params })).data),
  standaloneBalance: async () =>
    unwrap<any>((await api.get(`${BASE}/merchant/standalone/balance/`)).data),
  standaloneWithdrawals: async (params?: Record<string, any>) =>
    unwrap<any>((await api.get(`${BASE}/merchant/standalone/withdrawals/`, { params })).data),
  standaloneApplyWithdrawal: async (payload: {
    amount_cny: string
    payee_method: 'bank' | 'alipay' | 'wechat'
    payee_name: string
    bank_name?: string
    bank_card_no?: string
    payee_account?: string
    payee_image_url?: string
    payee_note?: string
    partner_note?: string
  }) =>
    unwrap<any>((await api.post(`${BASE}/merchant/standalone/withdrawals/`, payload)).data),
  standaloneUploadProof: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return unwrap<any>((await api.post(`${BASE}/merchant/standalone/withdrawals/upload-proof/`, fd)).data)
  },
}
