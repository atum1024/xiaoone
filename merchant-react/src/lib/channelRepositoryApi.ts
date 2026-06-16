import { api } from './httpClient'

const BASE = '/api/v1/agent/channel-support/packages'

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | null | undefined
  return (p?.data ?? p) as T
}

export interface ChannelSupportPackage {
  id: string
  service_type: 'sms' | 'mkt-cdn' | 'ad-card' | 'server' | 'app-store' | 'mini-program' | 'icp'
  service_type_label?: string
  code: string
  name: string
  description: string
  price_amount: string
  currency: string
  billing_period: string
  provider_kind: string
  provider_name: string
  external_sku_id: string
  banner_image_url?: string
  metadata: Record<string, unknown>
  is_active: boolean
}

export async function fetchChannelRepositoryPackages(serviceType: ChannelSupportPackage['service_type']) {
  const r = await api.get(`${BASE}/repository/`, { params: { service_type: serviceType } })
  return unwrap<{ items: ChannelSupportPackage[] }>(r.data).items
}
