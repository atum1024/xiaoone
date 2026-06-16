import { useEffect } from 'react'
import { BillingAPI, type CheckoutStatusResult } from '../lib/billingApi'

const MAX_POLL_TIMES = 60
const POLL_INTERVAL_MS = 2000

export function useCheckoutPolling(
  checkoutId: string | null | undefined,
  onStatus: (status: CheckoutStatusResult) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !checkoutId)
      return

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let polls = 0

    const poll = async () => {
      if (stopped)
        return
      try {
        const status = await BillingAPI.checkoutStatus(checkoutId)
        onStatus(status)
        if (status.status === 'paid' || status.status === 'failed' || status.status === 'expired')
          return
      }
      catch {
        // keep polling within timeout window
      }
      polls += 1
      if (polls >= MAX_POLL_TIMES)
        return
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    void poll()

    return () => {
      stopped = true
      if (timer)
        clearTimeout(timer)
    }
  }, [checkoutId, enabled, onStatus])
}
