'use client';

// =============================================================================
// WishlistContext — Server-Backed Customer Wishlist Management
// Implemented per Part 2 Phase P2-5 (A-1, C-1).
// Database is the sole source of truth for authenticated users.
// Guests are prompted with GuestWishlistPromptModal and auto-added upon login.
// =============================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import {
  getWishlistItems,
  addToWishlistApi,
  removeFromWishlistApi,
} from '@/lib/api/wishlist';
import type { WishlistItem } from '@/types';

interface PendingWishlistItem {
  itemId: number;
  returnPath: string;
}

const PENDING_WISHLIST_STORAGE_KEY = 'ficcado_pending_wishlist';

interface WishlistContextValue {
  wishlistIds: Set<number>;
  wishlistCount: number;
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  isInWishlist: (itemId: number | string) => boolean;
  toggleWishlist: (itemId: number | string) => Promise<void>;
  addToWishlist: (itemId: number | string) => Promise<void>;
  removeFromWishlist: (itemId: number | string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useCustomerAuth();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((item) => item.itemId)),
    [wishlistItems],
  );

  // 1. Fetch server wishlist for authenticated customer
  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }

    try {
      setIsLoading(true);
      const items = await getWishlistItems();
      setWishlistItems(items);
    } catch (err) {
      console.error('[WishlistContext] Failed to load server wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 2. Trigger refresh and check pending guest add upon authentication
  useEffect(() => {
    if (isAuthenticated) {
      refreshWishlist();

      // Check pending guest wishlist item
      try {
        const stored = sessionStorage.getItem(PENDING_WISHLIST_STORAGE_KEY);
        if (stored) {
          const parsed: PendingWishlistItem = JSON.parse(stored);
          sessionStorage.removeItem(PENDING_WISHLIST_STORAGE_KEY);

          // Validate safety: numeric item id and same-site relative path
          const cleanItemId = Number(parsed.itemId);
          const rawPath = parsed.returnPath || '/';
          const isSafePath =
            typeof rawPath === 'string' &&
            rawPath.startsWith('/') &&
            !rawPath.startsWith('//') &&
            !rawPath.includes(':') &&
            !rawPath.includes('http');

          if (Number.isSafeInteger(cleanItemId) && cleanItemId > 0) {
            addToWishlistApi(cleanItemId)
              .then((added) => {
                setWishlistItems((prev) => {
                  if (prev.some((p) => p.itemId === cleanItemId)) return prev;
                  return [added, ...prev];
                });
                showToast('Item saved to your wishlist! 💖', 'success');
                if (isSafePath && pathname !== rawPath && !rawPath.startsWith('/login')) {
                  router.push(rawPath);
                }
              })
              .catch((err) => {
                console.error('[WishlistContext] Failed to add pending item:', err);
              });
          }
        }
      } catch {
        // Safe fallback if sessionStorage is restricted or corrupted
        sessionStorage.removeItem(PENDING_WISHLIST_STORAGE_KEY);
      }
    } else {
      setWishlistItems([]);
    }
  }, [isAuthenticated, pathname, refreshWishlist, router, showToast]);

  // 3. Helper to check if an item is in wishlist
  const isInWishlist = useCallback(
    (itemId: number | string) => {
      const id = Number(itemId);
      return wishlistIds.has(id);
    },
    [wishlistIds],
  );

  // 4. Add to wishlist (with optimistic UI update)
  const addToWishlist = useCallback(
    async (itemId: number | string) => {
      const id = Number(itemId);
      if (!Number.isSafeInteger(id) || id <= 0) return;

      if (!isAuthenticated) {
        // Guest user: save pending item and trigger prompt modal
        try {
          const pending: PendingWishlistItem = {
            itemId: id,
            returnPath: pathname || '/',
          };
          sessionStorage.setItem(PENDING_WISHLIST_STORAGE_KEY, JSON.stringify(pending));
        } catch {
          // ignore storage error
        }
        openModal('guestWishlistModal');
        return;
      }

      // Check if already in list
      if (wishlistIds.has(id)) return;

      // Optimistic update
      const optimisticItem: WishlistItem = {
        itemId: id,
        createdAt: new Date().toISOString(),
      };
      setWishlistItems((prev) => [optimisticItem, ...prev]);

      try {
        const saved = await addToWishlistApi(id);
        setWishlistItems((prev) =>
          prev.map((it) => (it.itemId === id ? saved : it)),
        );
        showToast('Added to Wishlist! 💖', 'success');
      } catch (err: unknown) {
        // Revert optimistic update on error
        setWishlistItems((prev) => prev.filter((it) => it.itemId !== id));
        const errMsg = err instanceof Error ? err.message : '';
        if (errMsg && errMsg.includes('200')) {
          showToast('Wishlist limit reached (maximum 200 items).', 'error');
        } else {
          showToast('Failed to save to wishlist. Please try again.', 'error');
        }
      }
    },
    [isAuthenticated, openModal, pathname, showToast, wishlistIds],
  );

  // 5. Remove from wishlist (with optimistic UI update)
  const removeFromWishlist = useCallback(
    async (itemId: number | string) => {
      const id = Number(itemId);
      if (!Number.isSafeInteger(id) || id <= 0) return;

      if (!isAuthenticated) {
        return;
      }

      if (!wishlistIds.has(id)) return;

      const previousItems = [...wishlistItems];
      // Optimistic remove
      setWishlistItems((prev) => prev.filter((it) => it.itemId !== id));

      try {
        await removeFromWishlistApi(id);
        showToast('Removed from Wishlist', 'info');
      } catch {
        // Revert optimistic update on error
        setWishlistItems(previousItems);
        showToast('Failed to remove from wishlist. Please try again.', 'error');
      }
    },
    [isAuthenticated, showToast, wishlistIds, wishlistItems],
  );

  // 6. Toggle wishlist
  const toggleWishlist = useCallback(
    async (itemId: number | string) => {
      const id = Number(itemId);
      if (isInWishlist(id)) {
        await removeFromWishlist(id);
      } else {
        await addToWishlist(id);
      }
    },
    [addToWishlist, isInWishlist, removeFromWishlist],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistIds,
      wishlistCount: wishlistItems.length,
      wishlistItems,
      isLoading,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      refreshWishlist,
    }),
    [
      wishlistIds,
      wishlistItems,
      isLoading,
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      refreshWishlist,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within <WishlistProvider>');
  }
  return ctx;
}
