import { ExternalLink, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import { useAssistantRuntimeStatusQuery } from '../hooks/agentQueries'
import './hermes-panel-page.css'

function resolveConfiguredHermesDashboardUrl() {
  return (
    import.meta.env.VITE_HERMES_DASHBOARD_URL?.trim()
    || import.meta.env.VITE_HERMES_PANEL_URL?.trim()
    || ''
  )
}

function withHermesParams(rawUrl: string, locale: 'zh' | 'en') {
  try {
    const url = new URL(rawUrl, window.location.href)
    if (!url.searchParams.has('embedded_chat')) url.searchParams.set('embedded_chat', '1')
    url.searchParams.set('locale', locale)
    return url.toString()
  } catch {
    const joiner = rawUrl.includes('?') ? '&' : '?'
    return `${rawUrl}${joiner}embedded_chat=1&locale=${locale}`
  }
}

function resolveHermesDashboardUrl(
  apiUrl: string | null | undefined,
  configuredUrl: string,
) {
  if (apiUrl) return apiUrl
  if (configuredUrl) return configuredUrl
  return null
}

export function HermesPanelPage() {
  const { locale, t } = usePreferences()
  const { data: workspaceStatus, isLoading, isError, refetch, isFetching } = useAssistantRuntimeStatusQuery()
  const [frameKey, setFrameKey] = useState(0)

  const configuredDashboardUrl = resolveConfiguredHermesDashboardUrl()

  const rawDashboardUrl = resolveHermesDashboardUrl(
    workspaceStatus?.hermes_dashboard?.url,
    configuredDashboardUrl,
  )

  const hermesDashboardUrl = useMemo(
    () => (rawDashboardUrl ? withHermesParams(rawDashboardUrl, locale) : null),
    [rawDashboardUrl, locale],
  )

  const showPending = !isLoading && !isError && !hermesDashboardUrl

  const handleRefresh = () => {
    void refetch()
    setFrameKey(key => key + 1)
  }

  return (
    <main className="hermes-panel-page" aria-label={t('automation.hermes.aria')}>
      <div className="hermes-panel-toolbar">
        <div>
          <span>hermes</span>
          <strong>{t('automation.hermes.title')}</strong>
        </div>
        <div className="hermes-panel-toolbar__actions">
          <Button type="button" variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw size={14} />
            {t('automation.hermes.refresh')}
          </Button>
          {hermesDashboardUrl ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(hermesDashboardUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink size={14} />
              {t('automation.hermes.openNewWindow')}
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="hermes-panel-state" role="status">
          <p>{t('automation.hermes.loading')}</p>
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="hermes-panel-state hermes-panel-state--error" role="alert">
          <p>{t('automation.hermes.urlError')}</p>
        </div>
      ) : null}

      {showPending ? (
        <div className="hermes-panel-state" role="status">
          <p>{t('automation.hermes.unavailable')}</p>
          <span>{t('automation.hermes.unavailableHint')}</span>
        </div>
      ) : null}

      {hermesDashboardUrl ? (
        <iframe
          key={frameKey}
          className="hermes-panel-frame"
          src={hermesDashboardUrl}
          title="Hermes Agent Dashboard"
          allow="clipboard-read; clipboard-write"
        />
      ) : null}
    </main>
  )
}
