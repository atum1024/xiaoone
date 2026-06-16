import { CSSProperties, useEffect, useState } from 'react'
import { useThemeStore } from '../store/theme'
import './default-avatar.css'

export const DEFAULT_AVATAR_SRC = '/logo/square-day.png'
export const DEFAULT_AVATAR_SRC_DARK = '/logo/square-night.png'

interface DefaultAvatarProps {
  src?: string | null
  alt?: string
  className?: string
  size?: number
  square?: boolean
}

export function DefaultAvatar({ src, alt = '', className = '', size, square = false }: DefaultAvatarProps) {
  const theme = useThemeStore(state => state.mode)
  const fallbackSrc = theme === 'dark' ? DEFAULT_AVATAR_SRC_DARK : DEFAULT_AVATAR_SRC
  const cleanSrc = (src || '').trim()
  const [imageSrc, setImageSrc] = useState(cleanSrc || fallbackSrc)
  const imageVisible = Boolean(imageSrc)

  useEffect(() => {
    setImageSrc(cleanSrc || fallbackSrc)
  }, [cleanSrc, fallbackSrc])

  const style = size ? ({ '--xo-avatar-size': `${size}px` } as CSSProperties) : undefined

  return (
    <span
      className={[
        'xo-default-avatar',
        square ? 'xo-default-avatar--square' : '',
        (imageSrc === DEFAULT_AVATAR_SRC || imageSrc === DEFAULT_AVATAR_SRC_DARK) ? 'xo-default-avatar--brand' : '',
        imageVisible ? '' : 'xo-default-avatar--fallback',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
    >
      {imageVisible ? (
        <img
          src={imageSrc}
          alt={alt}
          draggable={false}
          onError={() => setImageSrc(imageSrc === fallbackSrc ? '' : fallbackSrc)}
        />
      ) : (
        <span className="xo-default-avatar__fallback" aria-hidden="true">xo</span>
      )}
    </span>
  )
}
