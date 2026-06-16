import type { WorkspaceStatusResponse } from './workspaceStatusApi'

type StandaloneWorkspaceStatus = Pick<WorkspaceStatusResponse, 'status'> | null | undefined

export function isStandaloneWorkspaceOpen(status: StandaloneWorkspaceStatus): boolean {
  return status?.status === 'active'
}

export function shouldEnsureStandaloneWorkspaceProvision(status: StandaloneWorkspaceStatus): boolean {
  return status?.status === 'not_found'
}
