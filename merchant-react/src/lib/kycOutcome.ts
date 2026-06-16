export const KYC_OUTCOME_MESSAGE_KEYS: Record<string, string> = {
  mismatch: 'account.security.kycMismatch',
  invalid_input: 'account.security.kycInvalidInput',
  not_found: 'account.security.kycNotFound',
  retryable: 'account.security.kycRetryable',
  rate_limited: 'account.security.kycRateLimited',
  provider_error: 'account.security.kycProviderError',
  failed: 'account.security.kycRejected',
}

export function kycOutcomeMessage(
  outcome: string | undefined,
  fallback: string | undefined,
  translate: (key: string) => string,
): string {
  if (outcome && KYC_OUTCOME_MESSAGE_KEYS[outcome])
    return translate(KYC_OUTCOME_MESSAGE_KEYS[outcome])
  return fallback || translate('account.security.kycRejected')
}
