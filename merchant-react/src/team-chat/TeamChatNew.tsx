import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useTeamChatRuntime } from './TeamChatContext'
import { useStore } from 'zustand'
import { TeamDirectoryMember } from './types'
import { toast, Input, Checkbox } from '@xiaoone/react-ui'

export function TeamChatNew() {
  const runtime = useTeamChatRuntime()
  const store = useStore(runtime.storeApi)
  const nav = runtime.nav
  const identity = runtime.identity
  const myUserId = identity.id || 0
  const myName = identity.name || identity.email?.split('@')[0] || '我'

  const [members, setMembers] = useState<TeamDirectoryMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [plugin, setPlugin] = useState<'dm' | 'group'>(nav.teamCommTab === 'group' ? 'group' : 'dm')
  const [newGroupMode, setNewGroupMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [groupTitle, setGroupTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFilePreview, setPendingFilePreview] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  
  const composerRef = useRef<any>(null)

  const lockPluginInComposer = nav.teamCommTab === 'dm' || nav.teamCommTab === 'group'
  const kind = plugin === 'group' ? 'group' : 'dm'

  const directory = useMemo(() => members.filter(m => m.is_active && m.user.id !== myUserId), [members, myUserId])
  
  const filteredDirectory = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return directory
    return directory.filter(m => (m.user.name || '').toLowerCase().includes(q) || (m.user.email || '').toLowerCase().includes(q))
  }, [directory, memberSearch])

  const existingGroups = useMemo(() => store.sorted().filter(c => c.kind === 'group'), [store])

  const filteredExistingGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase()
    if (!q) return existingGroups
    return existingGroups.filter(c => (c.title || '').toLowerCase().includes(q) || c.members.some(m => (m.user_name || '').toLowerCase().includes(q)))
  }, [existingGroups, groupSearch])

  const selectedMembers = useMemo(() => directory.filter(m => selectedIds.includes(m.user.id)), [directory, selectedIds])

  const hasFriends = directory.length > 0
  const hasGroups = existingGroups.length > 0

  const hasParticipants = useMemo(() => {
    if (plugin === 'dm') return selectedIds.length === 1
    if (plugin === 'group' && newGroupMode) return selectedIds.length >= 1
    return false
  }, [plugin, newGroupMode, selectedIds.length])

  const canSend = !sending && hasParticipants && (!!draft.trim() || !!pendingFile)

  useEffect(() => {
    if (!store.loaded) store.fetch().catch(() => {})
    const loadMembers = async () => {
      setLoadingMembers(true)
      try {
        const r = await runtime.loadDirectory()
        setMembers(r.items || [])
      } catch (e: any) {
        toast.error(e?.response?.data?.message || '加载团队成员失败')
      } finally {
        setLoadingMembers(false)
      }
    }
    loadMembers()
    
    const pending = nav.consumeDraft()
    if (pending?.content) setDraft(pending.content)
    if (pending?.plugin === 'dm' || pending?.plugin === 'group') setPlugin(pending.plugin)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (nav.teamChatMode !== 'new') return
    if (nav.teamCommTab === 'all' || nav.teamCommTab === 'files') return
    const next = nav.teamCommTab === 'group' ? 'group' : 'dm'
    if (plugin !== next) setPlugin(next)
  }, [nav.teamCommTab, nav.teamChatMode, plugin])

  useEffect(() => {
    setSelectedIds([])
    setGroupTitle('')
    setMemberSearch('')
    setGroupSearch('')
    if (plugin === 'dm') {
      setNewGroupMode(false)
    } else {
      setNewGroupMode(!hasGroups)
    }
  }, [plugin, hasGroups])

  useEffect(() => {
    if (plugin !== 'group' || existingGroups.length === 0) return
    if (existingGroups.length > 0 && newGroupMode && !hasGroups) {
      setNewGroupMode(false)
    }
  }, [existingGroups.length, plugin, newGroupMode, hasGroups])

  const goThread = (convId: string, convKind: 'dm' | 'group') => nav.navigate({ type: 'thread', convId, kind: convKind })

  const startConversation = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const memberPayload = directory
        .filter(m => selectedIds.includes(m.user.id))
        .map(m => ({ user_id: m.user.id, user_name: m.user.name || m.user.email.split('@')[0] }))
      memberPayload.push({ user_id: myUserId, user_name: myName })

      const r = await runtime.api.createConversation({
        kind,
        title: kind === 'group' ? (groupTitle.trim() || undefined) : undefined,
        members: memberPayload,
      })

      const convId = r.conversation.id
      store.upsert(r.conversation)

      if (pendingFile) {
        const att = await runtime.api.upload(pendingFile)
        await runtime.api.sendMessage(convId, {
          kind: att.is_image ? 'image' : 'file',
          attachment_id: att.id,
          sender_name: myName,
        })
      }
      if (draft.trim()) {
        await runtime.api.sendMessage(convId, {
          kind: 'text',
          content: draft.trim(),
          sender_name: myName,
        })
      }

      await store.fetch(true)
      goThread(convId, kind)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '创建会话失败')
    } finally {
      setSending(false)
    }
  }

  const avatarLabel = (m: TeamDirectoryMember) => (m.user.name || m.user.email || '?').slice(0, 1).toUpperCase()

  const toggleMember = (m: TeamDirectoryMember) => {
    const id = m.user.id
    if (kind === 'dm') {
      setSelectedIds(selectedIds[0] === id ? [] : [id])
    } else {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
  }

  const relativeTime = (input: string | null) => {
    if (!input) return ''
    const t = new Date(input).getTime()
    if (!t || Number.isNaN(t)) return ''
    const diff = Date.now() - t
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} 分钟前`
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} 小时前`
    if (diff < 30 * 86_400_000) return `${Math.round(diff / 86_400_000)} 天前`
    return new Date(t).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
  }

  const Composer = runtime.Composer
  
  const heroTitle = useMemo(() => {
    if (plugin === 'dm') {
      if (selectedMembers.length) {
        const m = selectedMembers[0]
        const name = m?.user.name || m?.user.email.split('@')[0] || '团队成员'
        return `向 ${name} 发起私聊`
      }
      return '选择 1 位好友开始私聊'
    }
    if (newGroupMode) {
      if (selectedMembers.length === 0) return '创建新群组：先选择成员'
      if (selectedMembers.length === 1) {
        const m = selectedMembers[0]
        const name = m?.user.name || m?.user.email.split('@')[0] || ''
        return `创建新群：你 + ${name}`
      }
      return `创建新群：${selectedMembers.length + 1} 位成员`
    }
    return existingGroups.length ? '选择已存在的群继续聊天，或创建一个新群' : '团队中暂无群组，去创建一个吧'
  }, [plugin, selectedMembers, newGroupMode, existingGroups.length])

  return (
    <section className="codex-hero" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="hero-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, textAlign: 'center' }}>{heroTitle}</h1>
          
          <div className="fallback-cx" style={{ border: '1px solid var(--xiaoone-border)', borderRadius: 12, padding: 16, background: 'var(--xiaoone-bg-elev)' }}>
            {hasParticipants && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--xiaoone-accent-bg)', color: 'var(--xiaoone-accent)' }}>
                  {kind === 'dm' ? '私聊' : '新群'}
                </span>
                {selectedMembers.map(m => (
                  <span key={m.user.id} style={{ fontSize: 12, padding: '2px 6px', border: '1px solid var(--xiaoone-border)', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {m.user.name || m.user.email.split('@')[0]}
                    <button type="button" onClick={() => toggleMember(m)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
                  </span>
                ))}
                {kind === 'group' && (
                  <Input 
                    placeholder="群聊名称（可选）" 
                    value={groupTitle} 
                    onChange={e => setGroupTitle(e.target.value)} 
                    className="h-7 text-xs border-0 bg-transparent shadow-none px-2 w-40" 
                  />
                )}
              </div>
            )}
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={hasParticipants ? '说点什么...' : '请先选择聊天对象'}
              disabled={!hasParticipants}
              style={{ width: '100%', minHeight: 60, border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  startConversation()
                }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button 
                type="button" 
                onClick={startConversation} 
                disabled={!canSend} 
                style={{ padding: '6px 16px', background: 'var(--xiaoone-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.6 }}
              >
                {sending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>

          {plugin === 'group' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => setNewGroupMode(false)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--xiaoone-border)', background: !newGroupMode ? 'var(--xiaoone-bg-hover)' : 'transparent', cursor: 'pointer' }}>选择已有群</button>
              <button type="button" onClick={() => setNewGroupMode(true)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--xiaoone-border)', background: newGroupMode ? 'var(--xiaoone-bg-hover)' : 'transparent', cursor: 'pointer' }}>多名好友新建群</button>
            </div>
          )}

          {plugin === 'dm' || newGroupMode ? (
            <div className="picker" style={{ border: '1px solid var(--xiaoone-border)', borderRadius: 12, padding: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <strong>选择好友 {plugin === 'dm' ? '(单选)' : '(多选)'}</strong>
                <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="搜索成员" className="w-48 h-7 text-xs" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {filteredDirectory.map(m => (
                  <div key={m.id} onClick={() => toggleMember(m)} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: 8, background: selectedIds.includes(m.user.id) ? 'var(--xiaoone-bg-hover)' : 'transparent' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--xiaoone-bg-elev)', border: '1px solid var(--xiaoone-border)', display: 'grid', placeItems: 'center', fontSize: 12, marginRight: 12 }}>{avatarLabel(m)}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{m.user.name || m.user.email}</span>
                    </div>
                    {plugin === 'group' && <Checkbox checked={selectedIds.includes(m.user.id)} />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="picker" style={{ border: '1px solid var(--xiaoone-border)', borderRadius: 12, padding: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <strong>选择已有群组 ({existingGroups.length})</strong>
                <Input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="搜索群组" className="w-48 h-7 text-xs" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {filteredExistingGroups.map(c => (
                  <div key={c.id} onClick={() => goThread(c.id, 'group')} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--xiaoone-bg-elev)', border: '1px solid var(--xiaoone-border)', display: 'grid', placeItems: 'center', fontSize: 12, marginRight: 12 }}>群</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.title || '未命名群'}</span>
                      <span style={{ fontSize: 11, color: 'var(--xiaoone-fg-mute)' }}>{c.members.length} 人 · {relativeTime(c.last_message_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
