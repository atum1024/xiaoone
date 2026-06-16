import { useState } from 'react'
import { useSitePreferences } from '../sitePreferences'
import { logoAssetsForThemeAndLocale } from '../brandAssets'

interface SloganMarkProps {
  className?: string
}

/** Locale-aware slogan: zh uses image asset; en uses image with text fallback. */
export function SloganMark({ className = 'h-4 md:h-5 mb-14 object-contain opacity-90' }: SloganMarkProps) {
  const { locale, theme, tKey } = useSitePreferences()
  const brand = logoAssetsForThemeAndLocale(theme, locale)
  const [imgFailed, setImgFailed] = useState(false)
  const textSlogan = tKey('marketing.home.sloganText')

  if (locale === 'en' && imgFailed) {
    return (
      <p
        className={`text-sm md:text-base font-medium tracking-wide text-slate-600 dark:text-slate-300 mb-14 ${className.replace('object-contain', '').trim()}`}
        aria-label={textSlogan}
      >
        {textSlogan}
      </p>
    )
  }

  return (
    <img
      src={brand.slogan}
      alt={textSlogan}
      className={className}
      onError={() => setImgFailed(true)}
    />
  )
}
