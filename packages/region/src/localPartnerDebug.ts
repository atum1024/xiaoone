import { isLocalDeploy } from './localIpRegionDebug'

export type LocalPartnerRole = 'normal' | 'super'

export const LOCAL_PARTNER_ROLE_STORAGE_KEY = 'xiaoone.local.partnerRole'
export const LOCAL_PARTNER_ROLE_EVENT = 'xiaoone:local-partner-role-change'

export interface LocalPartnerRoleChangeDetail {
  role: LocalPartnerRole | null
}

let memoryOverride: LocalPartnerRole | null = null

export function normalizeLocalPartnerRole(value: unknown): LocalPartnerRole | null {
  if (value === 'super' || value === 'super_partner' || value === '1' || value === true) return 'super'
  if (value === 'normal' || value === 'partner' || value === '0' || value === false) return 'normal'
  return null
}

export function getLocalPartnerRoleOverride(): LocalPartnerRole | null {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return memoryOverride
  try {
    const stored = normalizeLocalPartnerRole(window.localStorage.getItem(LOCAL_PARTNER_ROLE_STORAGE_KEY))
    return stored ?? memoryOverride
  } catch {
    return memoryOverride
  }
}

export function setLocalPartnerRoleOverride(role: LocalPartnerRole): void {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return
  memoryOverride = role
  try {
    window.localStorage.setItem(LOCAL_PARTNER_ROLE_STORAGE_KEY, role)
  } catch {
    // Ignore restricted storage contexts.
  }
  window.dispatchEvent(new CustomEvent<LocalPartnerRoleChangeDetail>(LOCAL_PARTNER_ROLE_EVENT, { detail: { role } }))
}

export function clearLocalPartnerRoleOverride(): void {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return
  memoryOverride = null
  try {
    window.localStorage.removeItem(LOCAL_PARTNER_ROLE_STORAGE_KEY)
  } catch {
    // Ignore restricted storage contexts.
  }
  window.dispatchEvent(new CustomEvent<LocalPartnerRoleChangeDetail>(LOCAL_PARTNER_ROLE_EVENT, { detail: { role: null } }))
}

export function toggleLocalPartnerRoleOverride(currentRole: LocalPartnerRole = 'normal'): LocalPartnerRole {
  const next: LocalPartnerRole = currentRole === 'super' ? 'normal' : 'super'
  setLocalPartnerRoleOverride(next)
  return next
}
