/**
 * 商户端部署环境识别（Vite 编译期注入）。
 *
 * - `VITE_DEPLOY_ENV` 由 `frontends/merchant-react/vite.config.ts` 注入，
 *   取值范围：`local` | `staging` | `prod`，未设置时回退 `local`。
 * - 仅 `local` 允许在登录注册页放出"手机号/邮箱切换"和"工作空间高级选项"等开发辅助；
 *   `staging` / `prod` 必须按 IP 区域严格走单一渠道。
 */
export type DeployEnv = 'local' | 'staging' | 'prod'

function resolveDeployEnv(): DeployEnv {
  const raw = (import.meta.env.VITE_DEPLOY_ENV || 'local').toString().trim().toLowerCase()
  if (raw === 'prod' || raw === 'production') return 'prod'
  if (raw === 'staging' || raw === 'preview') return 'staging'
  return 'local'
}

export const DEPLOY_ENV: DeployEnv = resolveDeployEnv()

export const IS_LOCAL_DEPLOY = DEPLOY_ENV === 'local'
export const IS_PROD_DEPLOY = DEPLOY_ENV === 'prod'
export const IS_STAGING_DEPLOY = DEPLOY_ENV === 'staging'
