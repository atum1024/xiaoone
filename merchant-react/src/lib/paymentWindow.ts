export function openPaymentWindow(title = '支付宝支付'): Window | null {
  const paymentWindow = window.open('about:blank', '_blank')
  if (!paymentWindow)
    return null
  try {
    paymentWindow.opener = null
    paymentWindow.document.title = title
    paymentWindow.document.body.style.cssText = 'margin:0;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f9fafb;display:grid;place-items:center;min-height:100vh;'
    paymentWindow.document.body.textContent = '正在打开支付页面...'
  } catch {
    // Some browsers disallow touching the blank page; location navigation still works.
  }
  return paymentWindow
}

export function redirectPaymentWindow(paymentWindow: Window | null, redirectUrl: string): boolean {
  if (!redirectUrl)
    return false
  try {
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.location.href = redirectUrl
      return true
    }
  } catch {
    // Fall through to a direct popup attempt below.
  }
  return Boolean(window.open(redirectUrl, '_blank', 'noopener,noreferrer'))
}

export function closePaymentWindow(paymentWindow: Window | null) {
  try {
    if (paymentWindow && !paymentWindow.closed)
      paymentWindow.close()
  } catch {
    // Nothing to clean up if the browser already detached the window.
  }
}

export type PayableChannel = 'wechat_pay' | 'alipay' | 'cardixon'

export type PaymentIntentLike = {
  checkout_id: string
  status?: string
  redirect_url?: string
  code_url?: string
  qr_svg?: string
}

const PAYABLE_CHANNEL_CODES = new Set<PayableChannel>(['wechat_pay', 'alipay', 'cardixon'])

export function isPayableChannelCode(code: string): code is PayableChannel {
  return PAYABLE_CHANNEL_CODES.has(code as PayableChannel)
}

export type PaymentChannelOption = {
  code: PayableChannel
  label: string
  kind: string
}

export function payableChannelsFromCapabilities(
  channels: Record<string, { label?: string; kind?: string }>,
): PaymentChannelOption[] {
  return Object.entries(channels)
    .filter(([code]) => isPayableChannelCode(code))
    .map(([code, meta]) => ({
      code: code as PayableChannel,
      label: String(meta?.label || code),
      kind: String(meta?.kind || ''),
    }))
}

export function preferredPayableChannel(
  channels: Record<string, { enabled?: boolean }>,
): PayableChannel {
  const configured = ['wechat_pay', 'alipay', 'cardixon'].find(code => channels[code]?.enabled)
  if (configured)
    return configured as PayableChannel
  const regionalFallback = ['cardixon', 'alipay', 'wechat_pay'].find(code => code in channels)
  return (regionalFallback || 'wechat_pay') as PayableChannel
}

export function isCheckoutPaid(intent: PaymentIntentLike): boolean {
  if (intent.status === 'paid')
    return true
  const hasRedirect = Boolean(intent.redirect_url?.trim())
  const hasQr = Boolean(intent.qr_svg?.trim() || intent.code_url?.trim())
  return !hasRedirect && !hasQr
}

export function rememberPendingCheckout(checkoutId: string) {
  sessionStorage.setItem('pending_checkout_id', checkoutId)
}
