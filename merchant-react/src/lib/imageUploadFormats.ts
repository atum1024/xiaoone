export const SUPPORTED_REFERENCE_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'] as const

export const SUPPORTED_REFERENCE_IMAGE_ACCEPT = SUPPORTED_REFERENCE_IMAGE_MIME_TYPES.join(',')

export function isSupportedReferenceImage(file: File): boolean {
  const type = file.type.split(';')[0].trim().toLowerCase()
  if (SUPPORTED_REFERENCE_IMAGE_MIME_TYPES.includes(type as typeof SUPPORTED_REFERENCE_IMAGE_MIME_TYPES[number]))
    return true
  const name = (file.name || '').toLowerCase()
  return /\.(png|jpe?g)$/.test(name)
}
