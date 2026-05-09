/** 从宿主应用读取 Bearer / 会话 token（商户、平台租户 chat 等）。 */
export type ReadAccessToken = () => string | null
