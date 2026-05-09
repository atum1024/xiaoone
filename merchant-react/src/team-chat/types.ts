import { ComponentType } from 'react'
import type { createTeamChatApi, TeamConversation } from '@xiaoone/chat-kit'
import { StoreApi } from 'zustand'
import type { TeamChatStore } from '../store/teamChat'

export type TeamChatApi = ReturnType<typeof createTeamChatApi>['TeamChatAPI']

export interface TeamDirectoryMember {
  id: number
  user: {
    id: number
    email: string
    name: string
    avatar?: string
  }
  is_active: boolean
}

export type TeamDirectoryLoader = () => Promise<{ items: TeamDirectoryMember[] }>

export type TeamCommunicationsTab = 'all' | 'dm' | 'group' | 'files'
export type TeamChatFileKind = 'dm' | 'group' | 'ai'
export type TeamChatDraftPlugin = 'dm' | 'group'

export type TeamChatNavTarget =
  | { type: 'thread'; convId: string; kind?: 'dm' | 'group' }
  | { type: 'new' }
  | { type: 'files'; kind?: TeamChatFileKind }
  | { type: 'tab'; tab: TeamCommunicationsTab }

export interface TeamChatNavState {
  view: string
  teamCommTab: TeamCommunicationsTab
  teamChatMode: 'new' | 'thread' | 'files'
  selectedTeamChatId: string | null
  teamChatFileKind: TeamChatFileKind
}

export interface TeamChatNavApi extends TeamChatNavState {
  setTeamCommTab: (tab: TeamCommunicationsTab) => void
  setTeamChatFileKind: (kind: TeamChatFileKind) => void
  navigate: (target: TeamChatNavTarget) => void
  consumeDraft: () => { content?: string; plugin?: TeamChatDraftPlugin } | null
}

export interface TeamChatLocaleApi {
  locale: 'zh' | 'en'
  t: (key: string) => string
  tpl: (key: string, ...args: string[]) => string
}

export interface TeamChatPrefsApi {
  teamConvUnread: (conv: TeamConversation) => number
  teamConvIsMuted: (id: string) => boolean
  toggleMuteTeamConv: (id: string) => void
}

export interface TeamChatRuntime {
  mode: 'merchant' | 'platform'
  spaceKey: string
  tokenReader: () => string | null

  api: TeamChatApi
  loadDirectory: TeamDirectoryLoader

  identity: { id: number; name: string; email: string }
  spaceLabel: string

  storeApi: StoreApi<TeamChatStore>
  nav: TeamChatNavApi
  locale: TeamChatLocaleApi
  prefs: TeamChatPrefsApi

  Composer?: ComponentType<any>
}
