import { useState } from 'react'
import { Building2, ShieldCheck } from 'lucide-react'
import { MODULES } from '../app/moduleRegistry'
import { useAuthStore as useAuth } from '../store/auth'
import { TeamChatPage } from './TeamChatPage'

export function PlatformTeamGatePage() {
  const auth = useAuth()
  const isPlatformAdmin = Boolean((auth.me?.user as { is_platform_admin?: boolean } | undefined)?.is_platform_admin)
  const [hasPlatformToken, setHasPlatformToken] = useState(auth.hasPlatformSession())
  const [elevating, setElevating] = useState(false)
  const [error, setError] = useState('')

  async function onElevate() {
    setElevating(true)
    setError('')
    try {
      await auth.elevatePlatform()
      setHasPlatformToken(true)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '平台团队入口暂时不可用')
    }
    finally {
      setElevating(false)
    }
  }

  if (isPlatformAdmin && hasPlatformToken)
    return <TeamChatPage mode="platform" />

  return (
    <div className="mr-page mr-page--spacious">
      <header className="mr-page-head">
        <span className="mr-page-kicker"><Building2 size={14} /> 平台团队入口</span>
        <h1>平台团队沟通</h1>
        <p>平台管理员可进入平台内部会话空间；商户侧团队沟通仍保留在用户端工作台内。</p>
      </header>

      {error ? <div className="mr-state-error">{error}</div> : null}

      <section className="mr-surface">
        <div className="mr-empty">
          <strong><ShieldCheck size={16} /> 平台管理员</strong>
          <p>{isPlatformAdmin ? '进入前需要获取平台会话凭证。' : '当前账号没有平台团队入口权限。'}</p>
        </div>
        {isPlatformAdmin ? (
          <div className="mr-meta-row">
            <button type="button" className="mr-btn mr-btn-primary" onClick={() => void onElevate()} disabled={elevating}>
              {elevating ? '进入中...' : `进入${MODULES.platformTeam.label}`}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
