import { ExternalLink, KeyRound, RefreshCw, Save, Settings, UserRound } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button, toast } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import { useAssistantRuntimeStatusQuery } from '../hooks/agentQueries'
import { describeAxiosError } from '../lib/apiErrors'
import { updateHelpAdminCredentials } from '../lib/workspaceStatusApi'
import './kefu-help-center-page.css'

function resolveHelpCenterUrl(
  helpUrl: string | null | undefined,
  dashboardUrl: string | null | undefined,
) {
  const direct = (helpUrl || '').trim()
  if (direct) return direct
  const dash = (dashboardUrl || '').trim()
  if (!dash) return null
  try {
    const url = new URL(dash, window.location.href)
    url.pathname = '/help/'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return dash.replace(/\/hermes\/.*$/i, '/help/').replace(/\?.*$/, '')
  }
}

function resolveHelpAdminUrl(
  adminUrl: string | null | undefined,
  helpUrl: string | null | undefined,
  dashboardUrl: string | null | undefined,
) {
  const direct = (adminUrl || '').trim()
  if (direct) return direct
  const publicUrl = resolveHelpCenterUrl(helpUrl, dashboardUrl)
  if (!publicUrl) return null
  try {
    const url = new URL(publicUrl, window.location.href)
    url.pathname = '/help/admin/'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return publicUrl.replace(/\/help\/?.*$/i, '/help/admin/').replace(/\?.*$/, '')
  }
}

function withRefreshParam(url: string, nonce: number) {
  try {
    const next = new URL(url, window.location.href)
    next.searchParams.set('_x1_help_refresh', String(nonce))
    return next.toString()
  } catch {
    const join = url.includes('?') ? '&' : '?'
    return `${url}${join}_x1_help_refresh=${nonce}`
  }
}

