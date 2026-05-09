/**
 * 将 Axios / fetch 类错误整理为用户可读文案；后端逐步透出 code 时可在此集中映射。
 */

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiErrorLike {
  response?: {
    data?: {
      message?: string
      detail?: string
      code?: string
      error_code?: string
      error?: string
    }
    status?: number
  }
  message?: string
}

/** 统一错误文案：优先服务端 message，附带业务 code（若有）。 */
export function describeAxiosError(error: unknown, fallback = '请求失败'): string {
  const e = error as ApiErrorLike
  const data = e?.response?.data
  const msg = (data?.message || data?.detail || e?.message || '').trim()
  const code = (data?.code || data?.error_code || data?.error || '').trim()
  if (msg && code)
    return `${msg}（${code}）`
  if (msg)
    return msg
  return fallback
}

/** 预留：Handshake / SDK 校验错误码 → 中文说明（CODEX：区分 Secret、Origin、服务不可用）。 */
export function describeSdkVerifyCode(code: string | undefined): string | undefined {
  if (!code)
    return undefined
  const map: Record<string, string> = {
    invalid_secret: 'App Secret 不正确',
    invalid_origin: '当前页面 Origin 未在白名单',
    kefu_unreachable: '客服元数据服务暂时不可用',
  }
  return map[code]
}
