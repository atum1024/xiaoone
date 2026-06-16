import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'
import './async-image.css'

export type AsyncImageProps = {
  src?: string
  alt: string
  className?: string
  frameClassName?: string
  failed?: boolean
  pending?: boolean
  loadingLabel?: string
  failedLabel?: string
  onError?: () => void
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError' | 'className'>

export function AsyncImage({
  src,
  alt,
  className = '',
  frameClassName = '',
  failed = false,
  pending = false,
  loadingLabel,
  failedLabel,
  onError,
  ...imgProps
}: AsyncImageProps) {
  const [ready, setReady] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setReady(false)
    setImgFailed(false)
  }, [src])

  const isFailed = failed || imgFailed
  const isLoading = !isFailed && (pending || !src || !ready)

  return (
    <div className={`async-image-frame ${frameClassName}`.trim()}>
      {isFailed ? (
        <div className="async-image async-image--failed" role="img" aria-label={failedLabel || alt}>
          <div className="async-image__failed">
            <ImageOff className="async-image__failed-icon" aria-hidden="true" />
            {failedLabel ? <span className="async-image__label">{failedLabel}</span> : null}
          </div>
        </div>
      ) : isLoading ? (
        <div className="async-image async-image--loading" role="status" aria-label={loadingLabel || alt}>
          {loadingLabel ? <span className="async-image__label">{loadingLabel}</span> : null}
        </div>
      ) : null}
      {src && !isFailed ? (
        <img
          {...imgProps}
          src={src}
          alt={alt}
          className={`async-image__img ${className}`.trim()}
          style={{
            ...(imgProps.style || {}),
            opacity: ready ? 1 : 0,
          }}
          onLoad={() => setReady(true)}
          onError={() => {
            setImgFailed(true)
            onError?.()
          }}
        />
      ) : null}
    </div>
  )
}
