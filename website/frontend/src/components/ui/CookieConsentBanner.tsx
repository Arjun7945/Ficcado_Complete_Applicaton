'use client';

// =============================================================================
// Cookie & Storage Consent Banner — /src/components/ui/CookieConsentBanner.tsx
// Implements B-24 / D5 consent UI with equal prominence Reject, granular modal,
// and zero trackers loaded without consent.
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Settings, X } from 'lucide-react';
import { useConsent } from '@/context/ConsentContext';

export function CookieConsentBanner() {
  const {
    consent,
    hasDecided,
    isSettingsOpen,
    openSettings,
    closeSettings,
    acceptAll,
    rejectNonEssential,
    saveCustomPreferences,
  } = useConsent();

  const [preferencesEnabled, setPreferencesEnabled] = useState(
    consent?.preferences ?? false
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    consent?.analytics ?? false
  );

  // Synchronize internal toggle states when settings modal opens or consent changes
  useEffect(() => {
    if (isSettingsOpen) {
      setPreferencesEnabled(consent?.preferences ?? false);
      setAnalyticsEnabled(consent?.analytics ?? false);
    }
  }, [isSettingsOpen, consent]);

  // Handle escape key to dismiss settings modal
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  // If already decided and settings modal is not explicitly opened, do not show
  if (hasDecided && !isSettingsOpen) {
    return null;
  }

  // Granular settings modal
  if (isSettingsOpen) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 text-[var(--text-main)] shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[var(--accent-green)]" />
              <h2 id="cookie-settings-title" className="text-lg font-bold text-[var(--text-main)]">
                Privacy & Cookie Preferences
              </h2>
            </div>
            <button
              onClick={closeSettings}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            We use browser storage to provide our core shopping bag and checkout handoff. Choose which non-essential features you permit. Read our{' '}
            <Link href="/cookies" className="text-[var(--primary)] hover:underline">
              Cookie Policy
            </Link>{' '}
            for complete details.
          </p>

          <div className="space-y-3">
            {/* Category 1: Necessary */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-main)]">Strictly Necessary</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--accent-green)] border border-[var(--border-light)]">
                    Always Active
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Required for shopping bag items, order continuation, and basic site security.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-1 h-4 w-4 rounded accent-[var(--primary)] cursor-not-allowed opacity-70"
                aria-label="Strictly Necessary Cookies (Always Active)"
              />
            </div>

            {/* Category 2: Preferences */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-[var(--text-main)]">Functional & Preferences</span>
                <p className="text-xs text-[var(--text-muted)]">
                  Remembers recent search queries and saves draft checkout inputs to prevent data loss.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencesEnabled}
                onChange={(e) => setPreferencesEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
                aria-label="Functional & Preferences"
              />
            </div>

            {/* Category 3: Analytics */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-main)]">Performance & Analytics</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-light)]">
                    Slot Ready (Inactive)
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Reserved for privacy-first metrics. No third-party trackers are currently active.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
                aria-label="Performance & Analytics"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
            <button
              onClick={() => saveCustomPreferences({ preferences: preferencesEnabled, analytics: analyticsEnabled })}
              className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Save Preferences
            </button>
            <button
              onClick={acceptAll}
              className="btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating banner on bottom of screen, positioned above Mobile BottomNav on mobile
  return (
    <div
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[150] p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-2xl text-[var(--text-main)] backdrop-blur-md animate-fade-in"
      role="region"
      aria-label="Cookie consent banner"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-green)]" />
          <h3 className="text-sm font-bold text-[var(--text-main)]">Privacy & Storage Preferences</h3>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          We use local storage strictly to preserve your shopping bag and process orders securely via WhatsApp. You can choose whether to allow optional search history and form draft auto-saving.
        </p>

        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
          <Link href="/cookies" className="text-[var(--primary)] hover:underline">
            Cookie Policy
          </Link>
          <span>•</span>
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <button
            onClick={openSettings}
            className="text-[var(--primary)] inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            Customize
          </button>
        </div>

        {/* Equal prominence Accept & Reject buttons per D5 */}
        <div className="pt-1 flex gap-2">
          <button
            onClick={acceptAll}
            className="btn-primary flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-center cursor-pointer"
          >
            Accept All
          </button>
          <button
            onClick={rejectNonEssential}
            className="btn-secondary flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-center cursor-pointer"
          >
            Reject Non-Essential
          </button>
        </div>
      </div>
    </div>
  );
}
