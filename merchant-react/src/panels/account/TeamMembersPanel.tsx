import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, PasswordInput, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Switch, InputNumber, Badge, DataTable,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  toast, Checkbox
} from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import { Icon } from '../../components/Icon'
import { TeamAPI, type TeamMember } from '../../lib/teamApi'
import { DEFAULT_SUBACCOUNT_MENU_PERMISSIONS, MENU_PERMISSION_OPTIONS, type MenuPermissionOption } from '../../app/menuPermissions'
import { isUserBlockedMenu } from '../../app/blockedMenus'
import { usePreferences } from '../../app/preferences'
import './team-members-panel.css'
import { DefaultAvatar } from '../../components/DefaultAvatar'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEAM_CONCURRENT_MIN = 1
const TEAM_CONCURRENT_MAX = 50

function validateConcurrentLimit(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isInteger(n) || n < TEAM_CONCURRENT_MIN || n > TEAM_CONCURRENT_MAX) return null
  return n
}

function normalizeTeamErrorMessage(error: any, t: (key: string, fallback?: string) => string, locale: string): string {
  const data = error?.response?.data || {}
  const detail = data?.data || {}
  const code = String(detail?.code || data?.code || data?.error || data?.message || '').trim()
  const message = String(data?.message || data?.error || error?.message || '').trim()
  if (code === 'team_seats_exceeded' || message === 'team_seats_exceeded') {
    const max = Number(detail?.team_seats_max || 0)
    const used = Number(detail?.team_seats_used || 0)
    return locale === 'zh'
      ? `团队席位已达上限（已用 ${used} / 上限 ${max}），请升级套餐或停用成员后再添加。`
      : `Team seat limit reached (${used}/${max}). Upgrade the plan or deactivate a member before adding another.`
  }
  if (/email already exists|already bound/i.test(message))
    return locale === 'zh' ? '该邮箱已被其他账号或商户使用。' : 'This email is already used by another account or merchant.'
  if (/email must be|invalid email|email is required/i.test(message))
    return t('account.team.toastInvalidEmail', '请输入正确的邮箱')
  if (/kefu_max_concurrent/i.test(message))
    return locale === 'zh' ? '并发会话上限需为 1-50 的整数。' : 'Concurrent session limit must be an integer from 1 to 50.'
  if (/permission|only owner|only owner\/admin/i.test(message))
    return locale === 'zh' ? '当前账号没有权限执行该团队操作。' : 'You do not have permission to perform this team action.'
  return message || t('account.common.unknownError')
}

const ROLE_TYPE: Record<string, string> = {
  owner: 'text-red-500 border-red-200',
  admin: 'text-amber-500 border-amber-200',
  agent: 'text-blue-500 border-blue-200',
  viewer: 'text-gray-500 border-gray-200',
}

