import { useCallback, useEffect, useState } from 'react'
import {
  LOCAL_REAL_NAME_EVENT,
  LOCAL_REAL_NAME_STORAGE_KEY,
  getLocalRealNameOverride,
  type LocalRealNameChangeDetail,
} from '@xiaoone/region'
import { api } from './httpClient'

interface KycStatus {
  verified?: boolean
}

export function useRealNameVerified() {
  const [verified, setVerified] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const localOverride = getLocalRealNameOverride()
    if (localOverride !== null) {
      setVerified(localOverride)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const r = await api.get('/api/v1/iam/merchant/kyc/status/')
      const payload = (r.data?.data || r.data) as KycStatus
      setVerified(Boolean(payload?.verified))
    } catch {
      setVerified(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined')
      return
    function onLocalChange(event: Event) {
      const detail = (event as CustomEvent<LocalRealNameChangeDetail>).detail
      if (detail?.verified !== null && detail?.verified !== undefined) {
        setVerified(detail.verified)
        return
      }
      refresh().catch(() => {})
    }
    function onStorage(event: StorageEvent) {
      if (event.key === LOCAL_REAL_NAME_STORAGE_KEY)
        refresh().catch(() => {})
    }
    window.addEventListener(LOCAL_REAL_NAME_EVENT, onLocalChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_REAL_NAME_EVENT, onLocalChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  return { verified: verified === true, loading, refresh }
}
