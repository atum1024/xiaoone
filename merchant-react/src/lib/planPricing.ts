export type BillingCurrency = 'CNY' | 'USD'
export type UserRegion = 'mainland' | 'overseas'

export type PlanPriceFields = {
  list_price_cny?: string | number
  display_price_cny?: string | number
  price_cny?: string | number
  list_price_usd?: string | number
  display_price_usd?: string | number
  price_usd?: string | number
}

export type PlanQuoteFields = {
  currency?: string
  final_price?: string
  final_price_cny?: string
  final_price_usd?: string
  list_price_cny?: string
  display_price_cny?: string
  list_price_usd?: string
  display_price_usd?: string
}

export function normalizeUserRegion(value: unknown, fallback: UserRegion = 'mainland'): UserRegion {
  return value === 'mainland' || value === 'overseas' ? value : fallback
}

export function billingCurrencyForRegion(region: UserRegion): BillingCurrency {
  return region === 'overseas' ? 'USD' : 'CNY'
}

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) ? n : fallback
}

export function planDisplayPrice(plan: PlanPriceFields, currency: BillingCurrency): number {
  if (currency === 'USD') {
    const display = numberValue(plan.display_price_usd)
    if (display > 0)
      return display
    return numberValue(plan.price_usd)
  }
  const display = numberValue(plan.display_price_cny)
  if (display > 0)
    return display
  return numberValue(plan.price_cny)
}

export function planListPrice(plan: PlanPriceFields, currency: BillingCurrency): number {
  if (currency === 'USD') {
    const listed = numberValue(plan.list_price_usd)
    if (listed > 0)
      return listed
    return planDisplayPrice(plan, currency)
  }
  const listed = numberValue(plan.list_price_cny)
  if (listed > 0)
    return listed
  return planDisplayPrice(plan, currency)
}

export function formatPlanPrice(amount: number, currency: BillingCurrency): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function quoteFinalPrice(quote: PlanQuoteFields | null | undefined, currency: BillingCurrency): number {
  if (!quote)
    return 0
  if (currency === 'USD')
    return numberValue(quote.final_price_usd ?? quote.final_price)
  return numberValue(quote.final_price_cny ?? quote.final_price)
}

export function checkoutAmountPayload(amount: number, currency: BillingCurrency): { amount_cny?: number; amount_usd?: number } {
  if (currency === 'USD')
    return { amount_usd: amount }
  return { amount_cny: amount }
}
