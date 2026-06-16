import { useCallback, useMemo } from 'react'
import { Icon } from './Icon'
import { PartnerBrandMark } from './PartnerBrandMark'
import { useAssistantChannelBindingsQuery, type AssistantChannelRow } from '../hooks/agentQueries'
import { getPartnerBrand, partnerBrandCssVars } from '../lib/partnerBrands'
import { usePreferences } from '../app/preferences'
import './AssistantChannelBindings.css'

const INTERNAL_ASSISTANT_CHANNEL_KEYS = new Set([
  'xiaoone',
  'xiaoone_assistant',
  'xiaoone-assistant',
])

function isInternalAssistantChannel(channel: AssistantChannelRow) {
  const key = String(channel.key || '').trim().toLowerCase()
  return INTERNAL_ASSISTANT_CHANNEL_KEYS.has(key) || key.startsWith('xiaoone')
}

function channelActionUrl(channel: AssistantChannelRow, manageUrl: string) {
  return channel.bind_url || channel.deep_link || channel.qr_code_url || channel.manage_url || manageUrl
}

export function AssistantChannelBindings() {
  const { t } = usePreferences()
  const channelQuery = useAssistantChannelBindingsQuery()
  const channels = channelQuery.data?.channels || []
  const manageUrl = channelQuery.data?.manageUrl || ''
  const loading = channelQuery.isLoading

  const statusText = useCallback((channel: AssistantChannelRow) => {
    if (channel.bound)
      return channel.external_user_id_masked || channel.display_name || t('common.bind.bound')
    return channel.supported ? t('common.bind.supported') : t('common.bind.goBind')
  }, [t])

  const rows = useMemo<AssistantChannelRow[]>(() => {
    return channels
      .filter(channel => channel.key && channel.label && !isInternalAssistantChannel(channel))
      .sort((a: AssistantChannelRow, b: AssistantChannelRow) => Number(b.bound) - Number(a.bound) || Number(b.supported) - Number(a.supported) || a.label.localeCompare(b.label))
  }, [channels])
  const boundCount = rows.filter(channel => channel.bound).length

  if (loading) {
    return (
      <section className="assistant-bind-panel is-compact" aria-label={t('common.bind.externalIm')}>
        <div className="assistant-bind-compact-label">{t('common.bind.externalIm')}</div>
        <div className="assistant-bind-compact-empty">{t('common.bind.loading')}</div>
      </section>
    )
  }

  if (!rows.length)
    return null

  return (
    <section className="assistant-bind-panel is-compact" aria-label={t('common.bind.externalIm')}>
      <div className="assistant-bind-compact-label">
        {t('common.bind.externalIm')}
        <em>{boundCount}/{rows.length}</em>
      </div>
      <div className="assistant-bind-compact-list">
        {rows.map(channel => {
          const href = channelActionUrl(channel, manageUrl)
          const brand = getPartnerBrand(channel.key)
          const status = statusText(channel)
          return (
            <a
              key={channel.key}
              className={`assistant-bind-chip ${channel.bound ? 'is-bound' : 'is-unbound'}`}
              style={partnerBrandCssVars(channel.key)}
              href={href || undefined}
              target={href ? '_blank' : undefined}
              rel="noreferrer"
              aria-disabled={!href}
              title={`${channel.label}：${status}`}
            >
              {brand ? <PartnerBrandMark brand={brand.key} size={13} className="partner-brand-mark--sm" /> : <Icon name="link" size={13} />}
              <span>{channel.label}</span>
              <small>{status}</small>
            </a>
          )
        })}
      </div>
    </section>
  )
}
