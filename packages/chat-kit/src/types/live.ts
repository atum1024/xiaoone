/**
 * 用户端「客户咨询」与「渠道」领域类型（Live / Channel）。
 */

export type LiveState = 'waiting' | 'active' | 'closed'
export type LiveChannel = 'web' | 'official_site' | 'telegram' | 'whatsapp' | 'wecom'

export interface LiveVisitor {
  id: string
  name: string
  email?: string
  avatar?: string
  locale: string
  identity_type?: 'anonymous' | 'logged_in'
  identity_key?: string
  external_user_id?: string
  channel?: string
  store_id?: string
  is_demo: boolean
}

export interface LiveAttachmentMeta {
  id: string
  name: string
  size: number
  content_type: string
  kind: 'image' | 'video' | 'file'
  conversation_id: string
}

export interface LiveMessage {
  id: string
  conversation: string
  sender_role: 'visitor' | 'agent' | 'system' | 'bot'
  sender_id: string
  sender_name: string
  content: string
  content_translated?: string
  content_type: string
  metadata: Record<string, any>
  delivered_at: string | null
  read_at: string | null
  is_demo: boolean
  created_at: string
  client_message_id?: string
}

export interface LiveConversation {
  id: string
  merchant_id: number
  channel: LiveChannel
  external_thread_id: string
  /** IAM 视角下的接管客服 user_id（takeover/agent.send 时写入） */
  assigned_agent_id: number | null
  state: LiveState
  subject: string
  last_message_at: string | null
  closed_at: string | null
  visitor: LiveVisitor
  last_message_preview: string
  /** 客服未读的访客消息条数（read_at 为空） */
  visitor_unread_count?: number
  store_id: string
  store_name: string
  skill_id: string
  skill_name: string
  /** kefu 客服档案的指派（KefuAgent.id） */
  assigned_kefu_agent_id: number | null
  assigned_kefu_agent_name: string
  tags: string[]
  note: string
  is_demo: boolean
  created_at: string
  updated_at: string
}

/** 客户咨询面板可改写的业务字段子集（不含 closed —— closed 走 /close/ action） */
export type LiveConversationPatch = Partial<Pick<LiveConversation,
  | 'store_id' | 'store_name'
  | 'skill_id' | 'skill_name'
  | 'assigned_kefu_agent_id' | 'assigned_kefu_agent_name'
  | 'tags' | 'note' | 'subject'
>> & { state?: 'waiting' | 'active' }

export interface LiveConversationDetail extends LiveConversation {
  messages: LiveMessage[]
  messages_page?: {
    limit: number
    has_more: boolean
    before_cursor: string
    newest_cursor: string
  }
  /** 消息历史中出现过的客服显示名（归档/统计用） */
  participant_agents?: string[]
}

/** 合并 REST/WS 片段时跳过 undefined，避免不完整 payload 覆盖 state 等字段。 */
export function assignDefined(target: object, patch: Record<string, unknown>): void {
  const t = target as Record<string, unknown>
  for (const key of Object.keys(patch)) {
    const v = patch[key]
    if (v !== undefined)
      t[key] = v
  }
}

export interface PageEnvelope<T> { items: T[]; total: number; page: number; page_size: number }

export type ChannelProvider = 'telegram' | 'whatsapp' | 'wecom'

export interface ChannelAccount {
  id: string
  merchant_id: number
  provider: ChannelProvider
  name: string
  webhook_token: string
  webhook_url: string
  credentials: Record<string, any>
  extras: Record<string, any>
  enabled: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}
