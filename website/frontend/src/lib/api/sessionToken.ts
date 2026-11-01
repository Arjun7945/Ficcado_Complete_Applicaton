// =============================================================================
// Customer Session Key & Token Manager — /src/lib/api/sessionToken.ts
// Ensures active customer session token is resiliently available throughout
// the whole frontend (in-memory + secure localStorage persistence + multi-tab sync).
// =============================================================================

const TOKEN_STORAGE_KEY = 'ficcado_customer_token';

let memoryToken: string | null = null;

/**
 * Retrieves the currently active customer session token.
 * Checks fast memory first, then hydrates from localStorage.
 */
export function getCustomerToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored && stored.trim()) {
        memoryToken = stored.trim();
        return memoryToken;
      }
    } catch {
      // Storage restricted or disabled (e.g. strict sandbox / incognito)
    }
  }
  return null;
}

/**
 * Stores or updates the active customer session token.
 * Updates both fast in-memory reference and localStorage.
 */
export function setCustomerToken(token: string | null | undefined): void {
  if (token && typeof token === 'string' && token.trim()) {
    const cleanToken = token.trim();
    memoryToken = cleanToken;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);
      } catch {
        // Ignored
      }
    }
  } else {
    clearCustomerToken();
  }
}

/**
 * Clears the customer session token upon logout or session invalidation.
 */
export function clearCustomerToken(): void {
  memoryToken = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignored
    }
  }
}
