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
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 text-zinc-100 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 id="cookie-settings-title" className="text-lg font-bold text-white">
                Privacy & Cookie Preferences
              </h2>
            </div>
            <button
              onClick={closeSettings}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            We use browser storage to provide our core shopping bag and checkout handoff. Choose which non-essential features you permit. Read our{' '}
            <Link href="/cookies" className="text-emerald-400 hover:underline">
              Cookie Policy
            </Link>{' '}
            for complete details.
          </p>

          <div className="space-y-3">
            {/* Category 1: Necessary */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Strictly Necessary</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    Always Active
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Required for shopping bag items, order continuation, and basic site security.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-1 h-4 w-4 rounded accent-emerald-500 cursor-not-allowed opacity-70"
                aria-label="Strictly Necessary Cookies (Always Active)"
              />
            </div>

            {/* Category 2: Preferences */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-white">Functional & Preferences</span>
                <p className="text-xs text-zinc-400">
                  Remembers recent search queries and saves draft checkout inputs to prevent data loss.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferencesEnabled}
                onChange={(e) => setPreferencesEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                aria-label="Functional & Preferences"
              />
            </div>

            {/* Category 3: Analytics */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Performance & Analytics</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                    Slot Ready (Inactive)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Reserved for privacy-first metrics. No third-party trackers are currently active.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                aria-label="Performance & Analytics"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
            <button
              onClick={() => saveCustomPreferences({ preferences: preferencesEnabled, analytics: analyticsEnabled })}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
            >
              Save Preferences
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white font-medium text-xs hover:bg-zinc-700 transition-colors border border-zinc-700 cursor-pointer"
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
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[150] p-4 sm:p-5 rounded-2xl bg-[#141414]/98 border border-zinc-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-zinc-100 backdrop-blur-md animate-fade-in"
      role="region"
      aria-label="Cookie consent banner"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Privacy & Storage Preferences</h3>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          We use local storage strictly to preserve your shopping bag and process orders securely via WhatsApp. You can choose whether to allow optional search history and form draft auto-saving.
        </p>

        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
          <Link href="/cookies" className="text-zinc-300 hover:text-emerald-400 underline">
            Cookie Policy
          </Link>
          <span>•</span>
          <Link href="/privacy" className="text-zinc-300 hover:text-emerald-400 underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <button
            onClick={openSettings}
            className="text-zinc-300 hover:text-emerald-400 inline-flex items-center gap-1 underline cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            Customize
          </button>
        </div>

        {/* Equal prominence Accept & Reject buttons per D5 */}
        <div className="pt-1 flex gap-2">
          <button
            onClick={acceptAll}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 active:scale-95 transition-all text-center cursor-pointer shadow-xs"
          >
            Accept All
          </button>
          <button
            onClick={rejectNonEssential}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs hover:bg-zinc-700 active:scale-95 transition-all text-center cursor-pointer border border-zinc-700/80 shadow-xs"
          >
            Reject Non-Essential
          </button>
        </div>
      </div>
    </div>
  );
}
