import { useState } from 'react'
import { Check, CircleHelp, Lock } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@xiaoone/react-ui'
import {
  SERVICE_USAGE_AGREEMENT,
  formatPlanFeatureText,
  isBusinessTierUpgradeHighlight,
  partitionPlanFeatureRows,
  resolvePlanFeatureRows,
  serviceUsageAgreementText,
  type MarketingFeatureRow,
  type PlanFeatureLocale,
  type PlanLike,
  type RegionCode,
} from '@xiaoone/region'
import { getPublicSiteOrigin } from './publicSite'

interface ServiceAgreementHintProps {
  locale: PlanFeatureLocale
  compact?: boolean
}

function ServiceAgreementHint({ locale, compact = false }: ServiceAgreementHintProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const copy = serviceUsageAgreementText(locale)
  const termsHref = `${getPublicSiteOrigin()}${SERVICE_USAGE_AGREEMENT.termsPath}`

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`plan-feature-hint${compact ? ' plan-feature-hint--compact' : ''}`}
            aria-label={locale === 'zh' ? '查看服务使用协议' : 'View service usage agreement'}
          >
            <CircleHelp size={compact ? 13 : 14} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="plan-feature-hint-pop max-w-[320px]">
          <strong>{copy.title}</strong>
          <p>{copy.summary}</p>
          <Button variant="ghost" className="h-auto p-0" onClick={() => setDialogOpen(true)}>
            {locale === 'zh' ? '查看完整协议' : 'View full agreement'}
          </Button>
        </PopoverContent>
      </Popover>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[min(560px,94vw)]">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-[var(--xiaoone-fg-mute)]">
            <p className="m-0">{copy.summary}</p>
            <ul className="m-0 grid gap-2 pl-5">
              {copy.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a href={termsHref} target="_blank" rel="noreferrer" className="text-[var(--xiaoone-accent)]">
              {locale === 'zh' ? '查看完整《用户协议》' : 'View full User Agreement'}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface PlanFeatureListProps {
  plan: PlanLike
  region: RegionCode
  locale?: PlanFeatureLocale
  className?: string
  itemClassName?: string
  lockedClassName?: string
  showRegionRestricted?: boolean
}

function renderFeatureRow(
  row: MarketingFeatureRow,
  plan: PlanLike,
  locale: PlanFeatureLocale,
  planCode: string,
  itemClassName: string,
  lockedClassName: string,
  ServiceHint: typeof ServiceAgreementHint,
) {
  const locked = row.state === 'locked'
  const upgrade = isBusinessTierUpgradeHighlight(planCode, row)
  const text = formatPlanFeatureText(row, plan, locale)
  const classNames = [
    itemClassName,
    locked ? lockedClassName : '',
    upgrade ? 'plan-feature--upgrade' : '',
  ].filter(Boolean).join(' ')

  return (
    <li key={row.key} className={classNames}>
      {locked ? <Lock size={16} /> : <Check size={16} />}
      <span>{text}</span>
      {row.agreement_hint ? <ServiceHint locale={locale} compact /> : null}
    </li>
  )
}

export function PlanFeatureList({
  plan,
  region,
  locale = 'zh',
  className = 'plan-feature-list',
  itemClassName = '',
  lockedClassName = 'plan-feature--locked',
  showRegionRestricted,
}: PlanFeatureListProps) {
  const rows = resolvePlanFeatureRows(plan, { region, showRegionRestricted })
  const { core, marketing } = partitionPlanFeatureRows(rows)
  const planCode = String(plan.code || '')

  return (
    <div className="plan-feature-groups">
      <ul className={className}>
        {core.map(row => renderFeatureRow(row, plan, locale, planCode, itemClassName, lockedClassName, ServiceAgreementHint))}
      </ul>
      {marketing.length > 0 ? (
        <>
          <div className="plan-feature-section-label">
            {locale === 'zh' ? '营销服务' : 'Marketing services'}
          </div>
          <ul className={`${className} plan-feature-list--marketing`}>
            {marketing.map(row => renderFeatureRow(row, plan, locale, planCode, itemClassName, lockedClassName, ServiceAgreementHint))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

export type { PlanFeatureLocale, PlanLike } from '@xiaoone/region'
