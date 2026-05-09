import type { AxiosInstance } from 'axios'

export interface KefuPageEnvelope<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

interface OkEnvelope<T> {
  code: number
  message: string
  data: T
}

// ============= 模型类型 =============

export interface Store {
  id: number
  name: string
  slug: string
  domain: string
  description: string
  welcome_message: string
  timezone: string
  is_active: boolean
  is_demo: boolean
  merchant_id: number
  products_count: number
  has_sdk: boolean
  created_at: string
  updated_at: string
}

export interface StoreSDKConfig {
  id: number
  store: number
  store_name: string
  app_id: string
  app_secret: string
  merchant_display_label?: string
  visitor_channel_label?: string
  visitor_entry_url?: string
  visitor_qr_image_url?: string
  theme: 'auto' | 'light' | 'dark' | 'brand'
  primary_color: string
  bubble_position: string
  enable_translation: boolean
  allowed_origins: string
  auto_reply_enabled: boolean
  auto_reply_model_key: string
  auto_reply_knowledge_mode: 'relaxed' | 'balanced' | 'strict'
  status_waiting_label: string
  status_active_label: string
  status_closed_label: string
  is_demo: boolean
  merchant_id: number
}

export type SDKConfig = StoreSDKConfig

export interface Product {
  id: number
  store: number
  store_name: string
  sku: string
  name: string
  price_cents: number
  price: string
  currency: string
  image_url: string
  description: string
  is_active: boolean
  is_demo: boolean
}

export interface QuickReply {
  id: number
  store: number | null
  store_name: string
  title: string
  content: string
  tags: string
  sort_order: number
  is_demo: boolean
}

export interface Skill {
  id: number
  name: string
  description: string
  dispatch_strategy: 'round_robin' | 'least_busy' | 'manual'
  timezone: string
  work_hours: string
  is_active: boolean
  agents_count: number
  is_demo: boolean
}

export type CorpusEntryType = 'project_source' | 'project_doc' | 'product_info' | 'memory' | 'faq' | 'policy' | 'manual'
export type CorpusChannel = 'all' | 'web' | 'official_site' | 'telegram' | 'whatsapp' | 'wecom'

