import { useEffect, useState, useMemo } from 'react'
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Switch, InputNumber, Badge, DataTable, Tooltip, TooltipContent, TooltipTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  toast, Empty
} from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import { Icon } from '../../components/Icon'
import { getChatKit, type Skill } from '@xiaoone/chat-kit'
import { TeamAPI, type TeamMember } from '../../lib/teamApi'
import { useAuthStore as useAuth } from '../../store/auth'
import { useWorkspaceStore } from '../../store/workspace'
import './team-members-panel.css'

const ROLE_LABEL: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  agent: '客服',
  viewer: '只读',
}

const ROLE_TYPE: Record<string, string> = {
  owner: 'text-red-500 border-red-200',
  admin: 'text-amber-500 border-amber-200',
  agent: 'text-blue-500 border-blue-200',
  viewer: 'text-gray-500 border-gray-200',
}

export function TeamMembersPanel({ embedded = false }: { embedded?: boolean }) {
  const auth = useAuth()
  const ws = useWorkspaceStore()
  const { SkillAPI } = getChatKit()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [myRole, setMyRole] = useState('')
  const [myUserId, setMyUserId] = useState(0)
  const [allRoles, setAllRoles] = useState<string[]>(['owner', 'admin', 'agent', 'viewer'])

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'agent', password: '' })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ email: string; password?: string } | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'agent' as TeamMember['role'],
    password: '',
    can_serve_live_chat: true,
    kefu_max_concurrent: 5,
    kefu_skill_ids: [] as number[],
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await TeamAPI.list()
      setMembers(r.items)
      setCanManage(r.self.can_manage)
      setMyRole(r.self.role)
      setMyUserId(r.self.user_id)
      if (r.roles?.length) setAllRoles(r.roles)
      if (r.self.can_manage) {
        try {
          const sk = await SkillAPI.list({ page_size: 200 })
          setSkills(sk.items)
        } catch {
          setSkills([])
        }
      }
    } catch (e: any) {
      toast({ title: '加载团队失败', description: e?.message || '未知错误' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = members
    if (filterStatus === 'active') list = list.filter(m => m.is_active)
    if (filterStatus === 'inactive') list = list.filter(m => !m.is_active)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(m => (m.user.email || '').toLowerCase().includes(q) || (m.user.name || '').toLowerCase().includes(q))
    return list
  }, [members, filterStatus, search])

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter(m => m.is_active).length,
    inactive: members.filter(m => !m.is_active).length,
    admins: members.filter(m => m.is_active && (m.role === 'owner' || m.role === 'admin')).length,
  }), [members])

  const avatarLabel = (m: TeamMember) => (m.user.name || m.user.email || '？').slice(0, 1).toUpperCase()
  const isSelf = (m: TeamMember) => m.user.id === myUserId

  const openInvite = () => {
    setInviteForm({ email: '', name: '', role: 'agent', password: '' })
    setInviteResult(null)
    setInviteOpen(true)
  }

  const submitInvite = async () => {
    const email = inviteForm.email.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast({ title: '请输入正确的邮箱' })
      return
    }
    setInviteSubmitting(true)
    try {
      const member = await TeamAPI.invite({
        email,
        name: inviteForm.name.trim(),
        role: inviteForm.role,
        password: inviteForm.password || undefined,
      })
      toast({ title: '成员已加入团队' })
      setInviteResult({
        email,
        password: member.initial_password || (inviteForm.password ? undefined : '（已发送邀请，使用现有密码）'),
      })
      load()
    } catch (e: any) {
      toast({ title: '邀请失败', description: e?.message || '未知错误' })
    } finally {
      setInviteSubmitting(false)
    }
  }

  const openEdit = (m: TeamMember) => {
    setEditTarget(m)
    setEditForm({
      name: m.user.name || '',
      role: m.role,
      password: '',
      can_serve_live_chat: m.role === 'viewer' ? false : (m.can_serve_live_chat !== false),
      kefu_max_concurrent: m.kefu_max_concurrent ?? 5,
      kefu_skill_ids: [...(m.kefu_skill_ids || [])],
    })
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!editTarget) return
    setEditSubmitting(true)
    try {
      const payload: any = {}
      if ((editForm.name || '').trim() !== (editTarget.user.name || '')) payload.name = editForm.name.trim()
      if (editForm.role !== editTarget.role) payload.role = editForm.role
      if (editForm.password) payload.password = editForm.password
      if (editForm.role !== 'viewer') {
        const prevServe = editTarget.role === 'viewer' ? false : (editTarget.can_serve_live_chat !== false)
        if (editForm.can_serve_live_chat !== prevServe) payload.can_serve_live_chat = editForm.can_serve_live_chat
        if (editForm.kefu_max_concurrent !== (editTarget.kefu_max_concurrent ?? 5)) payload.kefu_max_concurrent = editForm.kefu_max_concurrent
        const prevSk = [...(editTarget.kefu_skill_ids || [])].sort().join(',')
        const nextSk = [...editForm.kefu_skill_ids].sort().join(',')
        if (prevSk !== nextSk) payload.kefu_skill_ids = [...editForm.kefu_skill_ids]
      }
      if (Object.keys(payload).length === 0) {
        toast({ title: '未做任何修改' })
        setEditOpen(false)
        return
      }
      await TeamAPI.update(editTarget.id, payload)
      toast({ title: '已更新' })
      setEditOpen(false)
      load()
    } catch (e: any) {
      toast({ title: '更新失败', description: e?.message || '未知错误' })
    } finally {
      setEditSubmitting(false)
    }
  }

  const setActive = async (m: TeamMember, active: boolean) => {
    try {
      if (active) await TeamAPI.update(m.id, { is_active: true })
      else await TeamAPI.deactivate(m.id)
      toast({ title: active ? '已启用' : '已停用' })
      load()
    } catch (e: any) {
      toast({ title: '操作失败', description: e?.message || '未知错误' })
    }
  }

  const resetPwd = async (m: TeamMember) => {
    try {
      const r = await TeamAPI.resetPassword(m.id)
      alert(`${m.user.email} 的新密码：\n\n${r.password}\n\n请尽快通过安全渠道传递给该成员，并提醒首次登录后立即修改。`)
    } catch (e: any) {
      toast({ title: '重置失败', description: e?.message || '未知错误' })
    }
  }

  const columns = [
    {
      key: 'member',
      title: '成员',
      width: 240,
      render: (row: TeamMember) => (
        <div className="cell-member">
          <span className="ava">{avatarLabel(row)}</span>
          <div className="cell-info">
            <div className="cell-line">
              <strong>{row.user.name || row.user.email.split('@')[0]}</strong>
              {isSelf(row) && <Badge variant="outline" className="rounded-full text-xs">我</Badge>}
              {row.user.is_demo && <Badge variant="outline" className="rounded-full text-xs text-amber-500 border-amber-200">示例</Badge>}
            </div>
            <div className="cell-email">{row.user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: '角色',
      width: 120,
      render: (row: TeamMember) => (
        <Badge variant="outline" className={`rounded-full ${ROLE_TYPE[row.role] || 'text-gray-500'}`}>
          {ROLE_LABEL[row.role] || row.role}
        </Badge>
      )
    },
    {
      key: 'kefu',
      title: '客户咨询',
      width: 108,
      render: (row: TeamMember) => {
        if (row.role === 'viewer') return <span className="muted">—</span>
        return (
          <Badge variant="outline" className={`rounded-full ${row.can_serve_live_chat !== false ? 'text-green-500 border-green-200' : 'text-gray-500 border-gray-200'}`}>
            {row.can_serve_live_chat !== false ? '可接待' : '仅后台'}
          </Badge>
        )
      }
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: TeamMember) => (
        <Badge variant="outline" className={`rounded-full ${row.is_active ? 'text-green-500 border-green-200' : 'text-gray-500 border-gray-200'}`}>
          {row.is_active ? '活跃' : '已停用'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      title: '加入时间',
      width: 180,
      render: (row: TeamMember) => <span className="muted">{row.created_at ? new Date(row.created_at).toLocaleString('zh-CN', { hour12: false }) : '—'}</span>
    },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      render: (row: TeamMember) => (
        <div className="cell-actions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSelf(row) || !row.is_active} onClick={() => ws.enterTeamCommunications('dm')}>
                <Icon name="chat" size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>发起私聊</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Icon name="more" size={14} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canManage} onClick={() => openEdit(row)}>编辑成员</DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => resetPwd(row)}>重置密码</DropdownMenuItem>
              {row.is_active ? (
                <DropdownMenuItem disabled={!canManage || isSelf(row)} onClick={() => {
                  if (confirm(`确定停用 ${row.user.email}？该成员将无法再登录商户后台，但历史记录会保留。`)) setActive(row, false)
                }} className="text-red-500 focus:text-red-500">停用账号</DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={!canManage} onClick={() => setActive(row, true)}>启用账号</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ]

  return (
    <section className={`apage ${embedded ? 'apage--embedded' : ''}`}>
      {!embedded ? (
        <APageHeader
          root="团队管理"
          group="成员"
          title="团队成员管理"
          description={canManage ? '管理员可管理成员账号，并配置是否接待「客户咨询」、并发上限与技能组（与客服系统同步）。' : '只有所有者 / 管理员可以管理成员；其他角色仅可查看团队列表与彼此聊天。'}
          iconName="users"
          service="iam service"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>刷新</Button>
              {canManage && <Button size="sm" onClick={openInvite}>邀请成员</Button>}
            </>
          }
        />
      ) : (
        <div className="tm-embed-toolbar">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>刷新</Button>
          {canManage && <Button size="sm" onClick={openInvite}>邀请成员</Button>}
        </div>
      )}

      <div className="apage-body">
        <div className="stats">
          <div className="stat-card">
            <small>团队总人数</small>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <small>活跃成员</small>
            <strong>{stats.active}</strong>
          </div>
          <div className="stat-card">
            <small>已停用</small>
            <strong>{stats.inactive}</strong>
          </div>
          <div className="stat-card">
            <small>管理员</small>
            <strong>{stats.admins}</strong>
          </div>
          <div className="stat-card self">
            <small>当前角色</small>
            <strong>
              <Badge variant="outline" className={`rounded-full ${ROLE_TYPE[myRole] || 'text-gray-500'}`}>
                {ROLE_LABEL[myRole] || myRole || '—'}
              </Badge>
            </strong>
          </div>
        </div>

        {!canManage && (
          <div className="hint-card">
            <Icon name="user" size={14} />
            <span>当前账号没有团队管理权限，新增 / 修改 / 停用功能仅对所有者和管理员开放。</span>
          </div>
        )}

        <div className="toolbar">
          <div className="relative w-[260px]">
            <span className="absolute left-3 top-2 text-[var(--xiaoone-fg-mute)]"><Icon name="search" size={14} /></span>
            <Input
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索姓名 / 邮箱…"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="inactive">已停用</SelectItem>
            </SelectContent>
          </Select>
          <span className="toolbar-info">{filtered.length} / {members.length} 位成员</span>
        </div>

        <div className="table-wrap">
          <DataTable columns={columns} data={filtered} rowKey={r => String(r.id)} emptyText={loading ? '加载中…' : '暂无团队成员'} />
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>邀请团队成员</DialogTitle>
          </DialogHeader>
          {!inviteResult ? (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">邮箱（用作登录账号）<span className="text-red-500">*</span></label>
                <Input value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="member@example.com" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">显示名称</label>
                <Input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="留空则使用邮箱前缀" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">角色</label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allRoles.map(r => (
                      <SelectItem key={r} value={r} disabled={r === 'owner' && myRole !== 'owner'}>{ROLE_LABEL[r] || r} · {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">初始密码（可选）</label>
                <Input type="password" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="留空则系统自动生成" />
              </div>
              <small className="hint">若邮箱已存在，将直接加入当前商户；不会覆盖已有密码。</small>
            </div>
          ) : (
            <div className="invite-done">
              <div className="ok"><Icon name="user" size={22} /></div>
              <strong>{inviteResult.email} 已加入团队</strong>
              {inviteResult.password && (
                <p>
                  初始密码：<code>{inviteResult.password}</code><br/>
                  <small className="text-xs text-[var(--xiaoone-fg-mute)]">请尽快通过安全渠道传递给该成员，并提醒首次登录后立即修改。</small>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{inviteResult ? '关闭' : '取消'}</Button>
            {!inviteResult && <Button onClick={submitInvite} disabled={inviteSubmitting}>确认邀请</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? `编辑：${editTarget.user.email}` : '编辑成员'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <label className="text-sm font-medium">显示名称</label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">角色</label>
              <Select value={editForm.role} onValueChange={(v: any) => {
                setEditForm({ ...editForm, role: v, can_serve_live_chat: v === 'viewer' ? false : editForm.can_serve_live_chat })
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allRoles.map(r => (
                    <SelectItem key={r} value={r} disabled={r === 'owner' && myRole !== 'owner'}>{ROLE_LABEL[r] || r} · {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">重置密码（可选）</label>
              <Input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="留空则不修改密码" />
            </div>
            
            {editForm.role !== 'viewer' && (
              <>
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-[var(--xiaoone-border)]"></div>
                  <span className="text-xs text-[var(--xiaoone-fg-mute)] font-medium">客户咨询</span>
                  <div className="flex-1 h-px bg-[var(--xiaoone-border)]"></div>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">接待客户咨询</label>
                  <div className="flex items-center space-x-2">
                    <Switch checked={editForm.can_serve_live_chat} onCheckedChange={v => setEditForm({ ...editForm, can_serve_live_chat: v })} />
                    <span className="text-sm">{editForm.can_serve_live_chat ? '开启' : '关闭'}</span>
                  </div>
                  <small className="hint">开启后同步到客服系统，可在会话中作为可指派客服出现。</small>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">并发会话上限</label>
                  <InputNumber value={editForm.kefu_max_concurrent} onChange={v => setEditForm({ ...editForm, kefu_max_concurrent: v || 5 })} min={1} max={50} />
                </div>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">技能组</label>
                  <Select value={editForm.kefu_skill_ids.join(',')} onValueChange={(val) => {
                    const ids = val ? val.split(',').map(Number) : []
                    setEditForm({ ...editForm, kefu_skill_ids: ids })
                  }}>
                    <SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                    <SelectContent>
                      {skills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
