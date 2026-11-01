/**
 * Normalizes Indian mobile phone numbers to the canonical 10-digit national format (^[6-9]\d{9}$).
 *
 * Rules:
 * 1. Remove spaces, hyphens, dots, and parentheses.
 * 2. If it starts with '+91' and has 13 characters, or starts with '91' and has 12 digits, remove the prefix.
 * 3. If it starts with '0' and has 11 digits, remove the leading '0'.
 * 4. Canonical format is the 10-digit national number.
 */

const CLEAN_REGEX = /[\s\-\.\(\)]/g;
const DIGITS_ONLY_REGEX = /^\d+$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(CLEAN_REGEX, '');

  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12 && DIGITS_ONLY_REGEX.test(cleaned)) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11 && DIGITS_ONLY_REGEX.test(cleaned)) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

export function isValidIndianPhone(raw: string | null | undefined): boolean {
  const normalized = normalizePhone(raw);
  return INDIAN_PHONE_REGEX.test(normalized);
}
