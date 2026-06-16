export type PlanCode = 'personal' | 'startup' | 'business'

export const PLAN_TIER: Record<PlanCode, number> = {
  personal: 0,
  startup: 10,
  business: 20,
}

export function normalizePlanCode(code?: string | null): PlanCode | '' {
  const normalized = String(code || '').trim().toLowerCase()
  if (normalized === 'personal' || normalized === 'startup' || normalized === 'business') {
    return normalized
  }
  return ''
}

export function planTier(code?: string | null): number {
  const normalized = normalizePlanCode(code)
  return normalized ? PLAN_TIER[normalized] : -1
}

export function isPlanDowngrade(currentCode?: string | null, targetCode?: string | null): boolean {
  const current = planTier(currentCode)
  const target = planTier(targetCode)
  if (current < 0 || target < 0) return false
  return target < current
}

export function subscriptionWithinPeriod(periodEnd?: string | null): boolean {
  if (!periodEnd) return false
  const ts = Date.parse(String(periodEnd))
  if (Number.isNaN(ts)) return false
  return ts > Date.now()
}

export type PlanPurchaseDecision =
  | { allowed: true; action: 'renew' | 'upgrade' | 'purchase' | 'downgrade' }
  | { allowed: false; reason: 'downgrade_blocked' }

export function evaluatePlanPurchase(
  currentCode: string,
  targetCode: string,
  periodEnd: string | null,
): PlanPurchaseDecision {
  const current = normalizePlanCode(currentCode)
  const target = normalizePlanCode(targetCode)
  if (!target) return { allowed: true, action: 'purchase' }
  if (current && current === target) return { allowed: true, action: 'renew' }
  if (current && subscriptionWithinPeriod(periodEnd) && isPlanDowngrade(current, target)) {
    return { allowed: false, reason: 'downgrade_blocked' }
  }
  if (current && planTier(target) > planTier(current)) return { allowed: true, action: 'upgrade' }
  if (current && planTier(target) < planTier(current)) return { allowed: true, action: 'downgrade' }
  return { allowed: true, action: 'purchase' }
}


export function getPlanPurchaseButtonState(
  currentCode: string,
  targetCode: string,
  periodEnd: string | null,
) {
  return evaluatePlanPurchase(currentCode, targetCode, periodEnd)
}
