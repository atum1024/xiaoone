import type { AxiosInstance } from 'axios'

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type AgentDomain = 'marketing' | 'support' | 'agency' | 'feedback' | 'general'

export interface AgentVideoTemplateState {
  id: string
  label: string
  category: 'clean' | 'commerce' | 'portrait' | 'brand' | 'social'
  virtualPortraitPolicy: 'allowed' | 'blocked'
}

export interface AgentComposerState {
  video_template?: AgentVideoTemplateState
}

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
  composer_state?: AgentComposerState
  message_count: number
  preview: string
  active_generation_count: number
  latest_generation_status: AgentGenerationTask['status'] | ''
  latest_generation_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentDomainsOverviewEntry {
  count: number
  latest_title: string | null
  latest_at: string | null
  latest_thread_updated_at: string | null
}

export interface AgentMessage {
  id: string
  thread: string
  parent_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  content_preview?: string
  status: 'done' | 'streaming' | 'error'
  model: string
  prompt_tokens: number
  completion_tokens: number
  finish_reason: string
  metadata?: {
    runtime?: {
      thinking_ms?: number
      execution_ms?: number
      total_ms?: number
      source?: string
      operation?: string
      artifacts?: Array<{
        type?: string
        name?: string
        mime_type?: string
        content_type?: string
        size?: number
        url?: string
        storage?: string
        slide_count?: number
      }>
      presentation?: {
        plan?: {
          title?: string
          subtitle?: string
          theme?: { primary?: string; accent?: string; background?: string; text?: string }
          slide_count?: number
          slides?: Array<{
            title?: string
            subtitle?: string
            bullets?: string[]
            speaker_notes?: string
            visual_prompt?: string
          }>
          options?: {
            template?: string
            ratio?: '16:9' | '4:3'
            tone?: string
            slides?: number
          }
        }
        upstream?: { provider?: string; model?: string; upstream_used?: boolean; warning?: string }
      }
    }
    [key: string]: any
  }
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
  result: {
    attempt_started_at?: string
    generation_options?: Record<string, any>
    artifacts?: any[]
    raw?: any
    [key: string]: any
  } | null
  raw_response: any
  error_message: string
  /** 失败分桶：concurrency_limit | insufficient_balance | bad_api_key | invalid_parameters | reference_download_failed | upstream_timeout | content_policy | network_error | rate_limited | unknown | '' */
  error_code: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentMaterialAsset {
  id: string
  source: 'generation_task' | 'message_artifact' | 'user_upload'
  kind: 'image' | 'video' | 'presentation' | 'file'
  name: string
  mime_type: string
  status: AgentGenerationTask['status'] | 'succeeded'
  thread: string
  thread_title: string
  message: string
  task: string
  provider: string
  model: string
  model_key: string
  prompt: string
  url: string
  preview_url: string
  thumbnail_url?: string
  cover_url?: string
  playback_url?: string
  preview_error_code?: string
  width?: number
  height?: number
  duration_ms?: number
  download_url: string
  created_at: string
  updated_at: string
  completed_at: string | null
  error_message: string
  artifact_index: number
}

export interface AgentModelAvailability {
  key: string
  provider: string
  modality: 'text' | 'image' | 'video'
  available: boolean
  status: 'available' | 'unconfigured' | 'unsupported' | 'disabled' | 'hidden' | string
  reason: string
}

export interface AgentVideoGenerationOptions {
  style_mode?: 'rich' | 'clean'
  frame_mode?: 'first' | 'first_last'
  ratio?: 'auto' | '9:16' | '16:9' | '1:1' | '3:4' | '4:3' | '2:3' | '3:2' | '21:9'
  resolution?: '480p' | '720p' | '1080p' | '2K' | '4K'
  duration?: number
  count?: number
  generate_audio?: boolean
  reference_images?: Array<{
    url: string
    role?: 'reference_image' | 'first_frame' | 'last_frame'
    name?: string
    source?: 'ark_virtual_portrait' | string
  }>
  group_mode?: 'auto' | 'storybook' | 'comic'
  image_skill?: string
  role_counts?: Record<string, number>
  size?: string
  width?: number
  height?: number
  commerce_brief?: {
    product_name?: string
    brand?: string
    selling_points?: string
    specifications?: string
    materials?: string
    use_cases?: string
    compliance_notes?: string
  }
  sequential_image_generation?: 'auto' | 'disabled'
  sequential_image_generation_options?: { max_images?: number }
  target_language?: string
  video_skill?: string
  platform?: string
  subtitle?: boolean
  voiceover?: boolean
  cta?: string
  language?: string
  template_id?: string
  template_label?: string
  template_category?: string
  reference_assets?: Array<{
    asset_id: string
    role?: string
  }>
  shots?: Array<{
    role: string
    duration?: number
    prompt?: string
    caption?: string
  }>
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
  download_url?: string
  share_url?: string
  public_url?: string
  created_at: string
  updated_at: string
}

export interface AgentThreadDetail extends AgentThread {
  messages: AgentMessage[]
  attachments?: AgentAttachment[]
  service_case?: ServiceCase | null
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
  messages?: AgentMessage[]
  created_at: string
  updated_at: string
}

export interface AgentPageEnvelope<T> { items: T[]; total: number; page: number; page_size: number }

export interface StreamEvent {
  type?: 'thread_meta' | 'generation_task' | 'manual_takeover' | 'reasoning' | 'error'
  thread_id?: string
  user_message_id?: string
  assistant_message_id?: string
  delta?: string
  finish?: boolean
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model?: string
  message?: string
  generation_task?: AgentGenerationTask
  artifacts?: AgentMessage['metadata'] extends { runtime?: { artifacts?: infer A } } ? A : unknown[]
  presentation?: AgentMessage['metadata'] extends { runtime?: { presentation?: infer P } } ? P : Record<string, unknown>
  /** 服务端错误的 HTTP 等价状态（429 = 排队/限流），仅 error 行有效 */
  http_status?: number
  /** 服务端错误分桶，与 AgentGenerationTask.error_code 一致 */
  error_code?: string
}

/** 204 / 空 body 的 DELETE 若走默认 JSON transform，axios 可能对 '' 调用 JSON.parse 抛错。 */
function safeEmptyJsonTransform(data: unknown): unknown {
  if (data === '' || data === undefined || data === null)
    return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    }
    catch {
      return data
    }
  }
  return data
}

