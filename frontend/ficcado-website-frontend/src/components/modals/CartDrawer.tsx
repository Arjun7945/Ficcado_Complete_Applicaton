'use client';

// =============================================================================
// CartDrawer — Slide-over shopping bag drawer (#cartDrawer)
// =============================================================================

import Image from 'next/image';
import { getProductFlatImage, PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/images';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useModal } from '@/context/ModalContext';
import { useCart } from '@/context/CartContext';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { getColorName } from '@/lib/colors';

export function CartDrawer() {
  const { activeModal, closeModal } = useModal();
  const { items, totalItemsCount, subtotalAmount, removeFromCart, changeQty } = useCart();
  const router = useRouter();

  const isOpen = activeModal === 'cartDrawer';

  function handleCheckout() {
    closeModal();
    router.push('/checkout');
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 h-[100dvh] max-h-[100dvh] z-50 flex items-end md:items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none"
      style={{
        paddingBottom: 'calc(var(--ios-bottom-bar-clearance, 0px) + max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem)))',
      }}
    >
      {/* Backdrop */}
      <div
        className="overlay animate-backdrop-in pointer-events-auto"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Drawer on mobile, Centered Modal on Tablet & Desktop */}
      <div
        id="cartDrawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Shopping bag${totalItemsCount > 0 ? `, ${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}` : ''}`}
        className="animate-sheet-in md:animate-modal-in relative w-full max-w-[440px] md:max-w-xl lg:max-w-2xl flex flex-col pointer-events-auto overflow-hidden rounded-[28px] sm:rounded-3xl md:rounded-3xl shadow-2xl border border-[var(--border-light)]"
        style={{
          maxHeight: 'min(82dvh, calc(100dvh - 3.5rem - var(--ios-bottom-bar-clearance, 0px)))',
          background: 'var(--bg-surface)',
          zIndex: 'var(--z-modal)',
        }}
      >
        {/* Drag handle (Mobile only) */}
        <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-medium)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="text-lg font-800" style={{ fontWeight: 800, color: 'var(--text-main)' }}>
              Your Bag
            </h2>
            {totalItemsCount > 0 && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-700 text-white"
                style={{ background: 'var(--primary)', fontWeight: 700 }}
              >
                {totalItemsCount}
              </span>
            )}
          </div>
          <button onClick={closeModal} className="btn-icon" aria-label="Close shopping bag">
            <X size={20} style={{ color: 'var(--text-main)' }} />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 px-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'var(--bg-surface-alt)' }}
            >
              <ShoppingBag size={28} style={{ color: 'var(--text-light)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-muted)' }}>
              Your bag is empty
            </p>
            <p className="text-sm text-center" style={{ color: 'var(--text-light)' }}>
              Add items to start shopping
            </p>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-3 overscroll-contain">
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}-${index}`}
                  className="flex gap-3 rounded-2xl p-3"
                  style={{
                    background: 'var(--bg-surface-alt)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative shrink-0 overflow-hidden rounded-xl bg-[var(--bg-surface-alt)]"
                    style={{ width: 72, height: 72 }}
                  >
                    <Image
                      src={item.flatImg || item.img || getProductFlatImage(item.slug) || PLACEHOLDER_PRODUCT_IMAGE}
                      alt={item.name}
                      fill
                      sizes="72px"
                      className="object-cover"
                      loading="eager"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-700 line-clamp-1" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.name}
                      </p>
                      <button
                        id={`remove-item-${index}`}
                        onClick={() => removeFromCart(index)}
                        className="btn-icon h-7 w-7 shrink-0"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: 'var(--border-light)', color: 'var(--text-muted)' }}
                      >
                        Size: {item.size}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: 'var(--border-light)', color: 'var(--text-muted)' }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0"
                          style={{ background: item.color }}
                        />
                        <span>Color: {item.colorName || getColorName(item.color)}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-base font-700" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{(item.price * item.qty).toLocaleString('en-IN')}
                      </span>
                      <QuantityStepper
                        qty={item.qty}
                        size="sm"
                        onIncrement={() => changeQty(index, 1)}
                        onDecrement={() => changeQty(index, -1)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div
              className="shrink-0 px-5 pt-3 pb-4 md:pb-5 bg-[var(--bg-surface)]"
              style={{ borderTop: '1px solid var(--border-light)' }}
            >
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-base font-600" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Subtotal</span>
                  <span className="text-xl font-800" style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{subtotalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                id="goto-checkout-btn"
                onClick={handleCheckout}
                className="btn-primary w-full py-3.5 text-base font-bold shadow-lg rounded-2xl cursor-pointer"
              >
                Go To Checkout →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
