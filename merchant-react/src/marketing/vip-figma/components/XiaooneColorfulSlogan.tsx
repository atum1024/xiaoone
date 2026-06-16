import { useSitePreferences } from '../../sitePreferences'

interface XiaooneColorfulSloganProps {
  className?: string
}

export function XiaooneColorfulSlogan({ className = '' }: XiaooneColorfulSloganProps) {
  const { tKey } = useSitePreferences()
  const slogan = tKey('marketing.vipFigma.slogan')
  const words = slogan.split(' · ')

  return (
    <p className={`vip-figma-colorful-slogan ${className}`.trim()} aria-label={slogan}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-flex items-center gap-[0.65rem]">
          <span className="vip-figma-colorful-slogan__word">{word}</span>
          {index < words.length - 1 ? (
            <span className="vip-figma-colorful-slogan__dot" aria-hidden>
              ·
            </span>
          ) : null}
        </span>
      ))}
    </p>
  )
}
