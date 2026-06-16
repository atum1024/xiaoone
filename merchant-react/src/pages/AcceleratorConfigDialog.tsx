import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Globe, Server } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { useRegion } from '@xiaoone/region'
import { BillingAPI } from '../lib/billingApi'
import { PlanUpgradeDialog } from '../components/PlanUpgradeDialog'
import { RealNameVerifyDialog } from '../components/RealNameVerifyDialog'
import { requiresMainlandRealName } from '../lib/kycGate'
import { useRealNameVerified } from '../lib/useRealNameVerified'
import type { UpgradeFeatureKey, UpgradePlanCode } from '../lib/upgradePlans'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanCode: string
  sharedReady?: boolean
  dedicatedReady: boolean
  onConfigured?: () => void
}

function isBusinessPlan(code: string): boolean {
  return code.trim().toLowerCase() === 'business'
}

function hasNetworkPlan(code: string): boolean {
  return ['startup', 'business'].includes(code.trim().toLowerCase())
}

function networkErrorDescription(e: any): string {
  const responseMessage = String(e?.response?.data?.data?.error || e?.response?.data?.message || '').trim()
  const rawMessage = String(e?.message || '').trim()
  const message = responseMessage || rawMessage
  if (e?.code === 'ECONNABORTED' || /timeout|timed out/i.test(message)) {
    return '配置任务等待超时。请确认用户空间 Hermes 已更新并在线，然后重新配置。'
  }
  if (/missing network acceleration result|no network acceleration result/i.test(message)) {
    return '用户空间 Hermes 未返回加速器配置结果，请先更新 Hermes bridge 和 3x-ui helper。'
  }
  return message || '请稍后重试'
}

