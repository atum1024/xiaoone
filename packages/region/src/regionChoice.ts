import type { RegionCode } from './regionDetect'

function apiBaseFromArg(apiBase?: string): string {
  return (apiBase ?? '').replace(/\/$/, '')
}

/**
 * Persist anonymous region preference via IAM (HttpOnly cookie).
 * Logged-in users keep account-bound region; this only affects anonymous fallbacks.
 */
export async function setRegionChoice(
  region: RegionCode,
  apiBase?: string,
): Promise<boolean> {
  const prefix = apiBaseFromArg(apiBase)
  const url = `${prefix}/api/v1/iam/public/region/choice/`
  try {
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region }),
    })
    return resp.ok
  } catch {
    return false
  }
}

export async function clearRegionChoice(apiBase?: string): Promise<boolean> {
  const prefix = apiBaseFromArg(apiBase)
  const url = `${prefix}/api/v1/iam/public/region/choice/`
  try {
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: '' }),
    })
    return resp.ok
  } catch {
    return false
  }
}

export function regionChoiceLabel(region: RegionCode, locale: 'zh' | 'en'): string {
  if (locale === 'zh')
    return region === 'mainland' ? '中国大陆' : '海外'
  return region === 'mainland' ? 'Mainland China' : 'Global'
}
