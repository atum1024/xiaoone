import { isLocalDeploy } from './localIpRegionDebug'

export const LOCAL_REAL_NAME_STORAGE_KEY = 'xiaoone.local.realNameVerified'
export const LOCAL_REAL_NAME_EVENT = 'xiaoone:local-real-name-change'

export interface LocalRealNameChangeDetail {
  verified: boolean | null
}

let memoryOverride: boolean | null = null

export function normalizeLocalRealName(value: unknown): boolean | null {
  if (value === '1' || value === 'true' || value === true) return true
  if (value === '0' || value === 'false' || value === false) return false
  return null
}

export function getLocalRealNameOverride(): boolean | null {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return memoryOverride
  try {
    const stored = normalizeLocalRealName(window.localStorage.getItem(LOCAL_REAL_NAME_STORAGE_KEY))
    return stored ?? memoryOverride
  } catch {
    return memoryOverride
  }
}

export function setLocalRealNameOverride(verified: boolean): void {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return
  memoryOverride = verified
  try {
    window.localStorage.setItem(LOCAL_REAL_NAME_STORAGE_KEY, verified ? '1' : '0')
  } catch {
    // Ignore restricted storage contexts.
  }
  window.dispatchEvent(new CustomEvent<LocalRealNameChangeDetail>(LOCAL_REAL_NAME_EVENT, { detail: { verified } }))
}

export function clearLocalRealNameOverride(): void {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return
  memoryOverride = null
  try {
    window.localStorage.removeItem(LOCAL_REAL_NAME_STORAGE_KEY)
  } catch {
    // Ignore restricted storage contexts.
  }
  window.dispatchEvent(new CustomEvent<LocalRealNameChangeDetail>(LOCAL_REAL_NAME_EVENT, { detail: { verified: null } }))
}

export function toggleLocalRealNameOverride(currentVerified = false): boolean {
  const next = !currentVerified
  setLocalRealNameOverride(next)
  return next
}
