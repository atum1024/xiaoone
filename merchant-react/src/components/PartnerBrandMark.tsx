import { Icon } from './Icon'
import { getPartnerBrand, partnerBrandCssVars } from '../lib/partnerBrands'
import './PartnerBrandMark.css'

interface PartnerBrandMarkProps {
  brand: string
  size?: number
  className?: string
}

export function PartnerBrandMark({ brand, size = 18, className = '' }: PartnerBrandMarkProps) {
  const meta = getPartnerBrand(brand)
  if (!meta)
    return null

  return (
    <span
      className={`partner-brand-mark ${className}`.trim()}
      style={partnerBrandCssVars(meta.key)}
      aria-hidden="true"
    >
      {meta.imageUrl
        ? <img src={meta.imageUrl} alt="" width={size} height={size} />
        : <Icon name={meta.icon} size={size} />}
    </span>
  )
}
