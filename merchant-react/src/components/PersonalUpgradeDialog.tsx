import { usePreferences } from '../app/preferences'
import { PlanUpgradeDialog } from './PlanUpgradeDialog'
import { teamFeatureKeyword } from '../lib/upgradePlans'

export function PersonalUpgradeDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: string
}) {
  const { locale, t } = usePreferences()
  const feature = props.feature || t('common.dialog.featureDefault')
  const teamKw = teamFeatureKeyword(locale)
  const requiredPlanCode = feature.includes(teamKw) ? 'business' : 'startup'

  return (
    <PlanUpgradeDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      feature={feature}
      requiredPlanCode={requiredPlanCode}
    />
  )
}
