import { authFetch } from './authFetch'

export function messageArtifactEndpoint(messageId: string, index: number): string {
  return `/api/v1/agent/messages/${messageId}/artifact/?index=${index}`
}

export async function downloadMessageArtifact(params: {
  messageId: string
  artifactUrl?: string
  artifactName?: string
  index: number
}): Promise<void> {
  const { messageId, artifactUrl, artifactName, index } = params
  if (artifactUrl && /^https?:\/\//i.test(artifactUrl)) {
    window.open(artifactUrl, '_blank', 'noopener,noreferrer')
    return
  }
  const endpoint = messageArtifactEndpoint(messageId, index)
  const resp = await authFetch(endpoint)
  if (!resp.ok) throw new Error('????')
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = artifactName || 'presentation.pptx'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
