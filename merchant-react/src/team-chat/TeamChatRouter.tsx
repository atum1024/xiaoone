import * as React from 'react'
import type { TeamChatRuntime } from './types'
import { TeamChatProvider } from './TeamChatContext'
import { TeamChatShell } from './TeamChatShell'

export interface TeamChatRouterProps {
  runtime: TeamChatRuntime
}

export function TeamChatRouter({ runtime }: TeamChatRouterProps) {
  return (
    <TeamChatProvider runtime={runtime}>
      <TeamChatShell />
    </TeamChatProvider>
  )
}
