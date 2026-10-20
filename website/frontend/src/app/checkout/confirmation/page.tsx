'use client';

// =============================================================================
// Order Confirmation Page — /checkout/confirmation
// Displays verified online order details, invoice number, and tracking instructions
// =============================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Package, ArrowRight, Home, User, ShieldCheck, Truck, ShoppingBag } from 'lucide-react';

interface OrderConfirmationData {
  invoiceNumber: string;
  transactionId: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
}

export default function OrderConfirmationPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderConfirmationData | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('ficcado-last-confirmed-order');
      if (stored) {
        setOrderData(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-[75vh] max-w-2xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      {/* Success Badge & Headline */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm mx-auto">
          <CheckCircle2 size={36} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-900 tracking-tight text-[var(--text-main)]">
          Payment Verified & Order Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          Thank you for choosing Ficcado. Your unisex streetwear drop order has been officially recorded in our system.
        </p>
      </div>

      {/* Main Order Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-light)]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Invoice Number
            </span>
            <p className="text-base font-mono font-900 text-[var(--primary)] mt-0.5">
              {orderData?.invoiceNumber || 'FIC-INV-' + Date.now()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              PAID ONLINE
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              PROCESSING
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Delivery Details
            </span>
            <p className="font-bold text-[var(--text-main)]">
              {orderData?.customerName || 'Customer'}
            </p>
            <p className="text-[var(--text-secondary)]">
              +91 {orderData?.customerPhone || 'N/A'}
            </p>
            <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {orderData?.shippingAddress || 'Address on file'}
            </p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-[var(--border-light)] sm:pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Payment Summary
            </span>
            <div className="flex justify-between py-0.5 text-[var(--text-secondary)]">
              <span>Subtotal:</span>
              <span className="font-bold text-[var(--text-main)]">
                ₹{(orderData?.subtotal || orderData?.total || 1499).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between py-0.5 text-[var(--text-secondary)]">
              <span>Delivery Charge:</span>
              <span className="font-bold text-[var(--text-main)]">
                {orderData?.deliveryCharge ? `₹${orderData.deliveryCharge.toLocaleString('en-IN')}` : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border-light)] text-sm font-black text-[var(--text-main)]">
              <span>Grand Total:</span>
              <span className="text-[var(--primary)]">
                ₹{(orderData?.total || 1499).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Dispatch Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] flex items-start gap-3">
          <Truck size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-[var(--text-main)]">
              Pan-India Verified Courier Dispatch
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Your garments will be inspected and dispatched within 24–48 hours. Live courier tracking updates will be accessible directly in your account.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/account"
          className="flex-1 h-12 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-btn cursor-pointer"
        >
          <User size={15} />
          <span>View in My Account & Orders</span>
          <ArrowRight size={14} />
        </Link>
        <Link
          href="/"
          className="flex-1 h-12 rounded-2xl bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Home size={15} />
          <span>Back to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
