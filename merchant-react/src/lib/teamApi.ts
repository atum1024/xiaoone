import { api } from './httpClient'

export interface TeamMember {
  id: number
  merchant: number
  user: {
    id: number
    email: string
    name: string
    avatar?: string
    created_at?: string
    phone?: string
  }
  role: 'owner' | 'admin' | 'agent' | 'viewer' | string
  is_active: boolean
  created_at: string
  online?: boolean
  initial_password?: string
  /** 是否可接待「客户咨询」（viewer 恒为 false） */
  can_serve_live_chat?: boolean
  kefu_max_concurrent?: number
  kefu_skill_ids?: number[]
  kefu_agent_id?: number | null
  menu_permissions?: string[]
  effective_menu_permissions?: string[]
}

export interface MenuPermissionOption {
  id: string
  label: string
  route: string
}

export interface TeamListResponse {
  items: TeamMember[]
  total: number
  self: { user_id: number; role: string; can_manage: boolean }
  roles: string[]
  menu_options?: MenuPermissionOption[]
}

export interface TeamMemberAddResponse {
  member: TeamMember
  created: boolean
}

export type TeamMemberAddPayload = {
  email: string
  name?: string
  role?: string
  password?: string
  menu_permissions?: string[]
  kefu_max_concurrent?: number
}

export const TeamAPI = {
  async list(): Promise<TeamListResponse> {
    const r = await api.get('/api/v1/iam/team/')
    return r.data.data
  },
  async add(payload: TeamMemberAddPayload): Promise<TeamMemberAddResponse> {
    const r = await api.post('/api/v1/iam/team/', payload)
    return r.data.data
  },
  async invite(payload: TeamMemberAddPayload): Promise<TeamMember> {
    const r = await api.post('/api/v1/iam/team/', payload)
    return r.data.data.member
  },
  async update(memberId: number, payload: Partial<{
    name: string
    email: string
    role: string
    is_active: boolean
    password: string
    can_serve_live_chat: boolean
    kefu_max_concurrent: number
    kefu_skill_ids: number[]
    menu_permissions: string[]
  }>): Promise<TeamMember> {
    const r = await api.patch(`/api/v1/iam/team/${memberId}/`, payload)
    return r.data.data.member
  },
  async deactivate(memberId: number): Promise<TeamMember> {
    const r = await api.delete(`/api/v1/iam/team/${memberId}/`)
    return r.data.data.member
  },
  async resetPassword(memberId: number, password?: string): Promise<{ password: string; member_id: number; user_id: number }> {
    const r = await api.post(`/api/v1/iam/team/${memberId}/reset-password/`, password ? { password } : {})
    return r.data.data
  },
}
