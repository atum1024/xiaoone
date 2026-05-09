import type { AxiosInstance } from 'axios'

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type AgentDomain = 'marketing' | 'support' | 'agency' | 'feedback' | 'general'

export interface AgentThread {
  id: string
  merchant_id: number
  user_id: number
  domain: AgentDomain
  title: string
  plugin_key: string
  mode_key: string
  model_key: string
  pinned: boolean
  archived: boolean
  last_message_at: string | null
  summary: string
  is_demo: boolean
  message_count: number
  preview: string
  active_generation_count: number
  latest_generation_status: AgentGenerationTask['status'] | ''
  latest_generation_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentMessage {
  id: string
  thread: string
  parent_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'done' | 'streaming' | 'error'
  model: string
  prompt_tokens: number
  completion_tokens: number
  finish_reason: string
  generation_tasks?: AgentGenerationTask[]
  attachments?: AgentAttachment[]
  created_at: string
  updated_at: string
}

export interface AgentGenerationTask {
  id: string
  merchant_id: number
  user_id: number
  thread: string
  message: string | null
  provider: string
  model_key: string
  model: string
  modality: 'image' | 'video'
  prompt: string
  upstream_task_id: string
  status: 'draft' | 'submitted' | 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  progress: number | null
  result: any
  raw_response: any
  error_message: string
  /** 失败分桶：concurrency_limit | insufficient_balance | bad_api_key | upstream_timeout | content_policy | network_error | rate_limited | unknown | '' */
  error_code: string
  completed_at: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface AgentModelAvailability {
  key: string
  provider: string
  modality: 'text' | 'image' | 'video'
  available: boolean
  status: 'available' | 'unconfigured' | 'unsupported' | 'disabled' | 'hidden' | string
  reason: string
}

export interface AgentAttachment {
  id: string
  merchant_id: number
  user_id: number
  thread: string | null
  message: string | null
  source: 'user_upload' | 'ai_output'
  name: string
  content_type: string
  size: number
  is_text: boolean
  is_demo: boolean
  download_url?: string
  share_url?: string
  public_url?: string
  created_at: string
  updated_at: string
}

export interface AgentThreadDetail extends AgentThread {
  messages: AgentMessage[]
  attachments?: AgentAttachment[]
}

export type ServiceCaseStatus =
  | 'data_submitted'
  | 'consulting'
  | 'in_progress'
  | 'completed'
  | 'closed'

export interface ServiceCase {
  id: string
  thread: string
  thread_title: string
  thread_summary: string
  thread_preview: string
  message_count: number
  merchant_id: number
  requester_user_id: number
  domain: AgentDomain
  service_type: string
  service_type_label: string
  title: string
  status: ServiceCaseStatus
  status_label: string
  assigned_platform_user_id: number | null
  ai_reply_enabled: boolean
  last_message_at: string | null
  unread_count: number
  merchant_confirmation_message: string
  merchant_confirmed_at: string | null
  merchant_confirmation_note: string
  platform_confirmed_at: string | null
  platform_confirmation_note: string
  payment_amount: string | null
  payment_currency: string
  payment_note: string
  payment_type: string
  payment_type_label: string
  collection_channel: string
  merchant_payment_confirmed_at: string | null
  merchant_payment_note: string
  platform_collected_at: string | null
  paid_at: string | null
  paid_transaction_id: string
  delivery_note: string
  delivery_materials: string[]
  delivery_dispute_note: string
  delivery_confirmed_at: string | null
  final_payment_amount: string | null
  final_payment_note: string
  final_collection_channel: string
  closed_at: string | null
  closed_reason: string
  source_label: string
  can_pay: boolean
  can_request_payment: boolean
  merchant_info: {
    merchant_id: number
    merchant_code: string
    merchant_name: string
    merchant_contact_email: string
    owner_user_id: number | null
    owner_email: string
    owner_name: string
  }
  is_demo: boolean
  messages?: AgentMessage[]
  created_at: string
  updated_at: string
}

export interface AgentPageEnvelope<T> { items: T[]; total: number; page: number; page_size: number }

export interface StreamEvent {
  type?: 'thread_meta' | 'generation_task' | 'error'
  thread_id?: string
  user_message_id?: string
  assistant_message_id?: string
  delta?: string
  finish?: boolean
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model?: string
  message?: string
  generation_task?: AgentGenerationTask
  /** 服务端错误的 HTTP 等价状态（429 = 排队/限流），仅 error 行有效 */
  http_status?: number
  /** 服务端错误分桶，与 AgentGenerationTask.error_code 一致 */
  error_code?: string
}

export function createAgentApi(api: AxiosInstance, authFetch: AuthFetch) {
  const BASE = '/api/v1/agent'

  const AgentThreadAPI = {
  list: async (params: { domain?: AgentDomain; archived?: boolean | string; page_size?: number } = {}) => {
    const r = await api.get<AgentPageEnvelope<AgentThread>>(`${BASE}/threads/`, { params })
    return r.data
  },
  detail: async (id: string) => {
    const r = await api.get<AgentThreadDetail>(`${BASE}/threads/${id}/`)
    return r.data
  },
  create: async (payload: { domain: AgentDomain; title?: string; plugin_key?: string; mode_key?: string; model_key?: string }) => {
    const r = await api.post<AgentThread>(`${BASE}/threads/`, payload)
    return r.data
  },
  update: async (id: string, payload: Partial<Pick<AgentThread, 'title' | 'pinned' | 'archived'>>) => {
    const r = await api.patch<AgentThread>(`${BASE}/threads/${id}/`, payload)
    return r.data
  },
  destroy: async (id: string) => {
    await api.delete(`${BASE}/threads/${id}/`)
  },
}

  const ServiceCaseAPI = {
  list: async (params: {
    domain?: AgentDomain
    service_type?: string
    status?: string
    thread?: string
    merchant_id?: number
    page?: number
    page_size?: number
  } = {}) => {
    const r = await api.get<AgentPageEnvelope<ServiceCase>>(`${BASE}/service-cases/`, { params })
    return r.data
  },
  detail: async (id: string) => {
    const r = await api.get<ServiceCase>(`${BASE}/service-cases/${id}/`)
    return r.data
  },
  create: async (payload: { thread: string; service_type: string; title?: string }) => {
    const r = await api.post<ServiceCase>(`${BASE}/service-cases/`, payload)
    return r.data
  },
  update: async (id: string, payload: {
    status?: ServiceCaseStatus
    title?: string
    mark_read?: boolean
    assign_to_me?: boolean
    ai_reply_enabled?: boolean
  }) => {
    const r = await api.patch<ServiceCase>(`${BASE}/service-cases/${id}/`, payload)
    return r.data
  },
  sendMessage: async (id: string, content: string, attachmentIds: string[] = []) => {
    const r = await api.post<{ data?: { case: ServiceCase; message: AgentMessage }; case?: ServiceCase; message?: AgentMessage }>(
      `${BASE}/service-cases/${id}/messages/`,
      { content, attachment_ids: attachmentIds },
    )
    return (r.data as any)?.data || r.data
  },
}

  const AgentSuggestedPromptsAPI = {
  fetch: async (domain: AgentDomain) => {
    const r = await api.get(`${BASE}/suggested-prompts/`, { params: { domain } })
    return r.data?.data as { domain: string; persona: { title: string; greeting: string; tone: string }; prompts: string[] }
  },
}

  const AgentDomainsOverviewAPI = {
  fetch: async () => {
    const r = await api.get(`${BASE}/domains-overview/`)
    return r.data?.data as Record<string, { count: number; latest_title: string | null; latest_at: string | null }>
  },
}

  const AgentAttachmentAPI = {
  list: async (params?: any) => {
    const r = await api.get(`${BASE}/attachments/`, { params })
    return (r.data?.data?.items || r.data?.items || r.data || []) as AgentAttachment[]
  },
  upload: async (file: File, threadId?: string | null) => {
    const fd = new FormData()
    fd.append('file', file)
    if (threadId)
      fd.append('thread', threadId)
    const r = await api.post(`${BASE}/attachments/upload/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return r.data?.data?.attachment as AgentAttachment
  },
  organize: async (payload: any) => {
    const r = await api.post(`${BASE}/attachments/organize/`, payload)
    return r.data?.data || r.data
  },
  share: async (id: string) => {
    const r = await api.post(`${BASE}/attachments/${id}/share/`)
    return r.data?.data || r.data
  },
  revokeShare: async (id: string) => {
    await api.post(`${BASE}/attachments/${id}/unshare/`)
  },
  downloadUrl: (id: string) => `${BASE}/attachments/${id}/download/`,
  readTextFile: async (id: string) => {
    const r = await api.get(`${BASE}/attachments/${id}/text/`)
    return r.data?.data as { attachment: AgentAttachment; content: string }
  },
}

  const AgentGenerationTaskAPI = {
  list: async (params: { thread?: string; status?: string } = {}) => {
    const r = await api.get<AgentPageEnvelope<AgentGenerationTask>>(`${BASE}/generation-tasks/`, { params })
    return r.data
  },
  refresh: async (id: string) => {
    const r = await api.post(`${BASE}/generation-tasks/${id}/refresh/`)
    return r.data?.data?.task as AgentGenerationTask
  },
  retry: async (id: string) => {
    const r = await api.post(`${BASE}/generation-tasks/${id}/retry/`)
    return r.data?.data?.task as AgentGenerationTask
  },
}

  const AgentModelAvailabilityAPI = {
  fetch: async () => {
    const r = await api.get(`${BASE}/models/availability/`)
    const items = (r.data?.data?.items || []) as AgentModelAvailability[]
    return Object.fromEntries(items.map(item => [item.key, item])) as Record<string, AgentModelAvailability>
  },
}

  /**
   * 流式：POST /api/v1/agent/threads/{id}/stream/  body { content }
   * 返回 NDJSON 行流，BFF 全程透传。
   */
  async function* streamThreadChat(threadId: string, content: string, attachmentIds: string[] = [], model?: string | null): AsyncGenerator<StreamEvent, void, void> {
  const resp = await authFetch(`${BASE}/threads/${threadId}/stream/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, attachment_ids: attachmentIds, model: model || '' }),
  })
  if (!resp.ok || !resp.body) {
    let detail = ''
    try {
      const payload = await resp.json()
      detail = payload?.message || payload?.data?.message || ''
    }
    catch {}
    throw new Error(detail || `stream failed: ${resp.status}`)
  }
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed)
        continue
      try {
        yield JSON.parse(trimmed) as StreamEvent
        await Promise.resolve()
      }
      catch {
        // 忽略损坏行
      }
    }
  }
  if (buf.trim()) {
    try {
      yield JSON.parse(buf.trim()) as StreamEvent
      await Promise.resolve()
    }
    catch {}
  }
}

  return {
    AgentThreadAPI,
    ServiceCaseAPI,
    AgentSuggestedPromptsAPI,
    AgentDomainsOverviewAPI,
    AgentAttachmentAPI,
    AgentGenerationTaskAPI,
    AgentModelAvailabilityAPI,
    streamThreadChat,
  }
}
