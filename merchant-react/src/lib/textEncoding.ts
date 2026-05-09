const MOJIBAKE_MARKER = /[ÃÂ]|(?:[à-ÿ][\u0080-\u00ff])|(?:[éèåæç][\u0080-\u00ff]?)/u
const CJK = /[\u3400-\u9fff]/

export function repairUtf8Mojibake(value: string): string {
  if (!value || !MOJIBAKE_MARKER.test(value))
    return value
  try {
    const bytes = Uint8Array.from(Array.from(value), ch => ch.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (CJK.test(decoded) && !CJK.test(value))
      return decoded
  }
  catch {
    // Keep the original string when it is not UTF-8 bytes read as Latin-1.
  }
  return value
}

export function displayText(value?: string | null): string {
  return repairUtf8Mojibake(value || '')
}
