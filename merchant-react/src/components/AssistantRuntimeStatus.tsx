import { AlertTriangle, CircleCheck, CircleOff, Clock3, Database, Radio } from 'lucide-react'
import { useAssistantRuntimeStatusQuery } from '../hooks/agentQueries'
import { usePreferences } from '../app/preferences'
import type { AssistantRuntimeMarker } from '../lib/workspaceStatusApi'
import './AssistantRuntimeStatus.css'

export { useAssistantRuntimeStatusQuery } from '../hooks/agentQueries'

interface Props {
  className?: string
}

function statusIcon(marker: AssistantRuntimeMarker) {
  if (marker.state === 'ok') return <CircleCheck size={13} />
  if (marker.state === 'pending') return <Clock3 size={13} />
  if (marker.state === 'blocked' || marker.state === 'error') return <AlertTriangle size={13} />
  return <CircleOff size={13} />
}

function localizedMarkerLabel(
  marker: AssistantRuntimeMarker,
  t: (key: string, fallback?: string) => string,
) {
  const code = marker.code?.trim()
  if (code)
    return t(`common.runtime.marker.${code}`, marker.label)
  return marker.label
}

function StatusPill({
  icon,
  title,
  marker,
  t,
}: {
  icon: 'space' | 'channel'
  title: string
  marker: AssistantRuntimeMarker
  t: (key: string, fallback?: string) => string
}) {
  const label = localizedMarkerLabel(marker, t)
  return (
    <div
      className={`assistant-runtime-pill is-${marker.state}`}
      title={marker.description}
      aria-label={`${title}: ${label}. ${marker.description}`}
    >
      <span className="assistant-runtime-pill-main">
        {icon === 'space' ? <Database size={14} /> : <Radio size={14} />}
        <strong>{title}</strong>
      </span>
      <span className="assistant-runtime-pill-state">
        {statusIcon(marker)}
        <em>{label}</em>
      </span>
    </div>
  )
}

export function AssistantRuntimeStatus({ className = '' }: Props) {
  const { t } = usePreferences()
  const statusQuery = useAssistantRuntimeStatusQuery()
  const status = statusQuery.data || null
  const loadError = statusQuery.error instanceof Error ? statusQuery.error.message : ''

  const fallbackMarker: AssistantRuntimeMarker = {
    state: 'pending',
    label: t('common.runtime.loading'),
    description: t('common.runtime.loadingDesc'),
  }

  const space = loadError
    ? { state: 'error', label: t('common.runtime.unknown'), description: loadError } satisfies AssistantRuntimeMarker
    : status?.smart_space || fallbackMarker
  const channel = loadError
    ? { state: 'error', label: t('common.runtime.unknown'), description: loadError } satisfies AssistantRuntimeMarker
    : status?.assistant_channel || fallbackMarker

  return (
    <div className={`assistant-runtime-status ${className}`.trim()} aria-label={t('common.runtime.aria')}>
      <StatusPill icon="space" title={t('common.runtime.spaceTitle')} marker={space} t={t} />
      <StatusPill icon="channel" title={t('common.runtime.channelTitle')} marker={channel} t={t} />
    </div>
  )
}
