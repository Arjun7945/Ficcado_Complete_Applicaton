import crypto from 'node:crypto';

/**
 * Ficcado Sequential Reference ID Generator & Validator
 * Format: FIC-<LETTERS><4-DIGIT-NUM> (e.g. FIC-A0001 ... FIC-A9999 -> FIC-B0001 ... FIC-Z9999 -> FIC-AA0001)
 * Offline Fallback Format: FIC-T<6-ALPHANUMERIC> (e.g. FIC-T8X4M2)
 */

export const DEFAULT_LIMIT = 9999;

export const REFERENCE_ID_REGEX = /^FIC-([A-Z]{1,3})(\d{4})$/;
export const OFFLINE_REFERENCE_ID_REGEX = /^FIC-T([A-Z0-9]{6})$/;

// Lenient pattern for final team-issued order IDs (3-30 chars, alphanumeric + hyphens)
export const FINAL_ORDER_ID_REGEX = /^[A-Z0-9][A-Z0-9-]{3,29}$/i;

/**
 * Increment spreadsheet-style column letters (A -> B ... Z -> AA -> AB).
 */
export function getNextLetterSequence(letters: string): string {
  const upper = letters.toUpperCase();
  const chars = upper.split('');
  let carry = true;

  for (let i = chars.length - 1; i >= 0; i--) {
    if (carry) {
      if (chars[i] === 'Z') {
        chars[i] = 'A';
        carry = true;
      } else {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        carry = false;
      }
    }
  }

  if (carry) {
    return 'A' + chars.join('');
  }
  return chars.join('');
}

/**
 * Validates whether an ID matches the sequential Reference ID format.
 */
export function isValidReferenceId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim().toUpperCase();
  return REFERENCE_ID_REGEX.test(trimmed) || OFFLINE_REFERENCE_ID_REGEX.test(trimmed);
}

/**
 * Validates whether an ID is either a temporary Reference ID or a final Order ID.
 */
export function isValidAnyOrderId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim().toUpperCase();
  return isValidReferenceId(trimmed) || FINAL_ORDER_ID_REGEX.test(trimmed);
}

/**
 * Parses a sequential Reference ID into its letter prefix and numeric value.
 */
export function parseReferenceId(id: string): { valid: boolean; prefix: string; num: number } {
  const match = id?.trim().toUpperCase().match(REFERENCE_ID_REGEX);
  if (!match) {
    return { valid: false, prefix: '', num: 0 };
  }
  return {
    valid: true,
    prefix: match[1],
    num: parseInt(match[2], 10),
  };
}

/**
 * Formats a prefix and number into a standard Reference ID.
 */
export function formatReferenceId(prefix: string, num: number): string {
  const padded = String(num).padStart(4, '0');
  return `FIC-${prefix.toUpperCase()}${padded}`;
}

/**
 * Computes the next sequential Reference ID given the previous one.
 */
export function getNextReferenceId(lastId?: string | null, limit: number = DEFAULT_LIMIT): string {
  if (!lastId || !lastId.trim()) {
    return 'FIC-A0001';
  }

  const parsed = parseReferenceId(lastId);
  if (!parsed.valid) {
    return 'FIC-A0001';
  }

  if (parsed.num < limit) {
    return formatReferenceId(parsed.prefix, parsed.num + 1);
  }

  // Roll over to the next letter series at 1
  const nextPrefix = getNextLetterSequence(parsed.prefix);
  return formatReferenceId(nextPrefix, 1);
}

export function normalizeOrderId(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Generates an offline reference ID when Google Sheets is temporarily unreachable.
 * Uses cryptographically secure random bytes per CODE-02.
 */
export function generateOfflineReferenceId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous characters 0, 1, I, O
  const bytes = crypto.randomBytes(6);
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(bytes[i] % chars.length);
  }
  return `FIC-T${rand}`;
}
