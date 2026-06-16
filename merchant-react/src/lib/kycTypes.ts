export interface KycStatus {
  status: string
  provider_configured: boolean
  verified: boolean
  skippable: boolean
  real_name?: string
  failure_reason?: string
  metadata?: Record<string, unknown>
}
