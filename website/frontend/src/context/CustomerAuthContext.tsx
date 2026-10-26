'use client';

// =============================================================================
// Customer Authentication & Session Lifecycle Context — CustomerAuthContext.tsx
// Handles session restoration on load/navigation, sliding 10-minute idle timer,
// 9-minute "Still there?" prompt, multi-tab sync, and payment pause.
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
  requestLoginOtp as apiRequestOtp,
  verifyLoginOtp as apiVerifyOtp,
  logoutCustomer as apiLogout,
} from '@/lib/api/auth';
import { IdleTimeoutPromptModal } from '@/components/modals/IdleTimeoutPromptModal';

export const IDLE_WARNING_SECONDS = 540; // 9 minutes
export const IDLE_LOGOUT_SECONDS = 600;  // 10 minutes
export const ACTIVITY_THROTTLE_MS = 2000;

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionPaused: boolean;
  showIdlePrompt: boolean;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  loginWithOtp: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  register: (data: CustomerRegistrationData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  stayLoggedIn: () => Promise<void>;
  pauseSession: (minutes?: number) => Promise<void>;
  resumeSession: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [showIdlePrompt, setShowIdlePrompt] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const lastActivityRef = useRef<number>(Date.now());
  const lastBroadcastRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

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
              setCustomer(null);
              setShowIdlePrompt(false);
              break;
            case 'LOGIN':
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
  }, []);

  const broadcast = useCallback((msg: Record<string, unknown>) => {
    try {
      channelRef.current?.postMessage(msg);
    } catch {
      // Ignored
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const sessionStatus = await checkCustomerSession();
      if (sessionStatus.active) {
        const profile = await getCurrentCustomer();
        setCustomer(profile);
        lastActivityRef.current = Date.now();
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore session on mount and on route navigation
  useEffect(() => {
    refreshProfile();
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
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [customer, isSessionPaused, showIdlePrompt, broadcast]);

  // Idle timer ticker
  useEffect(() => {
    if (!customer || isSessionPaused) return;

    const interval = setInterval(() => {
      const idleSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);

      if (idleSeconds >= IDLE_LOGOUT_SECONDS) {
        // 10 minutes reached: logout due to inactivity
        logout();
        setShowIdlePrompt(false);
        router.push('/login?message=You%20were%20logged%20out%20due%20to%20inactivity.');
      } else if (idleSeconds >= IDLE_WARNING_SECONDS) {
        // 9 minutes reached: show "Still there?" prompt
        setShowIdlePrompt(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [customer, isSessionPaused, router]);

  const stayLoggedIn = async () => {
    setShowIdlePrompt(false);
    lastActivityRef.current = Date.now();
    try {
      await touchCustomerSession();
      broadcast({ type: 'TOUCH', timestamp: Date.now() });
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
    lastActivityRef.current = Date.now();
    broadcast({ type: 'RESUME', timestamp: Date.now() });
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
        setCustomer(res.customer);
        lastActivityRef.current = Date.now();
        broadcast({ type: 'LOGIN' });
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Connection error' };
    }
  };

  const requestOtp = async (email: string) => {
    return apiRequestOtp(email);
  };

  const loginWithOtp = async (email: string, code: string) => {
    try {
      const res = await apiVerifyOtp(email, code);
      if (res.success) {
        await refreshProfile();
        lastActivityRef.current = Date.now();
        broadcast({ type: 'LOGIN' });
        return { success: true };
      }
      return { success: false, message: res.message || 'Invalid code' };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Verification error' };
    }
  };

  const register = async (data: CustomerRegistrationData) => {
    try {
      const res = await apiRegister(data);
      if (res.success && res.customer) {
        setCustomer(res.customer);
        lastActivityRef.current = Date.now();
        broadcast({ type: 'LOGIN' });
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Registration error' };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      broadcast({ type: 'LOGOUT' });
    } finally {
      setCustomer(null);
      setShowIdlePrompt(false);
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
        loginWithPassword,
        loginWithOtp,
        requestOtp,
        register,
        logout,
        refreshProfile,
        stayLoggedIn,
        pauseSession,
        resumeSession,
      }}
    >
      {children}
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
