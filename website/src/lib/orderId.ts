// =============================================================================
// Ficcado Order ID & Reference ID Helper — /src/lib/orderId.ts
// Re-exports functions from referenceId.ts for compatibility
// =============================================================================

export {
  isValidReferenceId,
  isValidAnyOrderId,
  isValidAnyOrderId as isValidOrderId,
  getNextReferenceId,
  formatReferenceId,
  parseReferenceId,
  generateOfflineReferenceId,
  REFERENCE_ID_REGEX,
  FINAL_ORDER_ID_REGEX,
} from './referenceId';

export function normalizeOrderId(input: string): string {
  return input.trim().toUpperCase();
}
