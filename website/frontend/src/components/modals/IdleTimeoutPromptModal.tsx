'use client';

// =============================================================================
// IdleTimeoutPromptModal — 9-minute inactivity prompt (#idle-timeout-prompt-modal)
// Displays "Still there?" prompt with "Stay logged in" and "Log out" options.
// =============================================================================

import React from 'react';
import { Clock } from 'lucide-react';

interface IdleTimeoutPromptModalProps {
  isOpen: boolean;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function IdleTimeoutPromptModal({
  isOpen,
  onStayLoggedIn,
  onLogout,
}: IdleTimeoutPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="idle-timeout-prompt-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      className="fixed inset-0 flex items-center justify-center p-4 pointer-events-auto"
      style={{
        zIndex: 9999,
      }}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-in"
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[420px] rounded-2xl bg-[var(--bg-surface,#ffffff)] border border-[var(--border-light,#e5e7eb)] p-6 shadow-2xl animate-modal-in z-10 flex flex-col items-center text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-hover,#f3f4f6)] text-[var(--accent,#000000)] mb-4">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <h3
          id="idle-timeout-title"
          className="text-xl font-bold tracking-tight text-[var(--text-primary,#111827)] mb-2"
        >
          Still there?
        </h3>

        <p className="text-sm text-[var(--text-secondary,#6b7280)] leading-relaxed mb-6">
          You've been inactive for a while. For your security, you will be logged out in 1 minute.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            id="stay-logged-in-btn"
            type="button"
            onClick={onStayLoggedIn}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-[var(--accent,#000000)] text-[var(--accent-fg,#ffffff)] hover:opacity-90 transition-opacity"
          >
            Stay logged in
          </button>
          <button
            id="idle-logout-btn"
            type="button"
            onClick={onLogout}
            className="py-3 px-4 rounded-xl font-semibold text-sm border border-[var(--border-light,#e5e7eb)] text-[var(--text-primary,#111827)] hover:bg-[var(--bg-hover,#f3f4f6)] transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
