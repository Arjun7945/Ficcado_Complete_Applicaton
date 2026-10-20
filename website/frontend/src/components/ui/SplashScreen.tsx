'use client';

// =============================================================================
// SplashScreen — /src/components/ui/SplashScreen.tsx
// Refactored per Requirement 3:
// - Zero 2-second fixed delays or redirects.
// - Shows ONLY on first visit and ONLY when connection/load is genuinely slow
//   (600ms grace threshold). Fast loads never render the splash.
// - Returning visitors never see the splash.
// - Failsafe timeout ensures user is never blocked.
// - Respects prefers-reduced-motion and accessible status aria.
// =============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';

const FIRST_VISIT_KEY = 'ficcado_first_visit_seen';
const GRACE_THRESHOLD_MS = 600; // 600ms grace window before rendering splash
const MIN_VISIBLE_MS = 350; // Prevent visual flickering if load finishes right after grace threshold
const HARD_TIMEOUT_FAILSAFE_MS = 4000; // Hard timeout failsafe

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const shownTimestampRef = useRef<number | null>(null);
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const markFirstVisitCompleted = useCallback(() => {
    try {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      sessionStorage.setItem('ficcado_brand_intro_seen', '1');
    } catch {
      // Ignore private browsing storage restrictions
    }
  }, []);

  const handleDismiss = useCallback(() => {
    if (isDismissed) return;
    setIsExiting(true);
    markFirstVisitCompleted();

    const exitDuration = prefersReducedMotion ? 100 : 500;
    setTimeout(() => {
      setIsDismissed(true);
      setShouldShow(false);
    }, exitDuration);
  }, [isDismissed, markFirstVisitCompleted, prefersReducedMotion]);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // Check reduced motion preference
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    } catch {}

    const search = window.location.search || '';
    const isForced = search.includes('intro=1') || search.includes('splash=1');

    let hasVisitedBefore = false;
    try {
      hasVisitedBefore =
        localStorage.getItem(FIRST_VISIT_KEY) === '1' ||
        sessionStorage.getItem('ficcado_brand_intro_seen') === '1';
    } catch {
      hasVisitedBefore = false;
    }

    // Returning visitors never see the splash unless explicitly requested via ?splash=1
    if (hasVisitedBefore && !isForced) {
      setIsDismissed(true);
      return;
    }

    // Check if the page is already fully ready
    const isDocReady = document.readyState === 'complete';

    // Start 600ms grace threshold
    graceTimerRef.current = setTimeout(() => {
      // If still not dismissed, app is genuinely delayed/slow to load -> Show splash
      shownTimestampRef.current = Date.now();
      setShouldShow(true);

      // Hard timeout failsafe to guarantee the user is never trapped
      failsafeTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, HARD_TIMEOUT_FAILSAFE_MS);
    }, GRACE_THRESHOLD_MS);

    // Handler when window load completes
    const onWindowReady = () => {
      if (!shownTimestampRef.current) {
        // App became ready BEFORE 600ms grace threshold -> Splash NEVER renders
        if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
        markFirstVisitCompleted();
        setIsDismissed(true);
      } else {
        // Splash was already shown -> calculate remaining time for minimum visible window
        const elapsed = Date.now() - shownTimestampRef.current;
        const remainingWait = Math.max(0, MIN_VISIBLE_MS - elapsed);
        setTimeout(() => {
          handleDismiss();
        }, remainingWait);
      }
    };

    if (isDocReady) {
      // If already complete during mount (fast local or cached assets)
      onWindowReady();
    } else {
      window.addEventListener('load', onWindowReady, { once: true });
    }

    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
      window.removeEventListener('load', onWindowReady);
    };
  }, [handleDismiss, markFirstVisitCompleted]);

  // Handle escape / enter key to dismiss immediately
  useEffect(() => {
    if (!shouldShow || isDismissed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shouldShow, isDismissed, handleDismiss]);

  if (!mounted || !shouldShow || isDismissed) return null;

  return (
    <aside
      id="splash-screen"
      role="status"
      aria-live="polite"
      aria-busy={!isExiting}
      aria-label="Loading Ficcado Clothing"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none transition-all ${
        prefersReducedMotion ? 'duration-150' : 'duration-500'
      } ease-out ${
        isExiting ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: '#040711',
        backgroundImage:
          'radial-gradient(circle at 50% 45%, rgba(0, 102, 204, 0.28) 0%, rgba(172, 213, 243, 0.08) 45%, rgba(4, 7, 17, 0.95) 80%, #040711 100%)',
      }}
    >
      {/* Background Ambient Glow (Disabled if reduced motion is preferred) */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div
            className="w-[520px] h-[520px] rounded-full opacity-20 blur-3xl animate-pulse"
            style={{
              background: 'radial-gradient(circle, #0066CC 0%, rgba(172, 213, 243, 0.3) 50%, transparent 75%)',
              animationDuration: '3s',
            }}
          />
        </div>
      )}

      {/* Top Bar with Skip option */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleDismiss}
          className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider text-[#ACD5F3]/80 hover:text-white bg-white/5 hover:bg-white/15 backdrop-blur-md border border-[#ACD5F3]/20 transition-all cursor-pointer active:scale-95"
          aria-label="Skip loading screen"
        >
          Skip &rarr;
        </button>
      </div>

      {/* Main Centered Brand Showcase */}
      <div className="flex flex-col items-center text-center px-6 max-w-md w-full relative z-10 animate-fade-in">
        {/* Glowing Logo Emblem Container */}
        <div className="relative mb-8">
          {!prefersReducedMotion && (
            <div
              className="absolute -inset-4 rounded-full blur-2xl opacity-70 animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(0, 102, 204, 0.85) 0%, rgba(172, 213, 243, 0.4) 50%, transparent 75%)',
                animationDuration: '2.5s',
              }}
            />
          )}

          {/* Frosted Emblem Badge */}
          <div
            className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full p-2.5 bg-gradient-to-b from-white/20 via-white/10 to-white/5 border border-[#ACD5F3]/40 shadow-2xl backdrop-blur-xl flex items-center justify-center overflow-hidden"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 102, 204, 0.55), inset 0 0 15px rgba(172, 213, 243, 0.25)',
            }}
          >
            <Image
              src="/images/brand_logo/favicon-rounded.png"
              alt="Ficcado Clothing Emblem"
              width={112}
              height={112}
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
        </div>

        {/* Brand Primary Name */}
        <h1
          className="text-4xl sm:text-5xl font-900 tracking-[0.28em] uppercase mb-3 text-white"
          style={{
            fontWeight: 900,
            textShadow: '0 0 30px rgba(0, 102, 204, 0.7), 0 0 60px rgba(172, 213, 243, 0.35)',
            letterSpacing: '0.28em',
          }}
        >
          FICCADO
        </h1>

        {/* Legal Entity Badge */}
        <div
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border shadow-lg backdrop-blur-md mb-3.5"
          style={{
            background: 'rgba(0, 102, 204, 0.18)',
            borderColor: 'rgba(172, 213, 243, 0.35)',
            boxShadow: '0 4px 20px rgba(0, 102, 204, 0.25)',
          }}
        >
          <span
            className={`w-2 h-2 rounded-full ${prefersReducedMotion ? '' : 'animate-ping'}`}
            style={{ background: '#ACD5F3' }}
          />
          <span className="text-xs sm:text-sm font-bold tracking-widest text-white uppercase">
            Ficcado Clothing
          </span>
          <span className="text-[#ACD5F3]/60">•</span>
          <span className="text-[11px] font-semibold text-[#ACD5F3]/90 tracking-wider">
            Est. 2024
          </span>
        </div>

        {/* Tagline */}
        <p
          className="text-sm sm:text-base font-semibold tracking-wide mb-8"
          style={{
            color: '#ACD5F3',
            textShadow: '0 2px 10px rgba(0, 102, 204, 0.4)',
          }}
        >
          High Quality Unisex Wears
        </p>

        {/* Subtle Loading Pulse Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#ACD5F3]/80">
          <span className="w-2 h-2 rounded-full bg-[#0066CC] animate-pulse" />
          <span className="tracking-widest uppercase">Connecting to Storefront...</span>
        </div>
      </div>
    </aside>
  );
}

export default SplashScreen;
