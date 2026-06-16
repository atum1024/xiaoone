import { useMemo, useState, type CSSProperties } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  DCPAY_BIN_5378_PLATFORM_CATEGORIES,
  DCPAY_BIN_5378_PLATFORM_COUNT,
  isDcpayCardBin5378,
  type DcpayPlatformCategory,
  type DcpaySupportedPlatform,
} from '../data/dcpayCardBin5378Platforms'
import './dcpay-card-bin-platforms-panel.css'

interface DcpayCardBinPlatformsPanelProps {
  cardBin?: string | null
  locale?: 'zh' | 'en'
  compact?: boolean
  className?: string
}

function categoryTitle(category: DcpayPlatformCategory, locale: 'zh' | 'en') {
  return locale === 'en' ? category.titleEn : category.title
}

function platformChipStyle(platform: DcpaySupportedPlatform): CSSProperties {
  return { '--brand': platform.color } as CSSProperties
}

function PlatformChip({
  platform,
  locale,
}: {
  platform: DcpaySupportedPlatform
  locale: 'zh' | 'en'
}) {
  return (
    <li>
      <a
        href={platform.website}
        target="_blank"
        rel="noopener noreferrer"
        className="dcpay-bin-platforms__item"
        style={platformChipStyle(platform)}
        title={platform.website}
        aria-label={locale === 'en' ? `${platform.name}, opens in new tab` : `${platform.name}，在新标签页打开`}
      >
        <span className="dcpay-bin-platforms__logo" aria-hidden="true">
          <img src={platform.logoUrl} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="dcpay-bin-platforms__name">{platform.name}</span>
        <ExternalLink size={12} className="dcpay-bin-platforms__link-icon" aria-hidden="true" />
      </a>
    </li>
  )
}

export function DcpayCardBinPlatformsPanel({
  cardBin,
  locale = 'zh',
  compact = false,
  className = '',
}: DcpayCardBinPlatformsPanelProps) {
  const [expanded, setExpanded] = useState(!compact)
  const categories = DCPAY_BIN_5378_PLATFORM_CATEGORIES

  const headline = useMemo(() => {
    if (locale === 'en') {
      return `Supports ${DCPAY_BIN_5378_PLATFORM_COUNT} platforms across ${categories.length} categories`
    }
    return `支持 ${categories.length} 大类、共 ${DCPAY_BIN_5378_PLATFORM_COUNT} 个平台`
  }, [categories.length, locale])

  if (!isDcpayCardBin5378(cardBin)) return null

  return (
    <section
      className={`dcpay-bin-platforms ${compact ? 'is-compact' : ''} ${className}`.trim()}
      aria-label={locale === 'en' ? 'Supported platforms for card bin 5378' : '5378 卡段支持平台'}
    >
      <header className="dcpay-bin-platforms__head">
        <div>
          <strong>{locale === 'en' ? 'Supported platforms' : '支持平台'}</strong>
          <span>{headline}</span>
        </div>
        {compact ? (
          <button
            type="button"
            className="dcpay-bin-platforms__toggle"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
          >
            {expanded
              ? (locale === 'en' ? 'Hide' : '收起')
              : (locale === 'en' ? 'View all' : '查看全部')}
          </button>
        ) : null}
      </header>

      {!compact || expanded ? (
        <div className="dcpay-bin-platforms__body">
          {categories.map(category => (
            <section key={category.id} className="dcpay-bin-platforms__category">
              <h4>{categoryTitle(category, locale)}</h4>
              <ul className="dcpay-bin-platforms__grid">
                {category.platforms.map(platform => (
                  <PlatformChip key={platform.id} platform={platform} locale={locale} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="dcpay-bin-platforms__strip" aria-label={headline}>
          {categories.flatMap(category => category.platforms).slice(0, 12).map(platform => (
            <li key={platform.id} style={platformChipStyle(platform)}>
              <img src={platform.logoUrl} alt={platform.name} loading="lazy" decoding="async" />
            </li>
          ))}
          {DCPAY_BIN_5378_PLATFORM_COUNT > 12 ? (
            <li className="dcpay-bin-platforms__more">+{DCPAY_BIN_5378_PLATFORM_COUNT - 12}</li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
