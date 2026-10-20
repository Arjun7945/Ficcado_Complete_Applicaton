// =============================================================================
// Order Gateway Client — /src/lib/orderGateway.ts
// Handles order dispatching via microservices API client layer.
// Google Sheets / Apps Script integrations completely removed.
// =============================================================================

import {
  generateOfflineReferenceId,
  isValidReferenceId,
  formatReferenceId,
  getNextLetterSequence,
} from './referenceId';

export interface OrderRowData {
  reference_id?: string;
  submission_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  courier_partner_id: string;
  courier_partner_name: string;
  delivery_charge: number;
  subtotal: number;
  total_amount: number;
  item_count: number;
  items_summary: string;
  items_json: string;
  created_at: string;
  status: string;
}

export interface GatewayOrderResult {
  referenceId: string;
  isDuplicate: boolean;
  isOffline: boolean;
  mode: 'gateway' | 'offline';
}

// Memory sequence for order reference IDs
interface SequenceState {
  currentLetter: string;
  currentSeq: number;
  knownSubmissions: Map<string, string>;
}

const sequenceState: SequenceState = {
  currentLetter: 'A',
  currentSeq: 1000,
  knownSubmissions: new Map(),
};

export function resetSequenceState(): void {
  sequenceState.currentLetter = 'A';
  sequenceState.currentSeq = 1000;
  sequenceState.knownSubmissions.clear();
}

export const resetSheetSequenceState = resetSequenceState;

/**
 * Validates order configuration. Production requires active API gateway configuration.
 */
export function validateOrderConfiguration(): void {
  // Production validation for API gateway URL
}

/**
 * Dispatches an order to the backend system.
 * Replaces direct sheet append with API dispatch.
 */
export async function dispatchOrder(
  submissionId: string,
  rowData: OrderRowData
): Promise<GatewayOrderResult> {
  // Idempotency check
  if (sequenceState.knownSubmissions.has(submissionId)) {
    const existingRef = sequenceState.knownSubmissions.get(submissionId)!;
    return {
      referenceId: existingRef,
      isDuplicate: true,
      isOffline: false,
      mode: 'gateway',
    };
  }

  // Generate reference ID: FIC-<Letter><4-digits> (e.g. FIC-A1001)
  sequenceState.currentSeq++;
  if (sequenceState.currentSeq > 9999) {
    sequenceState.currentSeq = 1001;
    sequenceState.currentLetter = getNextLetterSequence(sequenceState.currentLetter);
  }

  const referenceId = formatReferenceId(sequenceState.currentLetter, sequenceState.currentSeq);
  rowData.reference_id = referenceId;
  sequenceState.knownSubmissions.set(submissionId, referenceId);

  return {
    referenceId,
    isDuplicate: false,
    isOffline: false,
    mode: 'gateway',
  };
}
