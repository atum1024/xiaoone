import { api } from './httpClient'

export interface WalletSummary {
  wallet: { balance: string; total_topup: string; total_charge: string; currency: string }
  tokens_30d: number
  amount_30d: string
  calls_30d: number
}

export interface UsageEvent {
  id: string
  domain: string
  model: string
  operation: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  amount: string
  is_mock: boolean
  is_demo: boolean
  created_at: string
}

export interface TransactionRecord {
  id: string
  kind: 'topup' | 'charge' | 'purchase' | 'refund' | 'adjust' | 'grant'
  amount: string
  balance_after: string
  note: string
  related_event: string
  operator: string
  is_demo: boolean
  metadata?: Record<string, unknown>
  created_at: string
}

export interface UsageSummary {
  by_model: Array<{ model: string; tokens: number; amount: string; calls: number }>
  by_domain: Array<{ domain: string; tokens: number; amount: string; calls: number }>
  by_operation: Array<{ operation: string; tokens: number; amount: string; calls: number }>
  last_7_days: Array<{ date: string; tokens: number; amount: string; calls: number }>
}

export interface ModelPricing {
  model: string
  display_name: string
  provider: string
  price_input_per_1k: string
  price_output_per_1k: string
  currency: string
}

// 订阅 / 套餐（M4 商户只读）
export interface MerchantPlan {
  code: string
  name: string
  description: string
  monthly_price: string
  included_credits: string
  billing_period: 'monthly' | 'quarterly' | 'annual' | 'perpetual'
  features: Record<string, unknown>
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
  is_demo: boolean
}

export interface PageEnvelope<T> { items: T[]; total: number; page: number; page_size: number }

export type PaymentRegion = 'domestic' | 'overseas'
export type PaymentChannel = 'wechat_pay' | 'alipay' | 'usdt_trc20' | 'usdt_erc20' | 'btc' | 'eth'

export interface PaymentPayload {
  payment_region: PaymentRegion
  payment_channel: PaymentChannel
}

const BASE = '/api/v1/billing'

const unwrap = <T>(payload: any): T => (payload?.data ?? payload) as T

export const BillingAPI = {
  wallet: async () => unwrap<WalletSummary>((await api.get(`${BASE}/wallet/`)).data),
  summary: async () => unwrap<UsageSummary>((await api.get(`${BASE}/usage/summary/`)).data),
  usageList: async (params: { operation?: string; domain?: string; page?: number; page_size?: number } = {}) =>
    (await api.get<PageEnvelope<UsageEvent>>(`${BASE}/usage/`, { params })).data,
  transactions: async (params: { kind?: string; page?: number; page_size?: number } = {}) =>
    (await api.get<PageEnvelope<TransactionRecord>>(`${BASE}/transactions/`, { params })).data,
  topup: async (amount: string, note = '', payment?: PaymentPayload) =>
    unwrap<TransactionRecord>((await api.post(`${BASE}/topup/`, { amount, note, ...(payment || {}) })).data),
  pricing: async () =>
    (await api.get<PageEnvelope<ModelPricing>>(`${BASE}/pricing/`)).data,

  // 商户只读：当前订阅 / 平台所有可订阅套餐
  currentSubscription: async (merchant_id: number) =>
    unwrap<{ subscription: MerchantSubscription | null }>(
      (await api.get(`${BASE}/merchant-subscription/`, { params: { merchant_id } })).data,
    ),
  publicPlans: async () =>
    unwrap<{ items: MerchantPlan[] }>(
      (await api.get(`${BASE}/plans/`, { params: { active: 'true' } })).data,
    ),
  purchasePlan: async (plan_code: string, payment: PaymentPayload) =>
    unwrap<{
      subscription: MerchantSubscription
      transaction: TransactionRecord | null
      previous_plan: string | null
      order_id: string
    }>((await api.post(`${BASE}/merchant-subscription/purchase/`, { plan_code, ...payment })).data),
}
