import { useLocation, useNavigate } from 'react-router'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import {
  buildUpgradePlanUrl,
  featureMetaForKey,
  getUpgradePlanLabels,
  type UpgradeFeatureKey,
  type UpgradePlanCode,
} from '../lib/upgradePlans'

interface PlanUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: string
  featureKey?: UpgradeFeatureKey
  requiredPlanCode?: UpgradePlanCode
  description?: string
}

export function PlanUpgradeDialog({
  open,
  onOpenChange,
  feature,
  featureKey,
  requiredPlanCode,
  description,
}: PlanUpgradeDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { locale, t, tpl } = usePreferences()
  const meta = featureMetaForKey(featureKey, locale)
  const planLabels = getUpgradePlanLabels(locale)
  const finalFeature = feature || meta?.feature || t('common.dialog.featureDefault')
  const finalPlanCode = requiredPlanCode || meta?.requiredPlanCode || 'startup'
  const finalPlanName = planLabels[finalPlanCode]
  const finalDescription = description || meta?.description || tpl('common.dialog.upgradeDefaultDesc', finalFeature, finalPlanName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{meta?.title || t('common.dialog.upgradeTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm text-[var(--xiaoone-fg-mute)]">
          <p className="m-0">{finalDescription}</p>
          <p className="m-0 rounded-md border border-[var(--xiaoone-border)] bg-[var(--xiaoone-bg-soft)] px-3 py-2">
            {tpl('common.dialog.upgradeSuggest', finalPlanName)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.dialog.later')}</Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              navigate(buildUpgradePlanUrl({
                featureKey,
                planCode: finalPlanCode,
                from: `${location.pathname}${location.search}`,
              }))
            }}
          >
            {t('common.dialog.upgradeNow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
