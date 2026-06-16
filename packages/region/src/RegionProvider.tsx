import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultLocaleForRegion,
  regionFromHostname,
  type RegionCode,
} from './regionDetect'
import { setRegionChoice as persistRegionChoice } from './regionChoice'
import {
  LOCAL_IP_REGION_EVENT,
  LOCAL_IP_REGION_STORAGE_KEY,
  getLocalIpRegionOverride,
  isLocalDeploy,
  toggleLocalIpRegionOverride,
  withLocalIpRegionHeaders,
  type LocalIpRegionChangeDetail,
} from './localIpRegionDebug'
import {
  LOCAL_REAL_NAME_EVENT,
  LOCAL_REAL_NAME_STORAGE_KEY,
  getLocalRealNameOverride,
  toggleLocalRealNameOverride,
  type LocalRealNameChangeDetail,
} from './localRealNameDebug'
import {
  LOCAL_PARTNER_ROLE_EVENT,
  LOCAL_PARTNER_ROLE_STORAGE_KEY,
  getLocalPartnerRoleOverride,
  toggleLocalPartnerRoleOverride,
  type LocalPartnerRole,
  type LocalPartnerRoleChangeDetail,
} from './localPartnerDebug'

export interface PaymentChannelMeta {
  code: string
  label: string
  kind: string
}

export interface RegionApiPayload {
  region: RegionCode
  source?: string
  domain_region?: RegionCode | null
  ip_region?: RegionCode | null
  country_code?: string
  locale_default?: string
  mismatch?: boolean
  registration_methods?: string[]
  payment_channels?: PaymentChannelMeta[]
}

export interface RegionContextValue {
  region: RegionCode
  domainRegion: RegionCode | null
  ipRegion: RegionCode | null
  mismatch: boolean
  localeDefault: 'zh' | 'en'
  registrationMethods: string[]
  paymentChannels: PaymentChannelMeta[]
  localIpRegionOverride: RegionCode | null
  localIpRegionDebugEnabled: boolean
  loading: boolean
  refresh: () => Promise<void>
  /** Persist anonymous region preference and reload region from API. */
  switchRegion: (region: RegionCode) => Promise<boolean>
  toggleLocalIpRegion: () => RegionCode
}

const RegionContext = createContext<RegionContextValue | null>(null)

async function fetchRegion(apiBase?: string): Promise<RegionApiPayload | null> {
  const base = (apiBase ?? '').replace(/\/$/, '')
  const prefix = base || ''
  const url = `${prefix}/api/v1/iam/public/region/`
  try {
    const resp = await fetch(url, withLocalIpRegionHeaders({ credentials: 'include' }))
    if (!resp.ok)
      return null
    const body = await resp.json()
    const data = body?.data ?? body
    if (!data?.region)
      return null
    return data as RegionApiPayload
  } catch {
    return null
  }
}

export function RegionProvider({
  children,
  apiBase,
}: {
  children: ReactNode
  apiBase?: string
}) {
  const domainRegion = useMemo(() => regionFromHostname(), [])
  const [payload, setPayload] = useState<RegionApiPayload | null>(null)
  const [localIpRegionOverride, setLocalIpRegionOverrideState] = useState<RegionCode | null>(() => getLocalIpRegionOverride())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const remote = await fetchRegion(apiBase)
    setPayload(remote)
    setLoading(false)
  }, [apiBase])

  const switchRegion = useCallback(async (next: RegionCode) => {
    const saved = await persistRegionChoice(next, apiBase)
    if (saved)
      await refresh()
    return saved
  }, [apiBase, refresh])

  useEffect(() => {
    refresh().catch(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    if (!isLocalDeploy() || typeof window === 'undefined')
      return
    function onLocalIpRegionChange(event: Event) {
      const detail = (event as CustomEvent<LocalIpRegionChangeDetail>).detail
      setLocalIpRegionOverrideState(detail?.region ?? getLocalIpRegionOverride())
      refresh().catch(() => setLoading(false))
    }
    function onStorage(event: StorageEvent) {
      if (event.key === LOCAL_IP_REGION_STORAGE_KEY) {
        setLocalIpRegionOverrideState(getLocalIpRegionOverride())
        refresh().catch(() => setLoading(false))
      }
    }
    window.addEventListener(LOCAL_IP_REGION_EVENT, onLocalIpRegionChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_IP_REGION_EVENT, onLocalIpRegionChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  const region: RegionCode = payload?.region ?? domainRegion ?? 'mainland'
  // Hostname is diagnostic only; API region wins whenever available.
  const ipRegion = (payload?.ip_region as RegionCode | null | undefined) ?? null
  const resolvedDomain = (payload?.domain_region as RegionCode | null | undefined) ?? domainRegion
  const mismatch = Boolean(
    payload?.mismatch
    ?? (resolvedDomain && ipRegion && resolvedDomain !== ipRegion),
  )

  const value = useMemo<RegionContextValue>(() => ({
    region,
    domainRegion: resolvedDomain,
    ipRegion,
    mismatch,
    localeDefault: defaultLocaleForRegion(region),
    registrationMethods: payload?.registration_methods ?? (region === 'mainland' ? ['phone'] : ['email']),
    paymentChannels: payload?.payment_channels ?? [],
    localIpRegionOverride,
    localIpRegionDebugEnabled: isLocalDeploy(),
    loading,
    refresh,
    switchRegion,
    toggleLocalIpRegion: () => {
      const next = toggleLocalIpRegionOverride(localIpRegionOverride ?? region)
      setLocalIpRegionOverrideState(next)
      return next
    },
  }), [region, resolvedDomain, ipRegion, mismatch, payload, localIpRegionOverride, loading, refresh, switchRegion])

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext)
  if (!ctx)
    throw new Error('useRegion must be used within RegionProvider')
  return ctx
}

export function LocalIpRegionToggle({
  locale = 'zh',
  className = '',
  onToggleRegion,
}: {
  locale?: 'zh' | 'en'
  className?: string
  onToggleRegion?: (region: RegionCode) => void | Promise<void>
}) {
  const { region, localIpRegionOverride, localIpRegionDebugEnabled, toggleLocalIpRegion } = useRegion()
  if (!localIpRegionDebugEnabled)
    return null

  const isZh = locale === 'zh'
  const activeRegion = localIpRegionOverride ?? region
  const label = isZh
    ? (activeRegion === 'mainland' ? '国内IP' : '非大陆IP')
    : (activeRegion === 'mainland' ? 'CN IP' : 'Global IP')
  const nextLabel = isZh
    ? (activeRegion === 'mainland' ? '非大陆IP' : '国内IP')
    : (activeRegion === 'mainland' ? 'Global IP' : 'CN IP')

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleLocalIpRegion()
        void onToggleRegion?.(next)
      }}
      className={className || undefined}
      data-xiaoone-local-ip-region={activeRegion}
      aria-label={isZh ? `本地调试：切换到${nextLabel}` : `Local debug: switch to ${nextLabel}`}
      title={isZh ? `本地调试：当前模拟${label}` : `Local debug: currently simulating ${label}`}
    >
      <span>{label}</span>
    </button>
  )
}

