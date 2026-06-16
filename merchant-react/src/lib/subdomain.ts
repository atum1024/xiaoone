export const RESERVED_SUBDOMAINS = new Set([
  'api',
  'vip',
  'admin',
  'www',
  'mail',
  'ws',
  'static',
  'docs',
  'help',
  'hermes',
  'support',
  'beta',
  'dev',
  'staging',
  'blog',
  'stat',
  'cdn',
])

export function isValidMerchantSubdomain(value: string): boolean {
  const subdomain = value.trim().toLowerCase()
  return /^[a-z0-9-]{3,20}$/.test(subdomain)
    && !subdomain.startsWith('-')
    && !subdomain.endsWith('-')
    && !RESERVED_SUBDOMAINS.has(subdomain)
}

function stableBase36Hash(value: string): string {
  let hash = 2166136261
  for (const char of value.trim()) {
    hash ^= char.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(6, '0').slice(0, 8)
}

export function sanitizeMerchantSubdomainSeed(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 20)
    .replace(/-+$/g, '')
}

export function deriveMerchantSubdomain(value: string, fallback = 'workspace'): string {
  const rawInput = value.trim()
  const raw = rawInput || fallback
  const seed = sanitizeMerchantSubdomainSeed(raw)
  const containsNonAscii = /[^\x00-\x7F]/.test(rawInput)
  if (!containsNonAscii && isValidMerchantSubdomain(seed)) return seed

  if (!rawInput) {
    const fallbackSeed = sanitizeMerchantSubdomainSeed(fallback)
    if (isValidMerchantSubdomain(fallbackSeed)) return fallbackSeed
  }

  const hashed = `x1-${stableBase36Hash(raw)}`
  if (isValidMerchantSubdomain(hashed)) return hashed

  return `x1-${stableBase36Hash(`${raw}-${fallback}`)}`
}
