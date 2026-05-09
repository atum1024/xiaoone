import * as React from 'react'
import { Badge } from '@xiaoone/react-ui'
import { Icon } from '../../components/Icon'

export interface APageHeaderProps {
  /** 面包屑根，默认 "账户中心"。独立模块（如团队管理）可以传别的根 */
  root?: string
  group?: string
  title: string
  description?: string
  iconName?: any
  service?: string
  actions?: React.ReactNode
}

export function APageHeader({
  root = '账户中心',
  group,
  title,
  description,
  iconName,
  service,
  actions,
}: APageHeaderProps) {
  return (
    <header className="apage-head">
      <div className="ahead-meta">
        {iconName ? <Icon name={iconName} size={14} /> : <Icon name="user" size={14} />}
        <span className="abreadcrumb">
          {root}
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
