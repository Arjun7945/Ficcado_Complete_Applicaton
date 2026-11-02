// =============================================================================
// Customer Session Key & Token Manager — /src/lib/api/sessionToken.ts
// Ensures active customer session token & profile are resiliently available
// throughout the entire frontend (in-memory + secure localStorage persistence +
// multi-tab event sync + strict user isolation).
// =============================================================================

import type { CustomerProfile } from './auth';

export type CachedCustomerProfile = CustomerProfile;

const TOKEN_STORAGE_KEY = 'ficcado_customer_token';
const PROFILE_STORAGE_KEY = 'ficcado_customer_profile';
const SESSION_USER_ID_KEY = 'ficcado_customer_user_id';

let memoryToken: string | null = null;
let memoryProfile: CachedCustomerProfile | null = null;

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
        window.dispatchEvent(
          new CustomEvent('ficcado-session-change', { detail: { type: 'TOKEN_SET', token: cleanToken } })
        );
      } catch {
        // Ignored
      }
    }
  } else {
    clearCustomerToken();
  }
}

/**
 * Retrieves the cached customer profile for instant synchronous pre-hydration.
 * Prevents unauthorized flashes or false logout screens on direct route navigations (e.g. /checkout).
 */
export function getCachedCustomer(): CachedCustomerProfile | null {
  if (memoryProfile) {
    return memoryProfile;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored && stored.trim()) {
        const parsed = JSON.parse(stored) as CachedCustomerProfile;
        if (parsed && typeof parsed === 'object' && typeof parsed.id === 'number') {
          memoryProfile = parsed;
          return memoryProfile;
        }
      }
    } catch {
      // JSON parse error or storage restricted
    }
  }
  return null;
}

/**
 * Stores or updates the cached customer profile in memory and localStorage.
 * Enforces strict user isolation: if switching users, immediately purges old user cache.
 */
export function setCachedCustomer(profile: CachedCustomerProfile | null | undefined): void {
  if (profile && typeof profile === 'object' && typeof profile.id === 'number') {
    if (typeof window !== 'undefined') {
      try {
        const previousUserId = window.localStorage.getItem(SESSION_USER_ID_KEY);
        if (previousUserId && previousUserId !== String(profile.id)) {
          // New user logging in: purge old user artifacts to prevent cross-account contamination
          purgeUserSpecificCache();
        }
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        window.localStorage.setItem(SESSION_USER_ID_KEY, String(profile.id));
      } catch {
        // Ignored
      }
    }
    memoryProfile = profile;
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('ficcado-session-change', { detail: { type: 'PROFILE_SET', profile } })
        );
      } catch {
        // Ignored
      }
    }
  } else {
    memoryProfile = null;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent('ficcado-session-change', { detail: { type: 'PROFILE_CLEARED' } })
        );
      } catch {
        // Ignored
      }
    }
  }
}

/**
 * Purges customer-specific client data when switching accounts to ensure zero data leakage.
 */
function purgeUserSpecificCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem('ficcado-last-order');
    window.sessionStorage.removeItem('ficcado-last-confirmed-order');
    window.sessionStorage.removeItem('pendingWishlistItem');
  } catch {
    // Ignored
  }
}

/**
 * Clears the customer session token and cached profile upon logout or session invalidation.
 */
export function clearCustomerSession(): void {
  memoryToken = null;
  memoryProfile = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_USER_ID_KEY);
      purgeUserSpecificCache();
      window.dispatchEvent(
        new CustomEvent('ficcado-session-change', { detail: { type: 'LOGOUT' } })
      );
    } catch {
      // Ignored
    }
  }
}

/**
 * Backward compatibility alias for clearCustomerSession.
 */
export function clearCustomerToken(): void {
  clearCustomerSession();
}
