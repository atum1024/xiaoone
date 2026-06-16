import { api } from './httpClient'

const BASE = '/api/v1/agent/automation-tasks'

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | null | undefined
  return (p?.data ?? p) as T
}

export interface AutomationTaskPayload {
  name: string
  market: 'cross_border' | 'domestic'
  platforms: string[]
  product_category: string
  keywords: string[]
  exclude_keywords: string[]
  price_band: string
  schedule_key: 'manual' | 'daily' | '8h' | 'weekly'
  notify_channel: '' | 'telegram' | 'feishu' | 'wecom'
  compliance_mode: string
  source_whitelist: string[]
  prompt_context: string
  status?: 'active' | 'paused'
}

export interface AutomationTask {
  id: string
  thread: string | null
  name: string
  market: 'cross_border' | 'domestic'
  platforms: string[]
  product_category: string
  keywords: string[]
  exclude_keywords: string[]
  price_band: string
  schedule_key: 'manual' | 'daily' | '8h' | 'weekly'
  notify_channel: '' | 'telegram' | 'feishu' | 'wecom'
  compliance_mode: string
  source_whitelist: string[]
  prompt_context: string
  status: 'active' | 'paused'
  last_run_at: string | null
}

export interface AutomationRunManualResult {
  task: AutomationTask
  run: {
    id: string
    status: string
  }
  thread_id: string
  message_id: string
}

export async function createAutomationTask(payload: AutomationTaskPayload): Promise<AutomationTask> {
  const r = await api.post(`${BASE}/`, payload)
  return unwrap<AutomationTask>(r.data)
}

export async function runAutomationTaskManual(taskId: string): Promise<AutomationRunManualResult> {
  const r = await api.post(`${BASE}/${taskId}/run-manual/`, {})
  return unwrap<AutomationRunManualResult>(r.data)
}

