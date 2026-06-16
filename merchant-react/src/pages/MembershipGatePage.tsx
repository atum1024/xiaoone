import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { LogOut } from 'lucide-react'
import { Button } from '@xiaoone/react-ui'
import { MembershipPurchaseSurface } from '../components/MembershipPurchaseSurface'
import { useAuthStore as useAuth } from '../store/auth'
import { hasPaidSubscription } from '../lib/membershipRouting'
import './MembershipGatePage.css'

export function MembershipGatePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlanCode = (() => {
    const raw = String(searchParams.get('plan_code') || '').trim().toLowerCase()
    return raw === 'personal' || raw === 'startup' || raw === 'business' ? raw : ''
  })()
  const selectedTermMonths = (() => {
    const raw = String(searchParams.get('term') || '').trim()
    return raw === '1' || raw === '3' || raw === '6' || raw === '12' ? raw : ''
  })()


  useEffect(() => {
    if (hasPaidSubscription(auth.subscriptionPlanCode)) {
      navigate('/workbench', { replace: true })
    }
  }, [auth.subscriptionPlanCode, navigate])

  const logout = () => {
    auth.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="membership-gate">
      <header className="membership-gate__bar">
        <div className="membership-gate__brand">
          <span className="membership-gate__mark" aria-hidden="true">x</span>
          <div>
            <strong>xiaoone</strong>
            <span>会员开通</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut size={14} />
          退出登录
        </Button>
      </header>
      <main className="membership-gate__main">
        <MembershipPurchaseSurface
          title="选择适合当前阶段的 xiaoone 套餐"
          description="开通后进入智能工作站。三档会员按月计费，优惠码和当前可用支付渠道会在付款弹窗中确认。"
          requiredNote="该账号尚未开通会员，完成开通后会自动进入系统。"
          initialPlanCode={selectedPlanCode}
          initialTermMonths={selectedTermMonths}
          onActivated={() => navigate('/workbench', { replace: true })}
        />
      </main>
    </div>
  )
}
