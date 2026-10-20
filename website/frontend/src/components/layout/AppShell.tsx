'use client';

// =============================================================================
// AppShell — Root Application Container (Production Responsive Shell)
// Automatically adapts layout for Mobile (<768px), Tablet (768-1023px), and Desktop (>=1024px)
// =============================================================================

import React, { Suspense } from 'react';

// Layout components
import { BottomNav } from './BottomNav';
import { ToastContainer } from './ToastContainer';
import { DesktopHeader } from './DesktopHeader';
import { DesktopFooter } from './DesktopFooter';
import { RouteTitleSync } from './RouteTitleSync';
import { SplashScreen } from '@/components/ui/SplashScreen';

// Modals
import { ProductModal } from '@/components/modals/ProductModal';
import { CartDrawer } from '@/components/modals/CartDrawer';
import { FilterModal } from '@/components/modals/FilterModal';
import { AboutModal } from '@/components/modals/AboutModal';
import { MobileNavDrawer } from '@/components/modals/MobileNavDrawer';

// ---------------------------------------------------------------------------
// ModalLayer — transparent container for modal sheets & dialogs
// ---------------------------------------------------------------------------
function ModalLayer() {
  return (
    <div
      id="modal-layer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Toasts sit above modals */}
      <ToastContainer />

      {/* ── Product & Commerce ─────────────────────────── */}
      <ProductModal />
      <CartDrawer />
      <Suspense fallback={null}>
        <FilterModal />
      </Suspense>

      {/* ── Informational & Navigation ─────────────────── */}
      <AboutModal />
      <MobileNavDrawer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------
interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      id="app-shell-standard"
      suppressHydrationWarning
      className="relative w-full min-h-screen flex flex-col bg-[var(--bg-app)]"
    >
      {/* Brand Opening / Loading Presentation */}
      <SplashScreen />

      {/* Route & Section Tab Title Synchronizer */}
      <RouteTitleSync />

      {/* Dedicated Desktop & Tablet Navigation Header */}
      <DesktopHeader />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-0 md:px-6 lg:px-8 py-0 md:py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav isFixed={true} />

      {/* Dedicated Desktop & Tablet Footer */}
      <DesktopFooter />

      {/* Modal layer */}
      <ModalLayer />
    </div>
  );
}

export default AppShell;