export interface CorpusSource {
  id: number
  store: number | null
  store_name: string
  name: string
  source_type: 'manual' | 'upload' | 'product' | 'quick_reply' | 'skill'
  file?: string
  original_filename: string
  content_text: string
  summary: string
  status: 'ready' | 'processing' | 'failed'
  error_message: string
  chunks_count: number
  entries_count: number
  metadata?: Record<string, any>
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface CorpusEntry {
  id: number
  store: number | null
  store_name: string
  channel: CorpusChannel
  source: number | null
  source_name: string
  entry_type: CorpusEntryType
  title: string
  question: string
  answer: string
  content: string
  keywords: string
  confidence: number
  sort_order: number
  is_active: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface CorpusMatch {
  score: number
  matched_terms: string[]
  entry: CorpusEntry
}

export function createKefuApi(api: AxiosInstance) {
  async function unwrap<T>(p: Promise<{ data: OkEnvelope<T> }>): Promise<T> {
    const r = await p
    return r.data.data
  }

  const BASE = '/api/v1/kefu'

  function listFactory<T>(path: string) {
  return async (params: Record<string, any> = {}) => {
    const r = await api.get<KefuPageEnvelope<T>>(`${BASE}${path}`, { params })
    return r.data
  }
}

  function detailFactory<T>(path: string) {
  return async (id: number | string) => {
    const r = await api.get<T>(`${BASE}${path}${id}/`)
    return r.data
  }
}

  function createFactory<T>(path: string) {
  return async (payload: Partial<T>) => {
    const r = await api.post<T>(`${BASE}${path}`, payload)
    return r.data
  }
}

  function updateFactory<T>(path: string) {
  return async (id: number | string, payload: Partial<T>) => {
    const r = await api.patch<T>(`${BASE}${path}${id}/`, payload)
    return r.data
  }
}

  function destroyFactory(path: string) {
  return async (id: number | string) => {
    await api.delete(`${BASE}${path}${id}/`)
  }
}

// ============= 各资源的便捷 API =============

  const StoreAPI = {
  list: listFactory<Store>('/stores/'),
  detail: detailFactory<Store>('/stores/'),
  create: createFactory<Store>('/stores/'),
  update: updateFactory<Store>('/stores/'),
  destroy: destroyFactory('/stores/'),
}

  const SDKConfigAPI = {
  list: listFactory<SDKConfig>('/sdk-config/'),
  create: createFactory<SDKConfig>('/sdk-config/'),
  update: updateFactory<SDKConfig>('/sdk-config/'),
  destroy: destroyFactory('/sdk-config/'),
  regenerate: async (id: number) => {
    const r = await api.post<SDKConfig>(`${BASE}/sdk-config/${id}/regenerate/`)
    return r.data
  },
}

  const ProductAPI = {
  list: listFactory<Product>('/products/'),
  create: createFactory<Product>('/products/'),
  update: updateFactory<Product>('/products/'),
  destroy: destroyFactory('/products/'),
}

  const QuickReplyAPI = {
  list: listFactory<QuickReply>('/quick-replies/'),
  create: createFactory<QuickReply>('/quick-replies/'),
  update: updateFactory<QuickReply>('/quick-replies/'),
  destroy: destroyFactory('/quick-replies/'),
}

  const SkillAPI = {
  list: listFactory<Skill>('/skills/'),
  create: createFactory<Skill>('/skills/'),
  update: updateFactory<Skill>('/skills/'),
  destroy: destroyFactory('/skills/'),
}

  const CorpusAPI = {
  list: listFactory<CorpusEntry>('/corpus/'),
  create: createFactory<CorpusEntry>('/corpus/'),
  update: updateFactory<CorpusEntry>('/corpus/'),
  destroy: destroyFactory('/corpus/'),
  search: async (payload: { query: string; store_id?: string | number; channel?: CorpusChannel; limit?: number }) =>
    unwrap(api.post<OkEnvelope<{ query: string; items: CorpusMatch[]; suggestion: string }>>(`${BASE}/corpus/search/`, payload)),
  importLegacy: async () =>
    unwrap(api.post<OkEnvelope<{ created: number }>>(`${BASE}/corpus/import-legacy/`, {})),
}

  const CorpusSourceAPI = {
  list: listFactory<CorpusSource>('/corpus-sources/'),
  create: createFactory<CorpusSource>('/corpus-sources/'),
  update: updateFactory<CorpusSource>('/corpus-sources/'),
  destroy: destroyFactory('/corpus-sources/'),
  upload: async (payload: { file: File; name?: string; store?: number | null }) => {
    const fd = new FormData()
    fd.append('file', payload.file)
    if (payload.name) fd.append('name', payload.name)
    if (payload.store) fd.append('store', String(payload.store))
    return unwrap(api.post<OkEnvelope<{ source: CorpusSource; created_entries: number; generation_method?: string }>>(`${BASE}/corpus-sources/upload/`, fd))
  },
  paste: async (payload: { name?: string; content_text: string; store?: number | null }) =>
    unwrap(api.post<OkEnvelope<{ source: CorpusSource; created_entries: number; generation_method?: string }>>(`${BASE}/corpus-sources/paste/`, payload)),
  generate: async (id: number, payload: { use_ai?: boolean; store?: number | null; channel?: CorpusChannel } = { use_ai: true }) =>
    unwrap(api.post<OkEnvelope<{ source: CorpusSource; created_entries: number; generation_method?: string }>>(`${BASE}/corpus-sources/${id}/generate/`, payload)),
  generateSelected: async (payload: { source_ids: number[]; use_ai?: boolean; store?: number | null; channel?: CorpusChannel }) =>
    unwrap(api.post<OkEnvelope<{ created_entries: number; processed_sources: number; failed: Array<{ id: number; name: string; error: string }>; generation_method?: string }>>(`${BASE}/corpus-sources/generate-selected/`, payload)),
}

  const KefuChannelsOverviewAPI = {
    fetch: async () => unwrap(api.get<OkEnvelope<any>>(`${BASE}/channels-overview/`)),
  }

  return {
    StoreAPI,
    SDKConfigAPI,
    ProductAPI,
    QuickReplyAPI,
    SkillAPI,
    CorpusAPI,
    CorpusSourceAPI,
    KefuChannelsOverviewAPI,
  }
}
