import { logoAssetsForTheme } from '../../brandAssets'

type LogoVariant = 'horizontal' | 'square' | 'slogan'
type LogoTone = 'on-dark' | 'on-light'

interface XiaooneBrandMarkProps {
  variant?: LogoVariant
  tone?: LogoTone
  className?: string
  alt?: string
}

const variantClass: Record<LogoVariant, string> = {
  horizontal: 'xiaoone-brand-mark xiaoone-brand-mark--horizontal',
  square: 'xiaoone-brand-mark xiaoone-brand-mark--square',
  slogan: 'xiaoone-brand-mark xiaoone-brand-mark--slogan',
}

export function XiaooneBrandMark({
  variant = 'horizontal',
  tone = 'on-dark',
  className = '',
  alt = 'xiaoone',
}: XiaooneBrandMarkProps) {
  const brand = logoAssetsForTheme(tone === 'on-light' ? 'light' : 'dark')

  return (
    <img
      src={brand[variant]}
      alt={alt}
      className={`${variantClass[variant]} ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  )
}
