import type { RegionCode } from './regionDetect'

export const LOCAL_IP_REGION_STORAGE_KEY = 'xiaoone.local.ipRegion'
export const LOCAL_IP_REGION_EVENT = 'xiaoone:local-ip-region-change'
let memoryOverride: RegionCode | null = null

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, unknown>
}

export interface LocalIpRegionChangeDetail {
  region: RegionCode
}

function deployEnv(): string {
  const raw = (import.meta as ImportMetaWithEnv).env?.VITE_DEPLOY_ENV
  return String(raw || 'local').trim().toLowerCase()
}

export function isLocalDeploy(): boolean {
  const tier = deployEnv()
  return tier !== 'prod' && tier !== 'production' && tier !== 'staging' && tier !== 'preview'
}

export function normalizeLocalIpRegion(value: unknown): RegionCode | null {
  return value === 'mainland' || value === 'overseas' ? value : null
}

export function localIpRegionCountry(region: RegionCode): string {
  return region === 'mainland' ? 'CN' : 'US'
}

export function getLocalIpRegionOverride(): RegionCode | null {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return memoryOverride
  try {
    const stored = normalizeLocalIpRegion(window.localStorage.getItem(LOCAL_IP_REGION_STORAGE_KEY))
    return stored ?? memoryOverride
  } catch {
    return memoryOverride
  }
}

export function localIpRegionHeaders(region: RegionCode | null = getLocalIpRegionOverride()): Record<string, string> {
  if (!isLocalDeploy() || !region)
    return {}
  return {
    'X-Dev-Region': region,
    'X-Dev-Country': localIpRegionCountry(region),
  }
}

export function applyLocalIpRegionHeaders(headers: unknown, region?: RegionCode | null): void {
  const debugHeaders = localIpRegionHeaders(region === undefined ? getLocalIpRegionOverride() : region)
  if (!headers || Object.keys(debugHeaders).length === 0)
    return

  const maybeSet = (headers as { set?: unknown }).set
  if (typeof maybeSet === 'function') {
    const headerBag = headers as { set: (name: string, value: string) => void }
    for (const [key, value] of Object.entries(debugHeaders))
      headerBag.set(key, value)
    return
  }

  const record = headers as Record<string, string>
  for (const [key, value] of Object.entries(debugHeaders))
    record[key] = value
}

export function withLocalIpRegionHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  applyLocalIpRegionHeaders(headers)
  return { ...init, headers }
}

export function setLocalIpRegionOverride(region: RegionCode): void {
  if (!isLocalDeploy() || typeof window === 'undefined')
    return
  memoryOverride = region
  try {
    window.localStorage.setItem(LOCAL_IP_REGION_STORAGE_KEY, region)
  } catch {
    // Ignore restricted storage contexts; the in-memory event still refreshes the current view.
  }
  window.dispatchEvent(new CustomEvent<LocalIpRegionChangeDetail>(LOCAL_IP_REGION_EVENT, { detail: { region } }))
}

export function toggleLocalIpRegionOverride(currentRegion: RegionCode = 'mainland'): RegionCode {
  const next: RegionCode = currentRegion === 'mainland' ? 'overseas' : 'mainland'
  setLocalIpRegionOverride(next)
  return next
}
