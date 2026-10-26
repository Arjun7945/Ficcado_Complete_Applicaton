'use client';

// =============================================================================
// GuestWishlistPromptModal — Modal prompt for unauthenticated visitors
// Invites guest users to sign in or create an account to save items to wishlist.
// Smoothly hands off to AuthModal for Sign In or Registration.
// =============================================================================

import React from 'react';
import { Heart, X, LogIn, UserPlus } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

export function GuestWishlistPromptModal() {
  const { activeModal, closeModal, openModal } = useModal();
  const isOpen = activeModal === 'guestWishlistModal';

  if (!isOpen) return null;

  const handleOpenSignIn = () => {
    closeModal();
    // Open AuthModal with Sign In tab
    requestAnimationFrame(() => {
      openModal('authModal');
    });
  };

  const handleOpenSignUp = () => {
    closeModal();
    // Open AuthModal with Register tab
    requestAnimationFrame(() => {
      openModal('authModal');
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-wishlist-title"
    >
      <div
        id="guest-wishlist-modal"
        className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-2xl animate-modal-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeModal}
          id="guest-wishlist-close-btn"
          aria-label="Close modal"
          className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Brand Heart Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] mb-5 shadow-inner">
          <Heart size={32} className="fill-[var(--primary)] text-[var(--primary)]" />
        </div>

        {/* Content */}
        <h2
          id="guest-wishlist-title"
          className="text-xl sm:text-2xl font-800 tracking-tight text-[var(--text-main)] mb-2"
        >
          Save to Wishlist
        </h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
          Log in or create an account to save your favorite luxury drops and access them across all your devices.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            id="guest-wishlist-login-btn"
            onClick={handleOpenSignIn}
            className="btn-primary flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-btn"
          >
            <LogIn size={16} />
            <span>Log In</span>
          </button>

          <button
            type="button"
            id="guest-wishlist-signup-btn"
            onClick={handleOpenSignUp}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-main)] border border-[var(--border-light)] transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <UserPlus size={16} />
            <span>Sign Up</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuestWishlistPromptModal;
