import { api } from './httpClient'
import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | null | undefined
  return (p?.data ?? p) as T
}

export type AssistantRuntimeState = 'ok' | 'pending' | 'blocked' | 'off' | 'error'

export interface AssistantRuntimeMarker {
  state: AssistantRuntimeState
  code?: string
  label: string
  description: string
  channel?: string
  ws_url?: string
  supported_channels?: Array<{ key: string; label: string }>
}

export interface HermesDashboardStatus {
  state: 'ok' | 'pending'
  url: string | null
}

export interface HelpCenterStatus {
  state: 'ok' | 'pending'
  url: string | null
  admin_url: string | null
  admin_username?: string
  admin_password_configured?: boolean
  admin_configured_at?: string
}

export interface SiteStatus {
  state: 'ok' | 'pending'
  url: string | null
  root_path?: string
}

export interface WorkspaceStatusResponse {
  status: string
  merchant_subdomain?: string
  subdomain_root?: string
  subdomain_confirmed?: boolean
  subdomain_fqdn?: string
  smart_space: AssistantRuntimeMarker
  assistant_channel: AssistantRuntimeMarker
  hermes_dashboard?: HermesDashboardStatus
  help_center?: HelpCenterStatus
  site?: SiteStatus
  last_failure?: string | null
  reclaim_started_at?: string | null
  terminate_after?: string | null
  recover_until?: string | null
  provision_task?: {
    step: string
    status: string
    last_error: string
    next_retry_at?: string | null
  } | null
}

/** @deprecated Use assistantWorkstationBlockReason(status, locale) */
export const ASSISTANT_WORKSTATION_CONFIGURING_MESSAGE = '智能空间准备中请稍后再试...'

export interface WorkspaceRetryResponse {
  status: string
  message?: string
}



export function isWorkspaceReclaimed(status: WorkspaceStatusResponse | null | undefined): boolean {
  if (!status) return false
  if (status.status === 'reclaimed') return true
  const code = status.smart_space?.code || ''
  return code === 'space.reclaimed' || code === 'space.reclaiming'
}

export function isWorkspaceRestoring(status: WorkspaceStatusResponse | null | undefined): boolean {
  const code = status?.smart_space?.code || ''
  return code === 'space.restoring' || status?.status === 'provisioning'
}

export function assistantWorkstationBlockReason(
  status: WorkspaceStatusResponse | null | undefined,
  locale: Locale = 'zh',
  loadError = '',
) {
  if (loadError) return loadError
  if (isWorkspaceReclaimed(status)) {
    return uiT(locale, 'common.workspace.reclaimedDesc', '工作区实例已进入退还状态，续费会员后可恢复使用。')
  }
  if (!status || status.smart_space?.state !== 'ok' || status.assistant_channel?.state !== 'ok') {
    return uiT(locale, 'common.workspace.configuring', ASSISTANT_WORKSTATION_CONFIGURING_MESSAGE)
  }
  return ''
}

export async function getWorkspaceStatus(): Promise<WorkspaceStatusResponse> {
  const r = await api.get('/api/v1/ai/workspace/status/')
  return unwrap<WorkspaceStatusResponse>(r.data)
}

export async function retryWorkspaceProvision(): Promise<WorkspaceRetryResponse> {
  const r = await api.post('/api/v1/ai/workspace/retry/')
  return unwrap<WorkspaceRetryResponse>(r.data)
}

export interface HelpAdminCredentialsPayload {
  username: string
  password: string
}

export interface HelpAdminCredentialsResponse {
  username: string
  password_configured: boolean
  configured_at: string
}

export async function updateHelpAdminCredentials(
  payload: HelpAdminCredentialsPayload,
): Promise<HelpAdminCredentialsResponse> {
  const r = await api.post('/api/v1/ai/workspace/help-admin/credentials/', payload)
  return unwrap<HelpAdminCredentialsResponse>(r.data)
}

export interface SubdomainConfirmResponse {
  subdomain: string
  subdomain_locked: boolean
  subdomain_root: string
  subdomain_fqdn: string
  already_locked?: boolean
}

/** @deprecated Subdomain is locked at registration; kept for legacy/admin tooling. */
export async function confirmMerchantSubdomain(subdomain: string): Promise<SubdomainConfirmResponse> {
  const r = await api.post('/api/v1/iam/merchant/subdomain/confirm/', { subdomain })
  return unwrap<SubdomainConfirmResponse>(r.data)
}

export async function resumeWorkspace(): Promise<WorkspaceRetryResponse> {
  const r = await api.post('/api/v1/ai/workspace/resume/')
  return unwrap<WorkspaceRetryResponse>(r.data)
}

export interface EnsureWorkspaceResponse {
  provisioned: boolean
  reason?: string
  plan_code?: string
}

/**
 * Homepage net: if the merchant has no workspace yet, provision by the active
 * subscription plan (resolved server-side; no personal fallback).
 */
export async function ensureWorkspaceProvision(): Promise<EnsureWorkspaceResponse> {
  const r = await api.post('/api/v1/iam/merchant/workspace/ensure/')
  return unwrap<EnsureWorkspaceResponse>(r.data)
}

export async function syncWorkspaceAfterLogin(subscriptionPlanCode: string): Promise<void> {
  try {
    const paid = Boolean(subscriptionPlanCode && subscriptionPlanCode !== 'free')
    if (!paid)
      return
    const status = await getWorkspaceStatus()
    // 进入首页后兜底：若尚无工作区，则按套餐补开（后端按订阅解析，无套餐则不开）。
    if (status.status === 'not_found') {
      await ensureWorkspaceProvision()
      return
    }
    if (status.status === 'provisioning' || status.status === 'provision_failed') {
      await resumeWorkspace()
      return
    }
    if (status.status === 'suspended' || status.status === 'reclaimed')
      await resumeWorkspace()
  }
  catch {
    // best-effort; runtime status polling will surface blockers
  }
}
