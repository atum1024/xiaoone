import { api } from './httpClient'

interface CaptchaConfig {
  enabled: boolean
  configured: boolean
  captcha_app_id?: string | number
}

interface TencentCaptchaResult {
  ret: number
  ticket?: string
  randstr?: string
  errorCode?: number
  errorMessage?: string
}

interface TencentCaptchaInstance {
  show: () => void
}

declare global {
  interface Window {
    TencentCaptcha?: new (
      appId: string,
      callback: (result: TencentCaptchaResult) => void,
      options?: Record<string, unknown>,
    ) => TencentCaptchaInstance
  }
}

let configPromise: Promise<CaptchaConfig> | null = null
let scriptPromise: Promise<void> | null = null

async function getCaptchaConfig(): Promise<CaptchaConfig> {
  if (!configPromise) {
    configPromise = api.get('/api/v1/iam/public/captcha/config/')
      .then(r => r.data?.data || r.data)
      .catch(() => ({ enabled: false, configured: false }))
  }
  return configPromise
}

function loadTencentCaptchaScript(): Promise<void> {
  if (window.TencentCaptcha) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('tencent-captcha-js') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('图片验证码加载失败')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'tencent-captcha-js'
    script.async = true
    script.src = 'https://turing.captcha.qcloud.com/TJCaptcha.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('图片验证码加载失败'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function runTencentCaptcha(): Promise<Record<string, string>> {
  const config = await getCaptchaConfig()
  if (!config.enabled) return {}
  const appId = String(config.captcha_app_id || '').trim()
  if (!config.configured || !appId) throw new Error('图片验证码未配置')

  await loadTencentCaptchaScript()
  const CaptchaCtor = window.TencentCaptcha
  if (!CaptchaCtor) throw new Error('图片验证码加载失败')

  return new Promise((resolve, reject) => {
    const captcha = new CaptchaCtor(appId, (result) => {
      if (result.ret === 0 && result.ticket && result.randstr) {
        resolve({
          captcha_ticket: result.ticket,
          captcha_randstr: result.randstr,
        })
        return
      }
      reject(new Error(result.errorMessage || '未完成图片验证码'))
    })
    captcha.show()
  })
}