export function TeamMembersPanel({ embedded = false }: { embedded?: boolean }) {
  const { t, tpl, locale } = usePreferences()
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US'
  const permSep = locale === 'zh' ? '、' : ', '

  const ROLE_LABEL: Record<string, string> = useMemo(() => ({
    owner: t('account.team.roleOwner'),
    admin: t('account.team.roleAdmin'),
    agent: t('account.team.roleAgent'),
    viewer: t('account.team.roleViewer'),
  }), [t])

  const [members, setMembers] = useState<TeamMember[]>([])
  const [menuOptions, setMenuOptions] = useState<MenuPermissionOption[]>(MENU_PERMISSION_OPTIONS)
  const [loading, setLoading] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [myRole, setMyRole] = useState('')
  const [myUserId, setMyUserId] = useState(0)
  const [allRoles, setAllRoles] = useState<string[]>(['owner', 'admin', 'agent', 'viewer'])

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'agent',
    password: '',
    kefu_max_concurrent: 5,
    menu_permissions: [...DEFAULT_SUBACCOUNT_MENU_PERMISSIONS],
  })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ email: string; password?: string; note?: string } | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null)
  const [editForm, setEditForm] = useState({
    email: '',
    name: '',
    role: 'agent' as TeamMember['role'],
    password: '',
    can_serve_live_chat: true,
    kefu_max_concurrent: 5,
    menu_permissions: [] as string[],
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
      if (r.menu_options?.length) setMenuOptions(r.menu_options.filter(opt => !isUserBlockedMenu(opt.id)))
    } catch (e: any) {
      toast({ title: t('account.team.toastLoadFailed'), description: e?.message || t('account.common.unknownError') })
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

  const isSelf = (m: TeamMember) => m.user.id === myUserId

  const openInvite = () => {
    setInviteForm({
      email: '',
      name: '',
      role: 'agent',
      password: '',
      kefu_max_concurrent: 5,
      menu_permissions: [...DEFAULT_SUBACCOUNT_MENU_PERMISSIONS],
    })
    setInviteResult(null)
    setInviteOpen(true)
  }

  const submitInvite = async () => {
    const email = inviteForm.email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) {
      toast({ title: t('account.team.toastInvalidEmail') })
      return
    }
    if (inviteForm.role !== 'owner' && inviteForm.menu_permissions.length === 0) {
      toast({ title: t('account.team.toastMinPermission') })
      return
    }
    if (inviteForm.role !== 'viewer' && inviteForm.role !== 'owner' && validateConcurrentLimit(inviteForm.kefu_max_concurrent) === null) {
      toast({
        title: t('account.team.concurrentLimit'),
        description: locale === 'zh' ? '并发会话上限需为 1-50 的整数。' : 'Concurrent session limit must be an integer from 1 to 50.',
      })
      return
    }
    setInviteSubmitting(true)
    try {
      const result = await TeamAPI.add({
        email,
        name: inviteForm.name.trim(),
        role: inviteForm.role,
        password: inviteForm.password || undefined,
        kefu_max_concurrent: inviteForm.kefu_max_concurrent,
        menu_permissions: inviteForm.role === 'owner' ? [] : [...inviteForm.menu_permissions],
      })
      const member = result.member
      toast({ title: t('account.team.toastMemberAdded') })
      setInviteResult({
        email,
        password: member.initial_password,
        note: member.initial_password
          ? undefined
          : (inviteForm.password ? t('account.team.usedYourPassword') : (result.created ? undefined : t('account.team.existingPassword'))),
      })
      load()
    } catch (e: any) {
      toast({ title: t('account.team.toastAddFailed'), description: normalizeTeamErrorMessage(e, t, locale) })
    } finally {
      setInviteSubmitting(false)
    }
  }

  const openEdit = (m: TeamMember) => {
    setEditTarget(m)
    setEditForm({
      email: m.user.email || '',
      name: m.user.name || '',
      role: m.role,
      password: '',
      can_serve_live_chat: m.role === 'viewer' ? false : (m.can_serve_live_chat !== false),
      kefu_max_concurrent: m.kefu_max_concurrent ?? 5,
      menu_permissions: [...(m.menu_permissions || m.effective_menu_permissions || DEFAULT_SUBACCOUNT_MENU_PERMISSIONS)].filter(id => !isUserBlockedMenu(id)),
    })
    setEditOpen(true)
  }

  const toggleInviteMenu = (id: string, checked: boolean) => {
    setInviteForm(prev => {
      const next = checked
        ? Array.from(new Set([...prev.menu_permissions, id]))
        : prev.menu_permissions.filter(x => x !== id)
      return { ...prev, menu_permissions: next }
    })
  }

  const toggleEditMenu = (id: string, checked: boolean) => {
    setEditForm(prev => {
      const next = checked
        ? Array.from(new Set([...prev.menu_permissions, id]))
        : prev.menu_permissions.filter(x => x !== id)
      return { ...prev, menu_permissions: next }
    })
  }

  const permissionSummary = useCallback((m: TeamMember) => {
    if (m.role === 'owner') return t('account.team.permissionsAll')
    const ids = m.effective_menu_permissions || m.menu_permissions || []
    if (!ids.length) return t('account.team.permissionsAll')
    const labels = menuOptions.filter(opt => ids.includes(opt.id)).map(opt => opt.label)
    if (labels.length <= 2) return labels.join(permSep) || t('account.team.permissionsNone')
    return tpl('account.team.permissionsMore', labels.slice(0, 2).join(permSep), String(labels.length))
  }, [t, tpl, menuOptions, permSep])

  const submitEdit = async () => {
    if (!editTarget) return
    const nextEmail = editForm.email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(nextEmail)) {
      toast({ title: t('account.team.toastInvalidEmail') })
      return
    }
    if (editForm.role !== 'owner' && editForm.menu_permissions.length === 0) {
      toast({ title: t('account.team.toastMinPermission') })
      return
    }
    if (editForm.role !== 'viewer' && editForm.role !== 'owner' && validateConcurrentLimit(editForm.kefu_max_concurrent) === null) {
      toast({
        title: t('account.team.concurrentLimit'),
        description: locale === 'zh' ? '并发会话上限需为 1-50 的整数。' : 'Concurrent session limit must be an integer from 1 to 50.',
      })
      return
    }
    setEditSubmitting(true)
    try {
      const payload: any = {}
      if (nextEmail !== (editTarget.user.email || '').toLowerCase()) payload.email = nextEmail
      if ((editForm.name || '').trim() !== (editTarget.user.name || '')) payload.name = editForm.name.trim()
      if (editForm.role !== editTarget.role) payload.role = editForm.role
      if (editForm.password) payload.password = editForm.password
      if (editForm.role !== 'owner') {
        const prevPerms = [...(editTarget.menu_permissions || editTarget.effective_menu_permissions || [])].sort().join(',')
        const nextPerms = [...editForm.menu_permissions].sort().join(',')
        if (prevPerms !== nextPerms) payload.menu_permissions = [...editForm.menu_permissions]
      }
      if (editForm.role !== 'viewer') {
        const prevServe = editTarget.role === 'viewer' ? false : (editTarget.can_serve_live_chat !== false)
        if (editForm.can_serve_live_chat !== prevServe) payload.can_serve_live_chat = editForm.can_serve_live_chat
        if (editForm.kefu_max_concurrent !== (editTarget.kefu_max_concurrent ?? 5)) payload.kefu_max_concurrent = editForm.kefu_max_concurrent
      }
      if (Object.keys(payload).length === 0) {
        toast({ title: t('account.team.toastNoChanges') })
        setEditOpen(false)
        return
      }
      await TeamAPI.update(editTarget.id, payload)
      toast({ title: t('account.team.toastUpdated') })
      setEditOpen(false)
      load()
    } catch (e: any) {
      toast({ title: t('account.team.toastUpdateFailed'), description: normalizeTeamErrorMessage(e, t, locale) })
    } finally {
      setEditSubmitting(false)
    }
  }

  const setActive = async (m: TeamMember, active: boolean) => {
    try {
      if (active) await TeamAPI.update(m.id, { is_active: true })
      else await TeamAPI.deactivate(m.id)
      toast({ title: active ? t('account.team.toastActivated') : t('account.team.toastDeactivated') })
      load()
    } catch (e: any) {
      toast({ title: t('account.team.toastActionFailed'), description: normalizeTeamErrorMessage(e, t, locale) })
    }
  }

  const resetPwd = async (m: TeamMember) => {
    try {
      const r = await TeamAPI.resetPassword(m.id)
      alert(tpl('account.team.resetPasswordAlert', m.user.email, r.password))
    } catch (e: any) {
      toast({ title: t('account.team.toastResetFailed'), description: normalizeTeamErrorMessage(e, t, locale) })
    }
  }

  const columns = useMemo(() => [
    {
      key: 'member',
      title: t('account.team.colMember'),
      width: 240,
      render: (row: TeamMember) => (
        <div className="cell-member">
          <DefaultAvatar src={row.user.avatar} className="ava" alt="" size={34} />
          <div className="cell-info">
            <div className="cell-line">
              <strong>{row.user.name || row.user.email.split('@')[0]}</strong>
              {isSelf(row) && <Badge variant="outline" className="rounded-full text-xs">{t('account.team.me')}</Badge>}
            </div>
            <div className="cell-email">{row.user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: t('account.team.colRole'),
      width: 120,
      render: (row: TeamMember) => (
        <Badge variant="outline" className={`rounded-full ${ROLE_TYPE[row.role] || 'text-gray-500'}`}>
          {ROLE_LABEL[row.role] || row.role}
        </Badge>
      )
    },
    {
      key: 'kefu',
      title: t('account.team.colLiveChat'),
      width: 108,
      render: (row: TeamMember) => {
        if (row.role === 'viewer') return <span className="muted">{t('account.common.notAvailable')}</span>
        return (
          <Badge variant="outline" className={`rounded-full ${row.can_serve_live_chat !== false ? 'text-green-500 border-green-200' : 'text-gray-500 border-gray-200'}`}>
            {row.can_serve_live_chat !== false ? t('account.team.canServe') : t('account.team.backofficeOnly')}
          </Badge>
        )
      }
    },
    {
      key: 'menu_permissions',
      title: t('account.team.colMenuPermissions'),
      width: 170,
      render: (row: TeamMember) => <span className="muted">{permissionSummary(row)}</span>
    },
    {
      key: 'status',
      title: t('account.team.colStatus'),
      width: 100,
      render: (row: TeamMember) => (
        <Badge variant="outline" className={`rounded-full ${row.is_active ? 'text-green-500 border-green-200' : 'text-gray-500 border-gray-200'}`}>
          {row.is_active ? t('account.team.active') : t('account.team.inactive')}
        </Badge>
      )
    },
    {
      key: 'created_at',
      title: t('account.team.colJoinedAt'),
      width: 180,
      render: (row: TeamMember) => (
        <span className="muted">
          {row.created_at ? new Date(row.created_at).toLocaleString(localeTag, { hour12: false }) : t('account.common.notAvailable')}
        </span>
      )
    },
    {
      key: 'actions',
      title: t('account.team.colActions'),
      width: 120,
      render: (row: TeamMember) => (
        <div className="cell-actions">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Icon name="more" size={14} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canManage} onClick={() => openEdit(row)}>{t('account.team.editMember')}</DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => resetPwd(row)}>{t('account.team.resetPassword')}</DropdownMenuItem>
              {row.is_active ? (
                <DropdownMenuItem disabled={!canManage || isSelf(row)} onClick={() => {
                  if (confirm(tpl('account.team.deactivateConfirm', row.user.email))) setActive(row, false)
                }} className="text-red-500 focus:text-red-500">{t('account.team.deactivate')}</DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={!canManage} onClick={() => setActive(row, true)}>{t('account.team.activate')}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ], [t, tpl, ROLE_LABEL, canManage, myUserId, permissionSummary, localeTag])

  return (
    <section className={`apage ${embedded ? 'apage--embedded' : ''}`}>
      {!embedded ? (
        <APageHeader
          root={t('account.team.root')}
          group={t('account.team.group')}
          title={t('account.team.title')}
          description={canManage ? t('account.team.descriptionManage') : t('account.team.descriptionView')}
          iconName="users"
          service="iam service"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>{t('account.common.refresh')}</Button>
              {canManage && <Button size="sm" onClick={openInvite}>{t('account.team.addMember')}</Button>}
            </>
          }
        />
      ) : (
        <div className="tm-embed-toolbar">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>{t('account.common.refresh')}</Button>
          {canManage && <Button size="sm" onClick={openInvite}>{t('account.team.addMember')}</Button>}
        </div>
      )}

      <div className="apage-body">
        <div className="stats">
          <div className="stat-card">
            <small>{t('account.team.totalMembers')}</small>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <small>{t('account.team.activeMembers')}</small>
            <strong>{stats.active}</strong>
          </div>
          <div className="stat-card">
            <small>{t('account.team.inactiveMembers')}</small>
            <strong>{stats.inactive}</strong>
          </div>
          <div className="stat-card">
            <small>{t('account.team.admins')}</small>
            <strong>{stats.admins}</strong>
          </div>
          <div className="stat-card self">
            <small>{t('account.team.currentRole')}</small>
            <strong>
              <Badge variant="outline" className={`rounded-full ${ROLE_TYPE[myRole] || 'text-gray-500'}`}>
                {ROLE_LABEL[myRole] || myRole || t('account.common.notAvailable')}
              </Badge>
            </strong>
          </div>
        </div>

        {!canManage && (
          <div className="hint-card">
            <Icon name="user" size={14} />
            <span>{t('account.team.noPermissionHint')}</span>
          </div>
        )}

        <div className="toolbar">
          <div className="tm-search-field">
            <span className="tm-search-field__icon"><Icon name="search" size={14} /></span>
            <Input
              className="tm-search-field__input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('account.team.searchPlaceholder')}
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('account.team.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('account.team.all')}</SelectItem>
              <SelectItem value="active">{t('account.team.active')}</SelectItem>
              <SelectItem value="inactive">{t('account.team.inactive')}</SelectItem>
            </SelectContent>
          </Select>
          <span className="toolbar-info">{tpl('account.team.memberCount', String(filtered.length), String(members.length))}</span>
        </div>

        <div className="table-wrap">
          <DataTable columns={columns} data={filtered} rowKey={r => String(r.id)} emptyText={loading ? t('account.common.loading') : t('account.team.noMembers')} />
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t('account.team.dialogAddTitle')}</DialogTitle>
          </DialogHeader>
          {!inviteResult ? (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.team.emailLabel')}<span className="text-red-500">*</span></label>
                <Input value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="member@example.com" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.team.displayName')}</label>
                <Input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder={t('account.team.displayNamePlaceholder')} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.team.role')}</label>
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
                <label className="text-sm font-medium">{t('account.team.initialPassword')}</label>
                <PasswordInput value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder={t('account.team.initialPasswordPlaceholder')} />
              </div>
              {inviteForm.role !== 'viewer' && inviteForm.role !== 'owner' && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('account.team.concurrentLimit')}</label>
                  <InputNumber value={inviteForm.kefu_max_concurrent} onChange={v => setInviteForm({ ...inviteForm, kefu_max_concurrent: v || 5 })} min={TEAM_CONCURRENT_MIN} max={TEAM_CONCURRENT_MAX} />
                </div>
              )}
              {inviteForm.role !== 'owner' && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('account.team.menuPermissions')}</label>
                  <div className="tm-permission-grid">
                    {menuOptions.map(opt => (
                      <label key={opt.id} className="tm-permission-item">
                        <Checkbox
                          checked={inviteForm.menu_permissions.includes(opt.id)}
                          onCheckedChange={v => toggleInviteMenu(opt.id, v === true)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <small className="hint">{t('account.team.inviteHint')}</small>
            </div>
          ) : (
            <div className="invite-done">
              <div className="ok"><Icon name="user" size={22} /></div>
              <strong>{tpl('account.team.joinedTeam', inviteResult.email)}</strong>
              {inviteResult.password && (
                <p>
                  {t('account.team.initialPasswordLabel')}<code>{inviteResult.password}</code><br/>
                  <small className="text-xs text-[var(--xiaoone-fg-mute)]">{t('account.team.passwordShareHint')}</small>
                </p>
              )}
              {inviteResult.note && <p className="text-sm text-[var(--xiaoone-fg-mute)]">{inviteResult.note}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{inviteResult ? t('account.common.close') : t('account.common.cancel')}</Button>
            {!inviteResult && <Button onClick={submitInvite} disabled={inviteSubmitting}>{t('account.team.confirmAdd')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? tpl('account.team.editTitleWithEmail', editTarget.user.email) : t('account.team.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('account.team.loginAccount')}</label>
              <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="member@example.com" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('account.team.displayName')}</label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('account.team.role')}</label>
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
              <label className="text-sm font-medium">{t('account.team.resetPasswordOptional')}</label>
              <PasswordInput value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder={t('account.team.resetPasswordPlaceholder')} />
            </div>
            {editForm.role !== 'owner' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.team.leftMenuPermissions')}</label>
                <div className="tm-permission-grid">
                  {menuOptions.map(opt => (
                    <label key={opt.id} className="tm-permission-item">
                      <Checkbox
                        checked={editForm.menu_permissions.includes(opt.id)}
                        onCheckedChange={v => toggleEditMenu(opt.id, v === true)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <small className="hint">{t('account.team.menuPermissionsHint')}</small>
              </div>
            )}

            {editForm.role !== 'viewer' && (
              <>
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-[var(--xiaoone-border)]"></div>
                  <span className="text-xs text-[var(--xiaoone-fg-mute)] font-medium">{t('account.team.liveChatSection')}</span>
                  <div className="flex-1 h-px bg-[var(--xiaoone-border)]"></div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('account.team.serveLiveChat')}</label>
                  <div className="flex items-center space-x-2">
                    <Switch checked={editForm.can_serve_live_chat} onCheckedChange={v => setEditForm({ ...editForm, can_serve_live_chat: v })} />
                    <span className="text-sm">{editForm.can_serve_live_chat ? t('account.team.on') : t('account.team.off')}</span>
                  </div>
                  <small className="hint">{t('account.team.liveChatHint')}</small>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('account.team.concurrentLimit')}</label>
                  <InputNumber value={editForm.kefu_max_concurrent} onChange={v => setEditForm({ ...editForm, kefu_max_concurrent: v || 5 })} min={1} max={50} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('account.common.cancel')}</Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>{t('account.common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
