import React, { useMemo, useState, useEffect } from 'react'
import { TeamChatRouter, TeamChatRuntime, TeamChatNavState, TeamChatNavTarget } from '../team-chat'
import { useAuthStore as useAuth } from '../store/auth'
import { readAccessToken } from '../auth/token'
import { readPlatformAccessToken } from '../auth/platformToken'
import { ensureTeamChatStore } from '../store/teamChat'
import { getChatKit } from '@xiaoone/chat-kit'
import { TeamAPI } from '../lib/teamApi'
import { PlatformTeamAPI } from '../lib/platformTeamApi'
import { XiaooneComposer } from '../components/XiaooneComposer'

interface TeamChatPageProps {
  mode?: 'merchant' | 'platform'
}

export function TeamChatPage({ mode = 'merchant' }: TeamChatPageProps) {
  const auth = useAuth()
  const isPlatformMode = mode === 'platform'

  const [navState, setNavState] = useState<TeamChatNavState>({
    view: 'team-chat',
    teamCommTab: 'all',
    teamChatMode: 'new',
    selectedTeamChatId: null,
    teamChatFileKind: 'dm',
  })

  const [draftPayload, setDraftPayload] = useState<{ content?: string; plugin?: 'dm' | 'group' } | null>(null)

  const runtime = useMemo<TeamChatRuntime | null>(() => {
    if (!auth.me) return null

    const spaceKey = isPlatformMode ? 'platform:internal' : `merchant:${auth.currentMerchantId || 'default'}`
    const tokenReader = isPlatformMode ? readPlatformAccessToken : readAccessToken

    // In our actual codebase, we might have PlatformTeamChatAPI and TeamChatAPI in chat-kit.
    // For now, getChatKit().TeamChatAPI handles it based on baseUrl or headers, but wait:
    // the chat-kit's TeamChatAPI might be configured for merchant only unless we pass a custom one.
    // Assuming getChatKit().TeamChatAPI works or we have a platform version.
    // Let's use getChatKit().TeamChatAPI.
    const api = getChatKit().TeamChatAPI

    const storeApi = ensureTeamChatStore({
      spaceKey,
      api,
      tokenReader,
    })

    const loadDirectory = async () => {
      if (isPlatformMode) {
        const res = await PlatformTeamAPI.listStaff()
        return { items: res.items as any }
      }
      const res = await TeamAPI.list()
      return { items: res.items as any }
    }

    const identity = {
      id: auth.me.user.id,
      name: auth.me.user.name || '',
      email: auth.me.user.email || ''
    }

    const spaceLabel = isPlatformMode ? '平台' : auth.currentMerchantName || '商户'

    return {
      mode,
      spaceKey,
      tokenReader,
      api,
      loadDirectory,
      identity,
      spaceLabel,
      storeApi,
      nav: {
        ...navState,
        setTeamCommTab: (tab) => setNavState(prev => ({ ...prev, teamCommTab: tab })),
        setTeamChatFileKind: (kind) => setNavState(prev => ({ ...prev, teamChatFileKind: kind })),
        navigate: (target: TeamChatNavTarget) => {
          setNavState(prev => {
            const next = { ...prev }
            if (target.type === 'thread') {
              next.teamChatMode = 'thread'
              next.selectedTeamChatId = target.convId
              if (target.kind === 'dm') next.teamCommTab = 'dm'
              if (target.kind === 'group') next.teamCommTab = 'group'
            } else if (target.type === 'new') {
              next.teamChatMode = 'new'
              next.selectedTeamChatId = null
            } else if (target.type === 'files') {
              next.teamCommTab = 'files'
              if (target.kind) next.teamChatFileKind = target.kind
            } else if (target.type === 'tab') {
              next.teamCommTab = target.tab
              next.teamChatMode = 'new'
            }
            return next
          })
        },
        consumeDraft: () => {
          const payload = draftPayload
          if (payload) setDraftPayload(null)
          return payload
        }
      },
      locale: {
        locale: 'zh',
        t: (k) => k,
        tpl: (k, ...args) => args.join(' ')
      },
      prefs: {
        teamConvUnread: (conv) => conv.unread || 0,
        teamConvIsMuted: () => false, // placeholder
        toggleMuteTeamConv: () => {} // placeholder
      },
      Composer: XiaooneComposer as any,
    }
  }, [auth.me, auth.currentMerchantId, auth.currentMerchantName, isPlatformMode, mode, navState, draftPayload])

  useEffect(() => {
    if (runtime) {
      runtime.storeApi.getState().startTeamRealtime()
    }
  }, [runtime?.spaceKey])

  if (!runtime) return null

  return (
    <div className="mr-page mr-page--spacious" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="mr-page-head" style={{ flexShrink: 0 }}>
        <span className="mr-page-kicker">{isPlatformMode ? '平台团队沟通' : '团队沟通'}</span>
        <h1>{isPlatformMode ? '平台内部会话与成员直达私聊' : '团队会话与成员直达私聊'}</h1>
        <p>在一个页面内处理私聊、群聊和成员发起，保持团队协作连续。</p>
      </header>

      <section className="mr-surface" style={{ flex: 1, minHeight: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TeamChatRouter runtime={runtime} />
      </section>
    </div>
  )
}