export function KefuHelpCenterPage() {
  const { locale, t } = usePreferences()
  const { data: workspaceStatus, isLoading, isError, refetch, isFetching } = useAssistantRuntimeStatusQuery()
  const [frameNonce, setFrameNonce] = useState(() => Date.now())
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [savingAdmin, setSavingAdmin] = useState(false)

  const helpCenterUrl = useMemo(
    () => resolveHelpCenterUrl(
      workspaceStatus?.help_center?.url,
      workspaceStatus?.hermes_dashboard?.url,
    ),
    [workspaceStatus?.help_center?.url, workspaceStatus?.hermes_dashboard?.url],
  )

  const helpAdminUrl = useMemo(
    () => resolveHelpAdminUrl(
      workspaceStatus?.help_center?.admin_url,
      workspaceStatus?.help_center?.url,
      workspaceStatus?.hermes_dashboard?.url,
    ),
    [
      workspaceStatus?.help_center?.admin_url,
      workspaceStatus?.help_center?.url,
      workspaceStatus?.hermes_dashboard?.url,
    ],
  )

  const frameUrl = useMemo(
    () => helpCenterUrl ? withRefreshParam(helpCenterUrl, frameNonce) : null,
    [frameNonce, helpCenterUrl],
  )

  const showPending = !isLoading && !isError && !helpCenterUrl
  const currentAdminUsername = workspaceStatus?.help_center?.admin_username || 'admin'
  const adminPasswordConfigured = Boolean(workspaceStatus?.help_center?.admin_password_configured)

  useEffect(() => {
    setAdminUsername(currentAdminUsername)
  }, [currentAdminUsername])

  const handleRefresh = () => {
    void refetch()
    setFrameNonce(Date.now())
  }

  async function handleAdminCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = adminUsername.trim()
    if (!/^[A-Za-z0-9_.@+-]{3,64}$/.test(username)) {
      toast({ variant: 'destructive', title: t('kefu.helpCenter.adminUsernameInvalid') })
      return
    }
    if (adminPassword.length < 6) {
      toast({ variant: 'destructive', title: t('kefu.helpCenter.adminPasswordTooShort') })
      return
    }
    if (adminPassword !== adminConfirmPassword) {
      toast({ variant: 'destructive', title: t('kefu.helpCenter.adminPasswordMismatch') })
      return
    }
    setSavingAdmin(true)
    try {
      await updateHelpAdminCredentials({ username, password: adminPassword })
      setAdminPassword('')
      setAdminConfirmPassword('')
      toast({ variant: 'success', title: t('kefu.helpCenter.adminSaveSuccess') })
      await refetch()
    }
    catch (err) {
      toast({
        variant: 'destructive',
        title: t('kefu.helpCenter.adminSaveFailed'),
        description: describeAxiosError(err, t('kefu.helpCenter.adminSaveFailed'), undefined, locale),
      })
    }
    finally {
      setSavingAdmin(false)
    }
  }

  return (
    <main className="kefu-help-center-page" aria-label={t('kefu.helpCenter.pageAria')}>
      <div className="kefu-help-center-toolbar">
        <div className="kefu-help-center-toolbar__lead">
          <span className="kefu-help-center-toolbar__label">{t('kefu.helpCenter.userSpace')}</span>
          <strong className="kefu-help-center-toolbar__title">{t('kefu.helpCenter.title')}</strong>
          {helpCenterUrl || helpAdminUrl ? (
            <div className="kefu-help-center-toolbar__urls">
              {helpCenterUrl ? (
                <span className="kefu-help-center-toolbar__url-row">
                  <span className="kefu-help-center-toolbar__url-label">{t('kefu.helpCenter.publicUrl')}</span>
                  <span className="kefu-help-center-toolbar__url" title={helpCenterUrl}>{helpCenterUrl}</span>
                </span>
              ) : null}
              {helpAdminUrl ? (
                <span className="kefu-help-center-toolbar__url-row">
                  <span className="kefu-help-center-toolbar__url-label">{t('kefu.helpCenter.adminUrl')}</span>
                  <span className="kefu-help-center-toolbar__url" title={helpAdminUrl}>{helpAdminUrl}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="kefu-help-center-toolbar__actions">
          <Button type="button" variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw size={14} />
            {t('kefu.common.refresh')}
          </Button>
          {helpCenterUrl ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(helpCenterUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink size={14} />
              {t('kefu.helpCenter.openHelpCenter')}
            </Button>
          ) : null}
          {helpAdminUrl ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(helpAdminUrl, '_blank', 'noopener,noreferrer')}
            >
              <Settings size={14} />
              {t('kefu.helpCenter.manageHelpCenter')}
            </Button>
          ) : null}
        </div>
      </div>

      <section className="kefu-help-center-admin" aria-label={t('kefu.helpCenter.adminSettingsTitle')}>
        <div className="kefu-help-center-admin__head">
          <div className="kefu-help-center-admin__title">
            <UserRound size={15} />
            <strong>{t('kefu.helpCenter.adminSettingsTitle')}</strong>
            <span className={adminPasswordConfigured ? 'is-configured' : ''}>
              {adminPasswordConfigured ? t('kefu.helpCenter.adminConfigured') : t('kefu.helpCenter.adminNotConfigured')}
            </span>
          </div>
          {helpAdminUrl ? (
            <button
              type="button"
              className="kefu-help-center-admin__link"
              onClick={() => window.open(helpAdminUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink size={13} />
              {t('kefu.helpCenter.openAdminLogin')}
            </button>
          ) : null}
        </div>
        <form className="kefu-help-center-admin__form" onSubmit={handleAdminCredentialsSubmit}>
          <label className="kefu-help-center-admin__field">
            <span>{t('kefu.helpCenter.adminAccount')}</span>
            <input
              value={adminUsername}
              onChange={event => setAdminUsername(event.target.value)}
              autoComplete="username"
              placeholder="admin"
              disabled={!helpAdminUrl || savingAdmin}
            />
          </label>
          <label className="kefu-help-center-admin__field">
            <span>{t('kefu.helpCenter.adminPassword')}</span>
            <input
              value={adminPassword}
              onChange={event => setAdminPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              disabled={!helpAdminUrl || savingAdmin}
            />
          </label>
          <label className="kefu-help-center-admin__field">
            <span>{t('kefu.helpCenter.adminConfirmPassword')}</span>
            <input
              value={adminConfirmPassword}
              onChange={event => setAdminConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              disabled={!helpAdminUrl || savingAdmin}
            />
          </label>
          <Button type="submit" variant="outline" disabled={!helpAdminUrl || savingAdmin}>
            {savingAdmin ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {savingAdmin ? t('kefu.helpCenter.adminSaving') : t('kefu.helpCenter.adminSave')}
          </Button>
        </form>
        <div className="kefu-help-center-admin__meta">
          <KeyRound size={13} />
          <span>{t('kefu.helpCenter.adminLoginName')}: {currentAdminUsername}</span>
        </div>
      </section>

      {isLoading ? (
        <div className="kefu-help-center-state" role="status">
          <p>{t('kefu.helpCenter.loading')}</p>
          <span>{t('kefu.helpCenter.loadingDesc')}</span>
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="kefu-help-center-state" role="alert">
          <p>{t('kefu.helpCenter.errorTitle')}</p>
          <span>{t('kefu.helpCenter.errorDesc')}</span>
        </div>
      ) : null}

      {showPending ? (
        <div className="kefu-help-center-state" role="status">
          <p>{t('kefu.helpCenter.unavailableTitle')}</p>
          <span>{t('kefu.helpCenter.unavailableDesc')}</span>
        </div>
      ) : null}

      {frameUrl && !showPending ? (
        <iframe
          key={frameNonce}
          className="kefu-help-center-frame"
          src={frameUrl}
          title={t('kefu.helpCenter.frameTitle')}
          allow="clipboard-read; clipboard-write"
        />
      ) : null}
    </main>
  )
}
