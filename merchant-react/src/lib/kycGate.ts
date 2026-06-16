export type KycGatedWarehouseTab = 'accelerator' | 'numbers' | 'ad-card'

export const KYC_GATED_WAREHOUSE_TABS = new Set<KycGatedWarehouseTab>(['accelerator', 'numbers', 'ad-card'])

export function requiresMainlandRealName(region: string, verified: boolean): boolean {
  return region === 'mainland' && !verified
}

export function isKycGatedWarehouseTab(tab: string): tab is KycGatedWarehouseTab {
  return KYC_GATED_WAREHOUSE_TABS.has(tab as KycGatedWarehouseTab)
}
