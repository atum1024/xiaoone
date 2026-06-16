import { useState } from 'react'
import { Check, HelpCircle, Lock } from 'lucide-react'
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

interface PlanFeatureListProps {
  plan: PlanLike
  region: RegionCode
  locale?: PlanFeatureLocale
  showRegionRestricted?: boolean
  className?: string
}

function renderFeatureRow(
  row: MarketingFeatureRow,
  plan: PlanLike,
  locale: PlanFeatureLocale,
  planCode: string,
  onAgreementClick: () => void,
) {
  const locked = row.state === 'locked'
  const upgrade = isBusinessTierUpgradeHighlight(planCode, row)
  const text = formatPlanFeatureText(row, plan, locale)

  return (
    <li
      key={row.key}
      className={`flex items-start gap-3${locked ? ' opacity-55' : ''}${upgrade ? ' plan-feature--upgrade' : ''}`}
    >
      {locked
        ? <Lock className="mt-0.5 flex-shrink-0 text-gray-400" size={18} />
        : <Check className={`mt-0.5 flex-shrink-0${upgrade ? ' text-blue-600' : ' text-teal-500'}`} size={18} />}
      <span className={`text-sm${upgrade ? ' font-semibold text-blue-900' : ' text-gray-800'}${locked ? ' line-through text-gray-400' : ''}`}>
        {text}
      </span>
      {row.agreement_hint ? (
        <button
          type="button"
          className="mt-0.5 inline-flex flex-shrink-0 text-gray-400 hover:text-teal-600"
          aria-label={locale === 'zh' ? '查看服务使用协议' : 'View service usage agreement'}
          onClick={onAgreementClick}
        >
          <HelpCircle size={16} />
        </button>
      ) : null}
    </li>
  )
}

export function PlanFeatureList({
  plan,
  region,
  locale = 'zh',
  showRegionRestricted,
  className = 'space-y-3',
}: PlanFeatureListProps) {
  const rows = resolvePlanFeatureRows(plan, { region, showRegionRestricted })
  const { core, marketing } = partitionPlanFeatureRows(rows)
  const planCode = String(plan.code || '')
  const [dialogOpen, setDialogOpen] = useState(false)
  const copy = serviceUsageAgreementText(locale)

  return (
    <>
      <div className="plan-feature-groups">
        <ul className={className}>
          {core.map(row => renderFeatureRow(row, plan, locale, planCode, () => setDialogOpen(true)))}
        </ul>
        {marketing.length > 0 ? (
          <>
            <div className="mt-3 border-t border-dashed border-gray-200 pt-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {locale === 'zh' ? '营销服务' : 'Marketing services'}
            </div>
            <ul className={`${className} !space-y-2.5`}>
              {marketing.map(row => renderFeatureRow(row, plan, locale, planCode, () => setDialogOpen(true)))}
            </ul>
          </>
        ) : null}
      </div>
      {dialogOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" onClick={() => setDialogOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={event => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">{copy.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{copy.summary}</p>
            <ul className="mt-4 grid gap-2 pl-5 text-sm text-gray-700">
              {copy.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a
              href={SERVICE_USAGE_AGREEMENT.termsPath}
              className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              {locale === 'zh' ? '查看完整《用户协议》' : 'View full User Agreement'}
            </a>
            <button
              type="button"
              className="mt-5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
              onClick={() => setDialogOpen(false)}
            >
              {locale === 'zh' ? '我知道了' : 'Got it'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
