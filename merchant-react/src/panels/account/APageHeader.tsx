import * as React from 'react'
import { Badge } from '@xiaoone/react-ui'
import { Icon } from '../../components/Icon'
import { usePreferences } from '../../app/preferences'

export interface APageHeaderProps {
  /** 面包屑根，默认 "账户中心"。独立模块（如团队管理）可以传别的根 */
  root?: string
  group?: string
  title: string
  description?: string
  iconName?: any
  service?: string
  actions?: React.ReactNode
  compact?: boolean
  banner?: boolean
}

export function APageHeader({
  root,
  group,
  title,
  description,
  iconName,
  service,
  actions,
  compact = false,
  banner = false,
}: APageHeaderProps) {
  const { t } = usePreferences()
  const breadcrumbRoot = root ?? t('account.pageHeader.root')
  if (compact) {
    const compactClassName = `apage-head apage-head--compact${banner ? ' apage-head--banner' : ''}`
    return (
      <header className={compactClassName}>
        <h1 className="apage-sr-title">{title}</h1>
        <div className="ahead-compact-row">
          {service || description ? (
            <div className="ahead-compact-copy">
              {banner ? (
                <span className="ahead-banner-mark" aria-hidden="true">
                  <Icon name={iconName || 'sparkles'} size={15} />
                </span>
              ) : null}
              <div className="ahead-compact-meta">
                {service ? (
                  <Badge variant="outline" className="ahead-membership-badge rounded-full font-normal text-[var(--xiaoone-fg-mute)]">
                    {service}
                  </Badge>
                ) : null}
                {description ? <span>{description}</span> : null}
              </div>
            </div>
          ) : <span />}
          {actions ? <div className="ahead-actions">{actions}</div> : null}
        </div>
      </header>
    )
  }

  return (
    <header className="apage-head">
      <div className="ahead-meta">
        {iconName ? <Icon name={iconName} size={14} /> : <Icon name="user" size={14} />}
        <span className="abreadcrumb">
          {breadcrumbRoot}
          {group ? <span> &nbsp;·&nbsp; </span> : null}
          {group}
        </span>
        {service ? (
          <Badge variant="outline" className="rounded-full font-normal text-[var(--xiaoone-fg-mute)]">
            {service}
          </Badge>
        ) : null}
      </div>
      <div className="ahead-title-row">
        <h1>{title}</h1>
        {actions ? <div className="ahead-actions">{actions}</div> : null}
      </div>
      {description ? <p className="ahead-desc">{description}</p> : null}
    </header>
  )
}
