import { Badge } from '@xiaoone/react-ui'
import type { ModuleStatus } from '../app/moduleRegistry'

interface StatusBadgeProps {
  status: ModuleStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge tone={statusTone(status)} className={`mr-status mr-status-${statusClass(status)}`}>{statusLabel(status)}</Badge>
}

function statusLabel(status: ModuleStatus) {
  if (status === '待确认')
    return '待决策'
  return status
}

function statusClass(status: ModuleStatus) {
  if (status === '已完成')
    return 'core'
  if (status === '进行中')
    return 'partial'
  return 'decision'
}

function statusTone(status: ModuleStatus) {
  if (status === '已完成')
    return 'success'
  if (status === '进行中')
    return 'warning'
  return 'default'
}
