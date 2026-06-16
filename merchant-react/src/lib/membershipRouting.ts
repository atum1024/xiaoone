export function hasPaidSubscription(planCode: string | undefined | null): boolean {
  return Boolean(planCode && planCode !== 'free')
}

export function resolveAuthedLandingPath(
  planCode: string | undefined | null,
  from?: string | null,
): string {
  if (!hasPaidSubscription(planCode))
    return '/membership'
  return from || '/workbench'
}

export function buildMembershipPath(options?: {
  planCode?: string
  termMonths?: string | number
}): string {
  const params = new URLSearchParams()
  if (options?.planCode)
    params.set('plan_code', options.planCode)
  if (options?.termMonths)
    params.set('term', String(options.termMonths))
  const qs = params.toString()
  return qs ? `/membership?${qs}` : '/membership'
}
