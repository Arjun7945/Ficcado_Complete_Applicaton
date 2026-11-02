'use client';

// =============================================================================
// Customer Authentication & Session Lifecycle Context — CustomerAuthContext.tsx
// Handles session restoration on load/navigation, synchronous cached pre-hydration,
// sliding 10-minute idle timer, 9-minute "Still there?" prompt, multi-tab sync,
// and payment pause.
// =============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CustomerProfile,
  CustomerRegistrationData,
  getCurrentCustomer,
  checkCustomerSession,
  touchCustomerSession,
  pauseCustomerSession,
  loginWithPassword as apiLoginPassword,
  registerCustomer as apiRegister,
  logoutCustomer as apiLogout,
} from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import {
  getCustomerToken,
  setCustomerToken,
  getCachedCustomer,
  setCachedCustomer,
  clearCustomerSession,
  clearCustomerToken,
  CachedCustomerProfile,
} from '@/lib/api/sessionToken';
import { IdleTimeoutPromptModal } from '@/components/modals/IdleTimeoutPromptModal';

export const ACTIVITY_THROTTLE_MS = 2000;

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionPaused: boolean;
  showIdlePrompt: boolean;
  sessionNotice: string | null;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: CustomerRegistrationData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  stayLoggedIn: () => Promise<void>;
  pauseSession: (minutes?: number) => Promise<void>;
  resumeSession: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  // Synchronous pre-hydration from persistent cache: eliminates unauthenticated flash on /checkout
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    const cached = getCachedCustomer();
    return (cached as CustomerProfile) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !getCachedCustomer();
  });
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [showIdlePrompt, setShowIdlePrompt] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  const lastActivityRef = useRef<number>(0);
  const lastBroadcastRef = useRef<number>(0);
  const lastRouteChangeCheckRef = useRef<number>(0);
  const lastTouchRef = useRef<number>(0);
  const idleTimeoutSecondsRef = useRef<number>(3600);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastTouchRef.current = now;
  }, []);

  const broadcast = useCallback((msg: Record<string, unknown>) => {
    try {
      channelRef.current?.postMessage(msg);
    } catch {
      // Ignored
    }
  }, []);

  // Resilient profile refresh following Part 3 state rules:
  // Clear customer state ONLY on explicit 401 (expired/invalid) or user logout.
  // On network error, 5xx, 503 SESSION_STORE_UNAVAILABLE, or timeout: KEEP STATE and set non-blocking notice.
  const refreshProfile = useCallback(async () => {
    const currentToken = getCustomerToken();
    try {
      const sessionStatus = await checkCustomerSession();
      if (sessionStatus.idleTimeoutSeconds) {
        idleTimeoutSecondsRef.current = sessionStatus.idleTimeoutSeconds;
      }
      if (sessionStatus.active) {
        setSessionNotice(null);
        try {
          const profile = await getCurrentCustomer();
          if (profile) {
            setCustomer(profile);
            setCachedCustomer(profile);
            lastActivityRef.current = Date.now();
          }
        } catch (profileErr) {
          if (profileErr instanceof ApiError && profileErr.statusCode === 401) {
            clearCustomerSession();
            setCustomer(null);
            setSessionNotice(null);
          } else if (profileErr instanceof ApiError && profileErr.statusCode === 503) {
            setSessionNotice('Session service temporarily unavailable');
          }
        }
      } else {
        // Session explicitly inactive (expired or invalid token on server)
        // Verify with token before purging client state
        if (currentToken) {
          try {
            const profile = await getCurrentCustomer();
            if (profile) {
              setCustomer(profile);
              setCachedCustomer(profile);
              lastActivityRef.current = Date.now();
              return;
            }
          } catch {
            // Genuinely invalid or expired
          }
        }
        clearCustomerSession();
        setCustomer(null);
        setSessionNotice(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        clearCustomerSession();
        setCustomer(null);
        setSessionNotice(null);
      } else if (err instanceof ApiError && err.statusCode === 503) {
        // 503 SESSION_STORE_UNAVAILABLE: KEEP STATE, display non-blocking notice
        setSessionNotice('Session service temporarily unavailable');
      } else {
        // Transient network error or timeout: KEEP STATE, display non-blocking notice
        setSessionNotice('Connection to session service interrupted');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
      broadcast({ type: 'LOGOUT' });
    } finally {
      clearCustomerSession();
      setCustomer(null);
      setShowIdlePrompt(false);
      setSessionNotice(null);
    }
  }, [broadcast]);

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const ch = new BroadcastChannel('ficcado_customer_session');
        channelRef.current = ch;

        ch.onmessage = (event) => {
          const data = event.data;
          if (!data || typeof data !== 'object') return;

          switch (data.type) {
            case 'ACTIVITY':
            case 'TOUCH':
              lastActivityRef.current = data.timestamp || Date.now();
              setShowIdlePrompt(false);
              break;
            case 'LOGOUT':
              clearCustomerSession();
              setCustomer(null);
              setShowIdlePrompt(false);
              setSessionNotice(null);
              break;
            case 'LOGIN':
              if (data.token && typeof data.token === 'string') {
                setCustomerToken(data.token);
              }
              if (data.profile && typeof data.profile === 'object') {
                setCachedCustomer(data.profile as CustomerProfile);
                setCustomer(data.profile as CustomerProfile);
              }
              refreshProfile();
              break;
            case 'PAUSE':
              setIsSessionPaused(true);
              break;
            case 'RESUME':
              setIsSessionPaused(false);
              lastActivityRef.current = Date.now();
              break;
          }
        };

        return () => {
          ch.close();
          channelRef.current = null;
        };
      } catch {
        // Fallback if BroadcastChannel unavailable
      }
    }
  }, [refreshProfile]);

  // Multi-tab storage & custom session event listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ficcado_customer_token' || e.key === 'ficcado_customer_profile') {
        const cached = getCachedCustomer();
        setCustomer((cached as CustomerProfile) || null);
        if (!cached) {
          setShowIdlePrompt(false);
        }
      }
    };

    const handleSessionEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'LOGOUT') {
        setCustomer(null);
        setShowIdlePrompt(false);
      } else if (detail?.type === 'PROFILE_SET' && detail.profile) {
        setCustomer(detail.profile as CustomerProfile);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('ficcado-session-change', handleSessionEvent);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ficcado-session-change', handleSessionEvent);
    };
  }, []);

  // Restore session on initial mount
  useEffect(() => {
    const cached = getCachedCustomer();
    if (cached && !customer) {
      setCustomer(cached as CustomerProfile);
    }
    refreshProfile();
  }, [refreshProfile]);

  // Non-destructive, throttled route-change verification (max once per 30s)
  // Sends background header X-Ficcado-Background: 1 and never extends sliding idle window
  useEffect(() => {
    // Only verify if currently authenticated
    if (!customer) return;

    const now = Date.now();
    if (now - lastRouteChangeCheckRef.current < 30_000) {
      return; // Throttled: do not fire more than once per 30 seconds
    }
    lastRouteChangeCheckRef.current = now;

    checkCustomerSession({ 'X-Ficcado-Background': '1' })
      .then((status) => {
        if (status.idleTimeoutSeconds) {
          idleTimeoutSecondsRef.current = status.idleTimeoutSeconds;
        }
        if (!status.active) {
          // Double-check token with /me before clearing
          if (getCustomerToken()) {
            getCurrentCustomer()
              .then((prof) => {
                if (prof) {
                  setCustomer(prof);
                  setCachedCustomer(prof);
                } else {
                  clearCustomerSession();
                  setCustomer(null);
                  setSessionNotice(null);
                }
              })
              .catch(() => {
                // Keep state on network error
              });
          } else {
            clearCustomerSession();
            setCustomer(null);
            setSessionNotice(null);
          }
        } else {
          setSessionNotice(null);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) {
          clearCustomerSession();
          setCustomer(null);
          setSessionNotice(null);
        } else if (err instanceof ApiError && err.statusCode === 503) {
          setSessionNotice('Session service temporarily unavailable');
        }
        // State rule: keep customer on network/timeout/503 errors
      });
  }, [pathname, refreshProfile]);

  // Activity listeners to reset idle timer
  useEffect(() => {
    if (!customer || isSessionPaused) return;

    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (showIdlePrompt) {
        setShowIdlePrompt(false);
      }

      // Throttle broadcast across tabs
      if (now - lastBroadcastRef.current > ACTIVITY_THROTTLE_MS) {
        lastBroadcastRef.current = now;
        broadcast({ type: 'ACTIVITY', timestamp: now });
      }

      // Keep server Redis session alive while user is actively engaging with page (throttled to once per 2 minutes)
      if (now - lastTouchRef.current > 120_000) {
        lastTouchRef.current = now;
        touchCustomerSession()
          .then((res) => {
            if (res.idleTimeoutSeconds) {
              idleTimeoutSecondsRef.current = res.idleTimeoutSeconds;
            }
            if (!res.active) {
              if (getCustomerToken()) {
                getCurrentCustomer()
                  .then((prof) => {
                    if (prof) {
                      setCustomer(prof);
                      setCachedCustomer(prof);
                    } else {
                      clearCustomerSession();
                      setCustomer(null);
                    }
                  })
                  .catch(() => {});
              } else {
                clearCustomerSession();
                setCustomer(null);
              }
            }
          })
          .catch((err) => {
            if (err instanceof ApiError && err.statusCode === 401) {
              clearCustomerSession();
              setCustomer(null);
            }
          });
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [customer, isSessionPaused, showIdlePrompt, broadcast]);

  // Idle timer ticker computed dynamically from server-configured timeout
  useEffect(() => {
    if (!customer || isSessionPaused) return;

    const interval = setInterval(() => {
      const idleSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const timeout = idleTimeoutSecondsRef.current;
      const warningThreshold = Math.max(timeout - 300, 60);

      if (idleSeconds >= timeout) {
        // Full timeout reached: logout due to inactivity
        logout();
        setShowIdlePrompt(false);
        router.push('/login?message=You%20were%20logged%20out%20due%20to%20inactivity.');
      } else if (idleSeconds >= warningThreshold) {
        // Prompt at (timeout - 300s): show "Still there?" prompt
        setShowIdlePrompt(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [customer, isSessionPaused, router, logout]);

  const stayLoggedIn = async () => {
    setShowIdlePrompt(false);
    const now = Date.now();
    lastActivityRef.current = now;
    lastTouchRef.current = now;
    try {
      const res = await touchCustomerSession();
      if (res.idleTimeoutSeconds) {
        idleTimeoutSecondsRef.current = res.idleTimeoutSeconds;
      }
      broadcast({ type: 'TOUCH', timestamp: now });
    } catch {
      // Ignored
    }
  };

  const pauseSession = async (minutes: number = 15) => {
    setIsSessionPaused(true);
    broadcast({ type: 'PAUSE', minutes });
    try {
      await pauseCustomerSession(minutes);
    } catch {
      // Ignored
    }
  };

  const resumeSession = async () => {
    setIsSessionPaused(false);
    const now = Date.now();
    lastActivityRef.current = now;
    lastTouchRef.current = now;
    broadcast({ type: 'RESUME', timestamp: now });
    try {
      await touchCustomerSession();
    } catch {
      // Ignored
    }
  };

  const loginWithPassword = async (email: string, pass: string) => {
    try {
      const res = await apiLoginPassword(email, pass);
      if (res.success && res.customer) {
        if (res.token) {
          setCustomerToken(res.token);
        }
        setCachedCustomer(res.customer);
        setCustomer(res.customer);
        lastActivityRef.current = Date.now();
        broadcast({ type: 'LOGIN', token: res.token, profile: res.customer });
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Connection error' };
    }
  };

  const register = async (data: CustomerRegistrationData) => {
    try {
      const res = await apiRegister(data);
      if (res.success && res.customer) {
        if (res.token) {
          setCustomerToken(res.token);
        }
        setCachedCustomer(res.customer);
        setCustomer(res.customer);
        lastActivityRef.current = Date.now();
        broadcast({ type: 'LOGIN', token: res.token, profile: res.customer });
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Registration error' };
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        isSessionPaused,
        showIdlePrompt,
        sessionNotice,
        loginWithPassword,
        register,
        logout,
        refreshProfile,
        stayLoggedIn,
        pauseSession,
        resumeSession,
      }}
    >
      {children}
      {sessionNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] px-4 py-3 text-sm text-[var(--text-main)] shadow-xl backdrop-blur-md transition-opacity"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
          <span>{sessionNotice}</span>
        </div>
      )}
      <IdleTimeoutPromptModal
        isOpen={showIdlePrompt}
        onStayLoggedIn={stayLoggedIn}
        onLogout={logout}
      />
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
