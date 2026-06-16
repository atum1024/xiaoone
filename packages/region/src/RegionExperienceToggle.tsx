import { regionChoiceLabel } from './regionChoice'
import { useRegion } from './RegionProvider'
import type { RegionCode } from './regionDetect'

export function RegionExperienceToggle({
  locale = 'zh',
  className = '',
}: {
  locale?: 'zh' | 'en'
  className?: string
}) {
  const { region, switchRegion, loading } = useRegion()
  const next: RegionCode = region === 'mainland' ? 'overseas' : 'mainland'
  const isZh = locale === 'zh'

  return (
    <button
      type="button"
      disabled={loading}
      className={className || undefined}
      onClick={() => { void switchRegion(next) }}
      aria-label={isZh ? `切换为${regionChoiceLabel(next, 'zh')}体验` : `Switch to ${regionChoiceLabel(next, 'en')} experience`}
      title={isZh
        ? `当前：${regionChoiceLabel(region, 'zh')}体验，点击切换`
        : `Current: ${regionChoiceLabel(region, 'en')}, click to switch`}
    >
      <span>{regionChoiceLabel(region, locale)}</span>
    </button>
  )
}
