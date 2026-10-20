'use client';

// =============================================================================
// QuantityStepper — Cart item quantity +/- control
// Auto-removes item when qty reaches 0 via onRemove callback.
// =============================================================================

import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Min allowed quantity before removal (default 1) */
  min?: number;
  /** Max allowed quantity (default 99) */
  max?: number;
  size?: 'sm' | 'md';
}

export function QuantityStepper({
  qty,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
  size = 'md',
}: QuantityStepperProps) {
  const isSmall = size === 'sm';
  const btnSize = isSmall ? 24 : 30;
  const iconSize = isSmall ? 12 : 14;
  const textSize = isSmall ? '12px' : '14px';

  return (
    <div
      className="flex items-center gap-1"
      style={{
        background: 'var(--bg-surface-alt)',
        borderRadius: 'var(--radius-full)',
        padding: '3px',
        border: '1px solid var(--border-light)',
        display: 'inline-flex',
      }}
      role="group"
      aria-label="Quantity"
    >
      <button
        id="qty-decrement"
        onClick={onDecrement}
        disabled={qty <= 0}
        className="flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40"
        style={{
          width: btnSize,
          height: btnSize,
          background: qty <= min ? 'var(--border-light)' : 'var(--primary)',
          border: 'none',
          cursor: qty <= 0 ? 'not-allowed' : 'pointer',
        }}
        aria-label="Decrease quantity"
      >
        <Minus size={iconSize} strokeWidth={2.5} style={{ color: qty <= min ? 'var(--text-muted)' : '#fff' }} />
      </button>

      <span
        className="tabular-nums font-700 select-none"
        style={{
          minWidth: isSmall ? '1.25rem' : '1.75rem',
          textAlign: 'center',
          fontSize: textSize,
          fontWeight: 700,
          color: 'var(--text-main)',
        }}
        aria-live="polite"
        aria-label={`Quantity: ${qty}`}
      >
        {qty}
      </span>

      <button
        id="qty-increment"
        onClick={onIncrement}
        disabled={qty >= max}
        className="flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40"
        style={{
          width: btnSize,
          height: btnSize,
          background: 'var(--primary)',
          border: 'none',
          cursor: qty >= max ? 'not-allowed' : 'pointer',
        }}
        aria-label="Increase quantity"
      >
        <Plus size={iconSize} strokeWidth={2.5} style={{ color: '#fff' }} />
      </button>
    </div>
  );
}