export function createAgentApi(api: AxiosInstance, authFetch: AuthFetch) {
  const BASE = '/api/v1/agent'
  const MEDIA_UPLOAD_TIMEOUT_MS = 120_000
  const GENERATION_RETRY_TIMEOUT_MS = 120_000

  const AgentThreadAPI = {
  list: async (
    params: { domain?: AgentDomain; archived?: boolean | string; search?: string; page_size?: number } = {},
    options: { signal?: AbortSignal } = {},
  ) => {
    const r = await api.get<AgentPageEnvelope<AgentThread>>(`${BASE}/threads/`, { params, signal: options.signal })
    return r.data
  },
  detail: async (id: string) => {
    const r = await api.get<AgentThreadDetail>(`${BASE}/threads/${id}/`)
    return r.data
  },
  create: async (payload: { domain: AgentDomain; title?: string; plugin_key?: string; mode_key?: string; model_key?: string; composer_state?: AgentComposerState }) => {
    const r = await api.post<AgentThread>(`${BASE}/threads/`, payload)
    return r.data
  },
  createAssistant: async (payload: { title?: string } = {}) => {
    const r = await api.post<AgentThread>(`${BASE}/threads/assistant-thread/`, payload)
    return r.data
  },
  update: async (id: string, payload: Partial<Pick<AgentThread, 'title' | 'pinned' | 'archived'>>) => {
    const r = await api.patch<AgentThread>(`${BASE}/threads/${id}/`, payload)
    return r.data
  },
  destroy: async (id: string) => {
    await api.delete(`${BASE}/threads/${id}/`, {
      transformResponse: [safeEmptyJsonTransform],
    })
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
  create: async (payload: { thread: string; service_type: string; title?: string; domain?: AgentDomain }) => {
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
  fetch: async (options: { signal?: AbortSignal } = {}) => {
    const r = await api.get(`${BASE}/domains-overview/`, { signal: options.signal })
    return r.data?.data as Record<string, AgentDomainsOverviewEntry>
  },
}

  const AgentSidebarThreadsAPI = {
  fetch: async (options: { signal?: AbortSignal } = {}) => {
    const r = await api.get(`${BASE}/sidebar-threads/`, { signal: options.signal })
    return r.data?.data as Record<AgentDomain, AgentThread[]>
  },
}

  const AgentAttachmentAPI = {
  list: async (params?: any) => {
    const r = await api.get(`${BASE}/attachments/`, { params })
    return (r.data?.data?.items || r.data?.items || r.data || []) as AgentAttachment[]
  },
  upload: async (file: File, threadId?: string | null, options?: { purpose?: string | null }) => {
    const fd = new FormData()
    fd.append('file', file)
    if (threadId)
      fd.append('thread', threadId)
    if (options?.purpose)
      fd.append('purpose', options.purpose)
    try {
      const r = await api.post(`${BASE}/attachments/upload/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: MEDIA_UPLOAD_TIMEOUT_MS,
      })
      return r.data?.data?.attachment as AgentAttachment
    } catch (error: any) {
      const status = error?.response?.status
      const body = error?.response?.data
      const code = body?.code || body?.data?.code || body?.error_code
      if (status === 413 || code === 'upload_too_large') {
        const limitMb = Number(body?.limit_mb || body?.data?.limit_mb || 120)
        const message = body?.message || body?.data?.message || `文件超过 ${limitMb}MB 上限，请压缩后再上传`
        const uploadError = new Error(message)
        ;(uploadError as any).status = 413
        ;(uploadError as any).code = 'upload_too_large'
        ;(uploadError as any).limit_mb = limitMb
        throw uploadError
      }
      throw error
    }
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
  publicDownloadUrl: (id: string) => `${BASE}/public/attachments/${id}/download/`,
  readTextFile: async (id: string) => {
    const r = await api.get(`${BASE}/attachments/${id}/text/`)
    return r.data?.data as { attachment: AgentAttachment; content: string }
  },
}

  const AgentGenerationTaskAPI = {
  list: async (params: { thread?: string; status?: string; page_size?: number } = {}) => {
    const r = await api.get<AgentPageEnvelope<AgentGenerationTask>>(`${BASE}/generation-tasks/`, { params })
    return r.data
  },
  assets: async (params: {
    thread?: string
    status?: string
    kind?: string
    source?: string
    search?: string
    sort?: 'asc' | 'desc'
    page?: number
    page_size?: number
  } = {}) => {
    const r = await api.get<{
      data?: {
        items?: AgentMaterialAsset[]
        count?: number
        total?: number
        page?: number
        page_size?: number
        has_more?: boolean
      }
      items?: AgentMaterialAsset[]
      count?: number
      total?: number
      page?: number
      page_size?: number
      has_more?: boolean
    }>(
      `${BASE}/material-assets/`,
      { params },
    )
    return (r.data?.data || r.data || {}) as {
      items?: AgentMaterialAsset[]
      count?: number
      total?: number
      page?: number
      page_size?: number
      has_more?: boolean
    }
  },
  refresh: async (id: string) => {
    const r = await api.post(`${BASE}/generation-tasks/${id}/refresh/`)
    return r.data?.data?.task as AgentGenerationTask
  },
  retry: async (id: string) => {
    const r = await api.post(`${BASE}/generation-tasks/${id}/retry/`, undefined, { timeout: GENERATION_RETRY_TIMEOUT_MS })
    return r.data?.data?.task as AgentGenerationTask
  },
  deleteAsset: async (id: string) => {
    await api.delete(`${BASE}/material-assets/${encodeURIComponent(id)}/`)
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
  async function* streamThreadChat(
    threadId: string,
    content: string,
    attachmentIds: string[] = [],
    model?: string | null,
    generationModelKey?: string | null,
    generationOptions?: AgentVideoGenerationOptions | null,
    maxTokens?: number | null,
    signal?: AbortSignal,
    clientMeta: { locale?: string; inputWasEmpty?: boolean } = {},
  ): AsyncGenerator<StreamEvent, void, void> {
  const resp = await authFetch(`${BASE}/threads/${threadId}/stream/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      content,
      attachment_ids: attachmentIds,
      model: model || '',
      generation_model_key: generationModelKey || '',
      generation_options: generationOptions || {},
      locale: clientMeta.locale || '',
      input_was_empty: Boolean(clientMeta.inputWasEmpty),
      max_tokens: typeof maxTokens === 'number' && Number.isFinite(maxTokens) ? Math.trunc(maxTokens) : undefined,
    }),
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
    AgentSidebarThreadsAPI,
    AgentAttachmentAPI,
    AgentGenerationTaskAPI,
    AgentModelAvailabilityAPI,
    streamThreadChat,
  }
}
