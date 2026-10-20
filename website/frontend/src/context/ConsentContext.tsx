'use client';

// =============================================================================
// Consent Context & Cookie State Manager — /src/context/ConsentContext.tsx
// Implements B-24 / D5 consent management: 12-month expiry, equal prominence reject,
// categories (Necessary, Preferences, Analytics slot), and storage minimization.
// =============================================================================

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';

export interface ConsentPreferences {
  necessary: true; // Always true
  preferences: boolean;
  analytics: boolean;
  timestamp: number;
  expiresAt: number;
}

interface ConsentContextType {
  consent: ConsentPreferences | null;
  hasDecided: boolean;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  saveCustomPreferences: (prefs: { preferences: boolean; analytics: boolean }) => void;
}

const STORAGE_KEY = 'ficcado-consent';
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('ficcado-consent-changed', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('ficcado-consent-changed', callback);
  };
}

function getSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return '__SSR__';
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const rawStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let consent: ConsentPreferences | null = null;
  let hasDecided = true; // During SSR, default true to avoid banner flicker

  if (rawStorage && rawStorage !== '__SSR__') {
    try {
      consent = JSON.parse(rawStorage) as ConsentPreferences;
      hasDecided = true;
    } catch {
      hasDecided = false;
    }
  } else if (rawStorage === null) {
    // Client mounted and no valid consent in storage
    hasDecided = false;
  }

  const persistConsent = (prefs: { preferences: boolean; analytics: boolean }) => {
    const now = Date.now();
    const newConsent: ConsentPreferences = {
      necessary: true,
      preferences: prefs.preferences,
      analytics: prefs.analytics,
      timestamp: now,
      expiresAt: now + TWELVE_MONTHS_MS,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConsent));

      // Storage minimization: purge optional drafts if preferences are rejected or withdrawn
      if (!prefs.preferences) {
        localStorage.removeItem('ficcado-checkout-form-draft');
        localStorage.removeItem('ficcado-checkout-draft');
        localStorage.removeItem('ficcado-recent-searches');
      }

      window.dispatchEvent(new Event('ficcado-consent-changed'));
    } catch {}

    setIsSettingsOpen(false);
  };

  const acceptAll = () => {
    persistConsent({ preferences: true, analytics: true });
  };

  const rejectNonEssential = () => {
    persistConsent({ preferences: false, analytics: false });
  };

  const saveCustomPreferences = (prefs: { preferences: boolean; analytics: boolean }) => {
    persistConsent(prefs);
  };

  return (
    <ConsentContext.Provider
      value={{
        consent,
        hasDecided,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        acceptAll,
        rejectNonEssential,
        saveCustomPreferences,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return ctx;
}
