/** Volcengine Ark Seedream: reference images + generated images must not exceed 15. */
export const ARK_IMAGE_TOTAL_BUDGET = 15

/** Seedream 5.0 / 4.5 / 4.0 supports up to 14 reference images per request. */
export const ARK_IMAGE_MAX_REFERENCE = 14

export const ARK_IMAGE_MAX_OUTPUT = ARK_IMAGE_TOTAL_BUDGET

export function maxOutputCountForReferences(referenceCount: number): number {
  const refs = Math.max(0, Math.round(referenceCount))
  return Math.max(1, Math.min(ARK_IMAGE_MAX_OUTPUT, ARK_IMAGE_TOTAL_BUDGET - refs))
}

export function maxReferenceCountForOutput(outputCount: number): number {
  const output = Math.max(1, Math.round(outputCount))
  return Math.max(0, Math.min(ARK_IMAGE_MAX_REFERENCE, ARK_IMAGE_TOTAL_BUDGET - output))
}

export function isWithinArkImageBudget(referenceCount: number, outputCount: number): boolean {
  const refs = Math.max(0, Math.round(referenceCount))
  const output = Math.max(0, Math.round(outputCount))
  return refs <= ARK_IMAGE_MAX_REFERENCE && refs + output <= ARK_IMAGE_TOTAL_BUDGET
}
