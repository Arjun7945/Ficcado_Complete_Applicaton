'use client';

// =============================================================================
// ToastContainer — Global animated toast notification stack
// =============================================================================

import { X, CheckCircle2, AlertCircle, Info, type LucideProps } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { ToastType } from '@/types';

const TOAST_ICONS: Record<ToastType, React.ComponentType<LucideProps>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TOAST_COLORS: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'var(--bg-surface)',
    icon: 'var(--accent-green)',
    border: 'var(--accent-green)',
  },
  error: {
    bg: 'var(--bg-surface)',
    icon: 'var(--accent-red)',
    border: 'var(--accent-red)',
  },
  info: {
    bg: 'var(--primary-light)',
    icon: 'var(--primary)',
    border: 'var(--accent-ice)',
  },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none absolute left-0 right-0 top-14 z-[400] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const toastType: ToastType = toast.type in TOAST_ICONS ? toast.type : 'info';
        const Icon = TOAST_ICONS[toastType];
        const colors = TOAST_COLORS[toastType];

        return (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto animate-toast-in flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              boxShadow: 'var(--shadow-float)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <Icon size={18} strokeWidth={2} style={{ color: colors.icon, flexShrink: 0 }} />
            <p
              className="flex-1 text-sm font-semibold line-clamp-2"
              style={{ color: 'var(--text-main)' }}
            >
              {toast.message}
            </p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="btn-icon h-6 w-6 shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
