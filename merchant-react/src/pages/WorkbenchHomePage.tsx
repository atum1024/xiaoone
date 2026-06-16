import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { WorkbenchStatusGrid } from '../components/WorkbenchStatusGrid'
import { useAssistantRuntimeStatusQuery } from '../components/AssistantRuntimeStatus'
import { usePreferences } from '../app/preferences'
import {
  assistantWorkstationBlockReason,
  ensureWorkspaceProvision,
  isWorkspaceReclaimed,
} from '../lib/workspaceStatusApi'
import {
  WorkspacePreparingModal,
  isWorkspacePreparingDismissed,
  markWorkspacePreparingDismissed,
} from '../components/WorkspacePreparingModal'
import { useAuthStore } from '../store/auth'

export function WorkbenchHomePage() {
  const { locale, t } = usePreferences()
  const userId = useAuthStore(state => state.user?.id)
  const subscriptionPlanCode = useAuthStore(state => state.subscriptionPlanCode)
  const hasPaidSubscription = Boolean(subscriptionPlanCode && subscriptionPlanCode !== 'free')
  const [preparingOpen, setPreparingOpen] = useState(false)
  const [preparingDismissed, setPreparingDismissed] = useState(() => isWorkspacePreparingDismissed(userId))
  const assistantRuntimeStatusQuery = useAssistantRuntimeStatusQuery(hasPaidSubscription)
  const workspaceStatus = assistantRuntimeStatusQuery.data ?? null

  useEffect(() => {
    setPreparingDismissed(isWorkspacePreparingDismissed(userId))
  }, [userId])

  useEffect(() => {
    if (!hasPaidSubscription) return
    const status = workspaceStatus
    if (assistantRuntimeStatusQuery.isLoading && !status) return
    if (status?.status === 'not_found') {
      void ensureWorkspaceProvision()
        .then(() => assistantRuntimeStatusQuery.refetch())
        .catch(() => {})
    }
    const reason = assistantWorkstationBlockReason(status, locale)
    if (!preparingDismissed && reason) {
      setPreparingOpen(true)
    }
  }, [hasPaidSubscription, workspaceStatus, assistantRuntimeStatusQuery.isLoading, locale, preparingDismissed])

  if (!hasPaidSubscription)
    return <Navigate to="/membership" replace />

  function handleClosePreparingModal() {
    setPreparingDismissed(true)
    markWorkspacePreparingDismissed(userId)
    setPreparingOpen(false)
  }

  return (
    <section className="wb-status-page relative flex flex-col min-h-full bg-[#f8fafc] overflow-x-hidden">
      <div className="flex-1 flex flex-col w-full max-w-[1180px] mx-auto px-5 py-4 gap-3">
        <header className="wb-status-page__header">
          <div>
            <h1 className="wb-status-page__title">
              {t('common.workbench.status.pageTitle', '仪表盘')}
            </h1>
            <p className="wb-status-page__subtitle">
              {t('common.workbench.status.pageSubtitle', '一屏查看账号、通道与资源状态')}
            </p>
          </div>
        </header>

        <WorkbenchStatusGrid />
      </div>

      <WorkspacePreparingModal
        open={preparingOpen}
        onClose={handleClosePreparingModal}
        merchantSubdomain={workspaceStatus?.merchant_subdomain || ''}
        subdomainRoot={workspaceStatus?.subdomain_root || ''}
        locale={locale === 'en' ? 'en' : 'zh'}
        title={isWorkspaceReclaimed(workspaceStatus) ? t('common.workspace.reclaimedTitle', '会员已到期') : undefined}
        description={isWorkspaceReclaimed(workspaceStatus) ? t('common.workspace.reclaimedDesc', '工作区实例已进入退还状态，续费会员后可恢复使用。') : undefined}
        renewHref={isWorkspaceReclaimed(workspaceStatus) ? '/workbench/pricing' : undefined}
      />
    </section>
  )
}
