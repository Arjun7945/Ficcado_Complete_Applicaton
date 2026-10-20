'use client';

// =============================================================================
// ModalContext — Unified global modal / sheet / drawer manager
// Manages a single active modal at a time with typed payload.
// =============================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ModalId, Product } from '@/types';

// ---------------------------------------------------------------------------
// Payload types per modal
// ---------------------------------------------------------------------------

export interface ProductModalPayload {
  productId?: number | string;
  product?: Product;
}

// Union of all possible payloads
export type ModalPayload =
  | ProductModalPayload
  | Record<string, unknown>
  | null;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ModalContextValue {
  activeModal: ModalId;
  modalPayload: ModalPayload;
  openModal: (id: NonNullable<ModalId>, payload?: ModalPayload) => void;
  closeModal: () => void;
  /** Convenience: open product modal with product object or id */
  openProductModal: (target: number | string | Product, extraProduct?: Product) => void;
  /** Convenience: replace active modal (e.g. productModal -> cartDrawer) */
  switchModal: (id: NonNullable<ModalId>, payload?: ModalPayload) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [modalPayload, setModalPayload] = useState<ModalPayload>(null);

  const openModal = useCallback(
    (id: NonNullable<ModalId>, payload: ModalPayload = null) => {
      setActiveModal(id);
      setModalPayload(payload);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalPayload(null);
  }, []);

  const openProductModal = useCallback(
    (target: number | string | Product, extraProduct?: Product) => {
      setActiveModal('productModal');
      if (typeof target === 'object' && target !== null) {
        setModalPayload({ productId: target.id, product: target });
      } else {
        setModalPayload({ productId: target, product: extraProduct });
      }
    },
    [],
  );

  const switchModal = useCallback(
    (id: NonNullable<ModalId>, payload: ModalPayload = null) => {
      setActiveModal(null);
      setModalPayload(null);
      requestAnimationFrame(() => {
        setActiveModal(id);
        setModalPayload(payload);
      });
    },
    [],
  );

  // Lock background body scroll and dismiss on Escape key when any modal is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (activeModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [activeModal, closeModal]);

  const value = useMemo<ModalContextValue>(
    () => ({
      activeModal,
      modalPayload,
      openModal,
      closeModal,
      openProductModal,
      switchModal,
    }),
    [activeModal, modalPayload, openModal, closeModal, openProductModal, switchModal],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within <ModalProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Helper: extract typed payload safely
// ---------------------------------------------------------------------------

export function getProductModalPayload(
  payload: ModalPayload,
): ProductModalPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  return payload as ProductModalPayload;
}