export function AcceleratorConfigDialog(props: Props) {
  const { region } = useRegion()
  const { verified: realNameVerified, refresh: refreshRealName } = useRealNameVerified()
  const businessPlan = useMemo(() => isBusinessPlan(props.currentPlanCode), [props.currentPlanCode])
  const networkPlan = useMemo(() => hasNetworkPlan(props.currentPlanCode), [props.currentPlanCode])
  const sharedReady = props.sharedReady !== false
  const [upgrade, setUpgrade] = useState<{ featureKey: UpgradeFeatureKey; requiredPlanCode: UpgradePlanCode } | null>(null)
  const [realNameOpen, setRealNameOpen] = useState(false)

  const showUpgrade = (featureKey: UpgradeFeatureKey, requiredPlanCode: UpgradePlanCode) => {
    setUpgrade({ featureKey, requiredPlanCode })
  }

  const ensureRealName = () => {
    if (!requiresMainlandRealName(region, realNameVerified)) return true
    setRealNameOpen(true)
    return false
  }

  const sharedM = useMutation({
    mutationFn: () => BillingAPI.activateSharedNetwork(),
    onSuccess: (result) => {
      toast({
        title: '共享加速器已配置',
        description: `已生成 ${result.profiles?.length || 0} 份 3x-ui 配置文件。`,
      })
      props.onOpenChange(false)
      props.onConfigured?.()
    },
    onError: (e: any) => {
      if (e?.response?.status === 402) {
        showUpgrade('network_acceleration', 'startup')
        props.onOpenChange(false)
        return
      }
      if (e?.response?.status === 409 && e?.response?.data?.message === 'shared_server_not_ready') {
        toast({ title: '等待共享空间配置', description: '请联系平台运营完成 3x-ui 面板凭据接入。' })
        props.onConfigured?.()
        return
      }
      if (e?.response?.status === 409 && e?.response?.data?.message === 'hermes_workspace_not_ready') {
        toast({ title: '等待 Hermes 连接', description: '请先启动用户空间 Hermes，再重新配置共享加速器。' })
        props.onConfigured?.()
        return
      }
      toast({ title: '共享加速器配置失败', description: networkErrorDescription(e) })
    },
  })

  const dedicatedM = useMutation({
    mutationFn: () => BillingAPI.activateDedicatedNetwork(),
    onSuccess: (result) => {
      const summary = result.summary || { success: 0, failed: 0 }
      toast({
        title: summary.failed > 0 ? '独享加速器部分完成' : '独享加速器已配置',
        description: `成功 ${summary.success}，失败 ${summary.failed}`,
      })
      props.onOpenChange(false)
      props.onConfigured?.()
    },
    onError: (e: any) => {
      if (e?.response?.status === 402) {
        showUpgrade('dedicated_network', 'business')
        props.onOpenChange(false)
        return
      }
      if (e?.response?.status === 409 && e?.response?.data?.message === 'dedicated_server_not_ready') {
        toast({ title: '等待运营配置', description: '请联系平台运营完成独享服务器接入。' })
        props.onConfigured?.()
        return
      }
      if (e?.response?.status === 409 && e?.response?.data?.message === 'hermes_workspace_not_ready') {
        toast({ title: '等待 Hermes 连接', description: '请先启动用户空间 Hermes，再重新配置独享加速器。' })
        props.onConfigured?.()
        return
      }
      toast({ title: '独享加速器配置失败', description: networkErrorDescription(e) })
    },
  })

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="accelerator-config-dialog">
          <DialogHeader>
            <DialogTitle>智能配置加速器</DialogTitle>
            <DialogDescription>选择共享或独享加速器配置方式。</DialogDescription>
          </DialogHeader>
          <section className="accelerator-config-grid">
            <article className="accelerator-config-card">
              <header>
                <strong><Globe size={16} /> 共享加速器</strong>
                <p>3x-ui 配置链接，创业版及以上可用，每位用户 1 个独立配置文件</p>
                {!sharedReady ? <em>请联系平台运营完成 3x-ui 面板凭据接入</em> : null}
              </header>
              <Button
                type="button"
                onClick={() => {
                  if (!networkPlan) {
                    props.onOpenChange(false)
                    showUpgrade('network_acceleration', 'startup')
                    return
                  }
                  if (!ensureRealName()) return
                  sharedM.mutate()
                }}
                disabled={!sharedReady || sharedM.isPending || dedicatedM.isPending}
              >
                {sharedReady ? (sharedM.isPending ? '配置中...' : '配置') : '等待 3x-ui 配置'}
              </Button>
            </article>
            <article className="accelerator-config-card">
              <header>
                <strong><Server size={16} /> 独享加速器</strong>
                <p>商户专属，独享服务器 10 份 .ovpn</p>
                {businessPlan && !props.dedicatedReady ? <em>请联系平台运营完成独享服务器接入</em> : null}
              </header>
              <Button
                type="button"
                variant={businessPlan ? 'default' : 'secondary'}
                disabled={(businessPlan && !props.dedicatedReady) || sharedM.isPending || dedicatedM.isPending}
                onClick={() => {
                  if (!businessPlan) {
                    props.onOpenChange(false)
                    showUpgrade('dedicated_network', 'business')
                    return
                  }
                  if (!ensureRealName()) return
                  dedicatedM.mutate()
                }}
              >
                {businessPlan && !props.dedicatedReady ? '等待运营配置' : dedicatedM.isPending ? '配置中...' : '配置'}
              </Button>
            </article>
          </section>
        </DialogContent>
      </Dialog>
      <PlanUpgradeDialog
        open={Boolean(upgrade)}
        onOpenChange={(open) => {
          if (!open) setUpgrade(null)
        }}
        featureKey={upgrade?.featureKey || 'network_acceleration'}
        requiredPlanCode={upgrade?.requiredPlanCode || 'startup'}
      />
      <RealNameVerifyDialog
        open={realNameOpen}
        onOpenChange={setRealNameOpen}
        featureLabel="业务访问与协作支持"
        onVerified={refreshRealName}
      />
    </>
  )
}
