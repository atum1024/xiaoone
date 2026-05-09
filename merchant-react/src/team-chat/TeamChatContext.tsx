import * as React from 'react'
import type { TeamChatRuntime } from './types'

const TeamChatContext = React.createContext<TeamChatRuntime | null>(null)

export function TeamChatProvider({ runtime, children }: { runtime: TeamChatRuntime; children: React.ReactNode }) {
  return <TeamChatContext.Provider value={runtime}>{children}</TeamChatContext.Provider>
}

export function useTeamChatRuntime() {
  const ctx = React.useContext(TeamChatContext)
  if (!ctx) throw new Error('useTeamChatRuntime must be used within TeamChatProvider')
  return ctx
}
