/**
 * Legacy Vue team-chat runtimes were used by the previous merchant shell.
 * The React merchant now owns team chat through `src/store/teamChat.ts` and
 * `src/pages/TeamChatPage.tsx`; keep these exported names as compatibility
 * sentinels so stale imports fail loudly at runtime instead of pulling Vue.
 */
export function buildMerchantRuntime(): never {
  throw new Error('buildMerchantRuntime is not available in merchant-react')
}

export function buildPlatformRuntime(): never {
  throw new Error('buildPlatformRuntime is not available in merchant-react')
}
