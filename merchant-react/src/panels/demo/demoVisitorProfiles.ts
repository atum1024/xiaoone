/**
 * seed_demo 后的默认访客 SDK（空库顺序一般为：平台官方 id=1，demo-mall id=2，acme-demo id=3）。
 * 本地 merchant_id / app 与 seed 不一致时，可用 Vite 环境变量覆盖。
 */
export type DemoVisitorProfileKey = 'demo-mall' | 'acme-demo'

export type DemoVisitorProfile = {
  key: DemoVisitorProfileKey
  label: string
  subtitle: string
  merchantId: number
  appId: string
  appSecret: string
}

function readEnv(name: string): string | undefined {
  const v = import.meta.env[name] as string | undefined
  return v !== undefined && String(v).trim() !== '' ? String(v).trim() : undefined
}

function envNum(name: string, fallback: number): number {
  const raw = readEnv(name)
  if (raw === undefined) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function envStr(name: string, fallback: string): string {
  return readEnv(name) ?? fallback
}

export const DEMO_VISITOR_PROFILES: DemoVisitorProfile[] = [
  {
    key: 'demo-mall',
    label: 'Xiaoone Demo',
    subtitle: 'demo-mall · 电商种子语料',
    merchantId: envNum('VITE_DEMO_VISITOR_MALL_MERCHANT_ID', 2),
    appId: envStr('VITE_DEMO_VISITOR_MALL_APP_ID', 'xiaoone-web-2'),
    appSecret: envStr('VITE_DEMO_VISITOR_MALL_APP_SECRET', 'xiaoone-web-secret-2'),
  },
  {
    key: 'acme-demo',
    label: 'FuseSim Demo',
    subtitle: 'acme-demo · FuseSim 种子语料',
    merchantId: envNum('VITE_DEMO_VISITOR_ACME_MERCHANT_ID', 3),
    appId: envStr('VITE_DEMO_VISITOR_ACME_APP_ID', 'xiaoone-web-3'),
    appSecret: envStr('VITE_DEMO_VISITOR_ACME_APP_SECRET', 'xiaoone-web-secret-3'),
  },
]
