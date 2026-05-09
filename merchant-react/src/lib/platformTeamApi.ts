import { platformApi } from './platformApi'

interface PlatformIdentityItem {
  id: number
  role: string
  display_name: string
  is_active: boolean
  user: {
    id: number
    email: string
    name: string
    avatar?: string
  }
}

export interface PlatformDirectoryMember {
  id: number
  is_active: boolean
  user: {
    id: number
    email: string
    name: string
    avatar?: string
  }
}

export const PlatformTeamAPI = {
  /** 平台员工目录。要求 ``Authorization: Bearer <platform access token>``。 */
  async listStaff(): Promise<{ items: PlatformDirectoryMember[]; total: number }> {
    const r = await platformApi.get('/api/v1/iam/platform/staff/')
    const rows = (r.data?.data?.items || []) as PlatformIdentityItem[]
    const items = rows.map(row => ({
      id: row.id,
      is_active: row.is_active,
      user: {
        id: row.user.id,
        email: row.user.email,
        name: row.display_name || row.user.name || row.user.email.split('@')[0] || `平台成员#${row.user.id}`,
        avatar: row.user.avatar,
      },
    }))
    return { items, total: items.length }
  },
}
