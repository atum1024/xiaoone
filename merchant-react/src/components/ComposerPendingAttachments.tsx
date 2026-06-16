import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Icon } from './Icon'
import { isSupportedReferenceImage } from '../lib/imageUploadFormats'

type ComposerPendingAttachmentsProps = {
  files: File[]
  onRemove: (index: number) => void
  removeLabel?: string
}

type PendingPreviewUrl = {
  key: string
  url: string
}

function isPreviewableVideo(file: File) {
  const type = file.type.split(';')[0].trim().toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/.test(name)
}

function previewKind(file: File): 'image' | 'video' | 'file' {
  if (isSupportedReferenceImage(file))
    return 'image'
  if (isPreviewableVideo(file))
    return 'video'
  return 'file'
}

function previewKey(file: File, index: number) {
  return `${file.name}:${file.size}:${file.lastModified}:${index}`
}

export function ComposerPendingAttachments({
  files,
  onRemove,
  removeLabel = '??',
}: ComposerPendingAttachmentsProps) {
  const [previewUrls, setPreviewUrls] = useState<PendingPreviewUrl[]>([])

  useEffect(() => {
    const nextPreviewUrls = files.map((file, index) => {
      const kind = previewKind(file)
      return {
        key: previewKey(file, index),
        url: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : '',
      }
    })

    setPreviewUrls(nextPreviewUrls)
    return () => {
      nextPreviewUrls.forEach(({ url }) => {
        if (url)
          URL.revokeObjectURL(url)
      })
    }
  }, [files])

  if (!files.length)
    return null

  return (
    <div className="cx-pending-attachments" aria-label="?????">
      {files.map((file, index) => {
        const kind = previewKind(file)
        const key = previewKey(file, index)
        const previewUrl = previewUrls[index]?.key === key ? previewUrls[index]?.url : ''
        return (
          <article key={`${file.name}:${file.size}:${index}`} className="cx-pending-attachment">
            <div className="cx-pending-attachment__preview" aria-hidden="true">
              {kind === 'image' && previewUrl ? (
                <img src={previewUrl} alt="" loading="lazy" />
              ) : kind === 'video' && previewUrl ? (
                <video src={previewUrl} muted playsInline preload="metadata" />
              ) : (
                <Icon name="file" size={18} />
              )}
            </div>
            <div className="cx-pending-attachment__meta">
              <strong title={file.name}>{file.name}</strong>
            </div>
            <button
              type="button"
              className="cx-pending-attachment__remove"
              aria-label={`${removeLabel} ${file.name}`}
              onClick={() => onRemove(index)}
            >
              <Trash2 size={12} />
            </button>
          </article>
        )
      })}
    </div>
  )
}
