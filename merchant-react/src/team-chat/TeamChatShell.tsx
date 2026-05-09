import React, { useMemo, useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { TeamChatFiles } from './TeamChatFiles'
import { TeamChatNew } from './TeamChatNew'
import { TeamChatThread } from './TeamChatThread'
import { useTeamChatRuntime } from './TeamChatContext'
import { useStore } from 'zustand'
import { TeamCommunicationsTab, TeamDirectoryMember } from './types'
import { toast } from '@xiaoone/react-ui'
import './team-chat.css'

export function TeamChatShell() {
  const runtime = useTeamChatRuntime()
  const store = useStore(runtime.storeApi)
  const nav = runtime.nav
  const identity = runtime.identity
  const myUserId = identity.id || 0
  const myName = identity.name || identity.email?.split('@')[0] || '我'

  const [members, setMembers] = useState<TeamDirectoryMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [openingDmUserId, setOpeningDmUserId] = useState<number | null>(null)

  const tabs: { key: TeamCommunicationsTab; label: string }[] = [
    { key: 'all', label: runtime.locale.t('teamChat.tabAll') || '全部' },
    { key: 'dm', label: runtime.locale.t('teamChat.dm') || '私聊' },
    { key: 'group', label: runtime.locale.t('teamChat.group') || '群聊' },
    { key: 'files', label: runtime.locale.t('teamChat.files') || '文件' },
  ]

  const filteredConvs = useMemo(() => {
    const list = store.sorted()
    const t = nav.teamCommTab
    if (t === 'dm') return list.filter(c => c.kind === 'dm')
    if (t === 'group') return list.filter(c => c.kind === 'group')
    return list
  }, [store, nav.teamCommTab])

  const directory = useMemo(() => {
    return members.filter(m => m.is_active && m.user.id !== myUserId)
  }, [members, myUserId])

  const dmConversationForUser = (userId: number) => {
    return store.sorted().find(c => c.kind === 'dm' && c.members.some(m => m.user_id === userId)) || null
  }

  const dmRows = useMemo(() => {
    return directory.map(member => ({
      member,
      conversation: dmConversationForUser(member.user.id),
    }))
  }, [directory, store])

  const loadMembers = async () => {
    setMembersLoading(true)
    try {
      const r = await runtime.loadDirectory()
      setMembers(r.items || [])
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '加载团队成员失败')
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (!store.loaded) store.fetch().catch(() => {})
    loadMembers().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const tab = nav.teamCommTab
    const selId = nav.selectedTeamChatId
    if (tab === 'files' || !selId) return
    const c = store.conversations.find(x => x.id === selId)
    if (!c) return
    if (tab === 'dm' && c.kind !== 'dm') nav.navigate({ type: 'new' })
    if (tab === 'group' && c.kind !== 'group') nav.navigate({ type: 'new' })
  }, [nav.teamCommTab, nav.selectedTeamChatId, store.conversations, nav])

  const startNew = () => nav.navigate({ type: 'new' })

  const avatarLabel = (member: TeamDirectoryMember) => {
    return (member.user.name || member.user.email || '?').slice(0, 1).toUpperCase()
  }

  const memberTitle = (member: TeamDirectoryMember) => {
    return member.user.name || member.user.email.split('@')[0] || `用户#${member.user.id}`
  }

  const openMemberDm = async (member: TeamDirectoryMember) => {
    const existing = dmConversationForUser(member.user.id)
    if (existing) {
      nav.navigate({ type: 'thread', convId: existing.id, kind: existing.kind as any })
      return
    }
    setOpeningDmUserId(member.user.id)
    try {
      const payloadMembers = [{ user_id: member.user.id, user_name: memberTitle(member) }]
      if (myUserId) payloadMembers.push({ user_id: myUserId, user_name: myName })
      const r = await runtime.api.createConversation({ kind: 'dm', members: payloadMembers })
      store.upsert(r.conversation)
      await store.fetch(true)
      nav.navigate({ type: 'thread', convId: r.conversation.id, kind: 'dm' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '打开私聊失败')
    } finally {
      setOpeningDmUserId(null)
    }
  }

  const relativeTime = (input: string | null) => {
    if (!input) return ''
    const t = new Date(input).getTime()
    if (!t || Number.isNaN(t)) return ''
    const diff = Date.now() - t
    if (diff < 60_000) return runtime.locale.t('common.time.justNow') || '刚刚'
    if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} 分钟前`
    if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))} 小时前`
    if (diff < 30 * 86_400_000) return `${Math.max(1, Math.round(diff / 86_400_000))} 天前`
    return new Date(t).toLocaleDateString(runtime.locale.locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' })
  }

  const emptyHint = (() => {
    const t = nav.teamCommTab
    if (t === 'dm') return '暂无其他团队成员'
    if (t === 'group') return '暂无群组'
    return '暂无会话'
  })()

  return (
    <div className="tcs-root">
      <div className="tcs-tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={`tcs-tab ${nav.teamCommTab === t.key ? 'is-active' : ''}`}
            role="tab"
            aria-selected={nav.teamCommTab === t.key}
            onClick={() => nav.setTeamCommTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="tcs-tabs-spacer" />
        {nav.teamCommTab !== 'files' && nav.teamCommTab !== 'dm' && (
          <button type="button" className="tcs-new" title="新对话" onClick={startNew}>
            <Icon name="pencil" size={13} />
            <span>新对话</span>
          </button>
        )}
      </div>

      {nav.teamCommTab === 'files' ? (
        <TeamChatFiles className="tcs-files" />
      ) : (
        <div className="tcs-split">
          <aside className="tcs-list" aria-label="会话列表">
            {nav.teamCommTab === 'dm' && (dmRows.length || membersLoading) ? (
              <div className="tcs-list-scroll">
                {dmRows.map(row => {
                  const unread = row.conversation ? runtime.prefs.teamConvUnread(row.conversation) : 0
                  return (
                    <button
                      key={row.member.id}
                      type="button"
                      className={`tcs-row ${row.conversation && nav.selectedTeamChatId === row.conversation.id && nav.teamChatMode === 'thread' ? 'is-active' : ''} ${openingDmUserId === row.member.user.id ? 'is-loading' : ''}`}
                      disabled={openingDmUserId === row.member.user.id}
                      onClick={() => void openMemberDm(row.member)}
                    >
                      <span className="tcs-avatar">{avatarLabel(row.member)}</span>
                      <div className="tcs-row-text">
                        <span className="tcs-row-title">{memberTitle(row.member)}</span>
                        <span className="tcs-row-meta">{row.conversation?.last_message_preview || row.member.user.email}</span>
                      </div>
                      {unread > 0 ? (
                        <span className="tcs-badge">{unread > 99 ? '99+' : unread}</span>
                      ) : (
                        <span className="tcs-time">{relativeTime(row.conversation?.last_message_at || null)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : filteredConvs.length ? (
              <div className="tcs-list-scroll">
                {filteredConvs.map(c => {
                  const unread = runtime.prefs.teamConvUnread(c)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`tcs-row ${nav.selectedTeamChatId === c.id && nav.teamChatMode === 'thread' ? 'is-active' : ''}`}
                      onClick={() => nav.navigate({ type: 'thread', convId: c.id, kind: c.kind as any })}
                    >
                      <Icon name={c.kind === 'group' ? 'users' : 'user'} size={12} className="tcs-row-ico" />
                      <div className="tcs-row-text">
                        <span className="tcs-row-title">{c.title || '未命名对话'}</span>
                        <span className="tcs-row-meta">{c.kind === 'group' ? '群聊' : '私聊'}</span>
                      </div>
                      {unread > 0 ? (
                        <span className="tcs-badge">{unread > 99 ? '99+' : unread}</span>
                      ) : (
                        <span className="tcs-time">{relativeTime(c.last_message_at)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="tcs-list-empty">
                <Icon name="message-square" size={20} />
                <p>{emptyHint}</p>
                {nav.teamCommTab !== 'dm' && (
                  <button type="button" className="tcs-list-empty-btn" onClick={startNew}>发起聊天</button>
                )}
              </div>
            )}
          </aside>

          <main className="tcs-main">
            {nav.teamChatMode === 'thread' && nav.selectedTeamChatId ? (
              <TeamChatThread key={nav.selectedTeamChatId} convId={nav.selectedTeamChatId} />
            ) : nav.teamCommTab === 'dm' ? (
              <div className="tcs-main-empty">
                <Icon name="user" size={22} />
                <p>选择左侧团队成员开始私聊</p>
              </div>
            ) : (
              <TeamChatNew />
            )}
          </main>
        </div>
      )}
    </div>
  )
}
