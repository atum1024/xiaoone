const DEPLOY_ENV = String(import.meta.env.VITE_DEPLOY_ENV || 'local').trim().toLowerCase()

export function deployEnvTier(): string {
  return DEPLOY_ENV || 'local'
}

export function DeployEnvBadge({ className = '' }: { className?: string }) {
  const tier = deployEnvTier()
  if (tier === 'prod') return null
  const label = tier === 'staging' ? 'STAGING' : tier.toUpperCase()
  return (
    <span
      className={className}
      data-xiaoone-deploy-env={tier}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        lineHeight: 1.4,
        color: '#422006',
        background: '#fde047',
        border: '1px solid #eab308',
      }}
    >
      {label}
    </span>
  )
}

export function syncDeployEnvMeta(): void {
  if (typeof document === 'undefined') return
  const tier = deployEnvTier()
  let meta = document.querySelector('meta[name="xiaoone-env"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'xiaoone-env')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', tier)
}
