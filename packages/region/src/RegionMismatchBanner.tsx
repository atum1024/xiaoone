import { regionChoiceLabel, setRegionChoice } from './regionChoice'
import { useRegion } from './RegionProvider'
import type { RegionCode } from './regionDetect'

export interface RegionMismatchBannerProps {
  locale?: 'zh' | 'en'
  className?: string
  apiBase?: string
}

export function RegionMismatchBanner({ locale = 'zh', className = '', apiBase }: RegionMismatchBannerProps) {
  const { mismatch, region, ipRegion, refresh } = useRegion()
  if (!mismatch || !ipRegion)
    return null

  const targetRegion = ipRegion as RegionCode
  const isZh = locale === 'zh'
  const message = isZh
    ? (targetRegion === 'overseas'
        ? '检测到您可能位于中国大陆以外，当前账户/体验为大陆模式。可切换为海外体验以使用邮箱注册与美元支付。'
        : '检测到您可能位于中国大陆，当前为海外体验。可切换为大陆体验以使用手机号注册与人民币支付。')
    : (targetRegion === 'overseas'
        ? 'You appear to be outside mainland China while the current experience is mainland. Switch to the global experience for email signup and USD billing.'
        : 'You appear to be in mainland China while the global experience is active. Switch to the mainland experience for phone signup and CNY billing.')

  async function handleSwitch() {
    const ok = await setRegionChoice(targetRegion, apiBase)
    if (ok)
      await refresh()
  }

  return (
    <div
      className={className}
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 16px',
        fontSize: '13px',
        background: 'var(--xiaoone-region-banner-bg, rgba(59, 130, 246, 0.12))',
        color: 'var(--xiaoone-region-banner-fg, inherit)',
        borderBottom: '1px solid var(--xiaoone-region-banner-border, rgba(59, 130, 246, 0.25))',
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => { void handleSwitch() }}
        style={{
          whiteSpace: 'nowrap',
          fontWeight: 600,
          textDecoration: 'underline',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: 0,
        }}
      >
        {isZh
          ? `切换为${regionChoiceLabel(targetRegion, 'zh')}体验`
          : `Switch to ${regionChoiceLabel(targetRegion, 'en')}`}
        {region !== targetRegion ? '' : ''}
      </button>
    </div>
  )
}