export function LocalRealNameToggle({
  locale = 'zh',
  className = '',
  verified = false,
}: {
  locale?: 'zh' | 'en'
  className?: string
  verified?: boolean
}) {
  const { localIpRegionDebugEnabled } = useRegion()
  const [localVerified, setLocalVerified] = useState<boolean>(() => getLocalRealNameOverride() ?? verified)

  useEffect(() => {
    if (!localIpRegionDebugEnabled || typeof window === 'undefined')
      return
    function onChange(event: Event) {
      const detail = (event as CustomEvent<LocalRealNameChangeDetail>).detail
      if (detail?.verified === null || detail?.verified === undefined)
        setLocalVerified(verified)
      else
        setLocalVerified(detail.verified)
    }
    function onStorage(event: StorageEvent) {
      if (event.key === LOCAL_REAL_NAME_STORAGE_KEY)
        setLocalVerified(getLocalRealNameOverride() ?? verified)
    }
    window.addEventListener(LOCAL_REAL_NAME_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_REAL_NAME_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [localIpRegionDebugEnabled, verified])

  if (!localIpRegionDebugEnabled)
    return null

  const isZh = locale === 'zh'
  const activeVerified = getLocalRealNameOverride() ?? localVerified
  const label = isZh
    ? (activeVerified ? '已实名' : '未实名')
    : (activeVerified ? 'Verified' : 'Unverified')
  const nextLabel = isZh
    ? (activeVerified ? '未实名' : '已实名')
    : (activeVerified ? 'Unverified' : 'Verified')

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleLocalRealNameOverride(activeVerified)
        setLocalVerified(next)
      }}
      className={className || undefined}
      data-xiaoone-local-real-name={activeVerified ? 'verified' : 'unverified'}
      aria-label={isZh ? `本地调试：切换到${nextLabel}` : `Local debug: switch to ${nextLabel}`}
      title={isZh ? `本地调试：当前模拟${label}` : `Local debug: currently simulating ${label}`}
    >
      <span>{label}</span>
    </button>
  )
}

export function LocalPartnerRoleToggle({
  locale = 'zh',
  className = '',
}: {
  locale?: 'zh' | 'en'
  className?: string
}) {
  const { localIpRegionDebugEnabled } = useRegion()
  const [localRole, setLocalRole] = useState<LocalPartnerRole>(() => getLocalPartnerRoleOverride() ?? 'normal')

  useEffect(() => {
    if (!localIpRegionDebugEnabled || typeof window === 'undefined')
      return
    function onChange(event: Event) {
      const detail = (event as CustomEvent<LocalPartnerRoleChangeDetail>).detail
      setLocalRole(detail?.role ?? 'normal')
    }
    function onStorage(event: StorageEvent) {
      if (event.key === LOCAL_PARTNER_ROLE_STORAGE_KEY)
        setLocalRole(getLocalPartnerRoleOverride() ?? 'normal')
    }
    window.addEventListener(LOCAL_PARTNER_ROLE_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_PARTNER_ROLE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [localIpRegionDebugEnabled])

  if (!localIpRegionDebugEnabled)
    return null

  const isZh = locale === 'zh'
  const activeRole = getLocalPartnerRoleOverride() ?? localRole
  const label = isZh
    ? (activeRole === 'super' ? '超级合伙人' : '普通合伙人')
    : (activeRole === 'super' ? 'Super partner' : 'Normal partner')
  const nextLabel = isZh
    ? (activeRole === 'super' ? '普通合伙人' : '超级合伙人')
    : (activeRole === 'super' ? 'Normal partner' : 'Super partner')

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleLocalPartnerRoleOverride(activeRole)
        setLocalRole(next)
      }}
      className={className || undefined}
      data-xiaoone-local-partner-role={activeRole}
      aria-label={isZh ? `本地调试：切换到${nextLabel}` : `Local debug: switch to ${nextLabel}`}
      title={isZh ? `本地调试：当前模拟${label}` : `Local debug: currently simulating ${label}`}
    >
      <span>{label}</span>
    </button>
  )
}
