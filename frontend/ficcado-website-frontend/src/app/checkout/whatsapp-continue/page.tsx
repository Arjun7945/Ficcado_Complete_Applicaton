'use client';

// =============================================================================
// WhatsApp Order Continuation Screen — /checkout/whatsapp-continue
// Refactored per REFACTOR_ON_PREVIOUS_UPDATE.md:
// - Shows customer's temporary Reference ID
// - Displays clear label "Reference ID (temporary)" with operational notice
// - Provides 'Open WhatsApp again' and 'Copy order text' buttons
// - Anti-tampering advisory: "Please send the message as it is. Changing it can delay your order."
// =============================================================================

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Copy,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { copyToClipboard } from '@/lib/clipboard';

interface SavedOrderInfo {
  referenceId: string;
  whatsappUrl: string;
  message?: string;
  total: number;
  subtotal?: number;
  deliveryCharge?: number;
  isOffline?: boolean;
}

const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

function getSnapshot(): string | null {
  try {
    return sessionStorage.getItem('ficcado-last-order');
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export default function WhatsAppContinuePage() {
  const { showToast } = useToast();

  const rawOrder = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const orderInfo = useMemo<SavedOrderInfo | null>(() => {
    if (!rawOrder) return null;
    try {
      return JSON.parse(rawOrder) as SavedOrderInfo;
    } catch {
      return null;
    }
  }, [rawOrder]);

  const [copied, setCopied] = useState(false);

  function handleOpenWhatsAppAgain() {
    if (orderInfo?.whatsappUrl) {
      window.location.assign(orderInfo.whatsappUrl);
    }
  }

  async function handleCopyDetails() {
    if (orderInfo?.whatsappUrl) {
      try {
        const url = new URL(orderInfo.whatsappUrl);
        const text = url.searchParams.get('text') || '';
        if (text) {
          const success = await copyToClipboard(text);
          if (success) {
            setCopied(true);
            showToast('Order details copied to clipboard! 📋', 'success');
            setTimeout(() => setCopied(false), 3000);
            return;
          }
        }
      } catch {
        // Fallback
      }
    }
    showToast('Could not copy order text', 'error');
  }

  const referenceId = orderInfo?.referenceId || 'FIC-A0001';

  return (
    <div className="min-h-full py-10 px-4 md:px-8 max-w-3xl mx-auto animate-fade-in space-y-6">
      {/* Celebration card */}
      <div suppressHydrationWarning className="card p-8 md:p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-lg space-y-6">
        {/* WhatsApp Icon */}
        <div
          className="w-18 h-18 rounded-full flex items-center justify-center mx-auto text-white shadow-md animate-bounce-in"
          style={{ background: '#25D366' }}
        >
          <MessageCircle size={38} />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-800 uppercase tracking-widest text-[#128C7E] bg-[#E8F8F5] border border-[#25D366]/30">
            WhatsApp Order Handoff
          </span>
          <h1 className="text-2xl sm:text-3xl font-900 text-[var(--text-main)] tracking-tight">
            Continue Your Order on WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
            WhatsApp should have opened with your order pre-filled. Simply tap <strong>Send</strong> in WhatsApp to connect directly with the Ficcado team.
          </p>
        </div>

        {/* Reference ID (Temporary) Box */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] max-w-md mx-auto text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Reference ID (temporary)
          </p>
          <p suppressHydrationWarning className="text-2xl font-900 font-mono text-[var(--primary)] tracking-wider">
            {referenceId}
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            This is a temporary reference. Once your order is confirmed, the Ficcado team will share your real Order ID.
          </p>
          {orderInfo?.isOffline && (
            <div className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Note: System running in offline verification mode; our team will verify your items directly in chat.
            </div>
          )}
        </div>

        {/* Customer Advisory */}
        <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50/80 border border-amber-200/60 p-3 rounded-xl">
          <ShieldAlert size={16} className="shrink-0 text-amber-600" />
          <span>Please send the message as it is. Changing it can delay your order.</span>
        </div>

        {/* Actions Suite */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto w-full">
          <button
            onClick={handleOpenWhatsAppAgain}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl text-xs md:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            style={{ background: '#25D366' }}
          >
            <ExternalLink size={16} />
            <span>Open WhatsApp Again</span>
          </button>

          <button
            onClick={handleCopyDetails}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl text-xs md:text-sm font-bold bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-main)] border border-[var(--border-light)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Copy size={16} />
            <span>{copied ? 'Copied Details! ✓' : 'Copy Order Text'}</span>
          </button>
        </div>

        {/* Step by step expectations */}
        <div className="pt-6 border-t border-[var(--border-light)] text-left max-w-md mx-auto space-y-3">
          <p className="text-xs font-800 uppercase tracking-wider text-[var(--text-main)]">
            What Happens Next?
          </p>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Our team verifies stock availability and custom sizing in WhatsApp chat.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>We provide order confirmation and payment instructions directly in chat.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Your garment is prepared, hand-packed, and dispatched with priority courier.</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline"
          >
            <span>Return to Storefront & Drops</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
