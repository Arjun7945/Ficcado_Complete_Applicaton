'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  CustomerProfile,
  CustomerRegistrationData,
  getCurrentCustomer,
  loginWithPassword as apiLoginPassword,
  registerCustomer as apiRegister,
  requestLoginOtp as apiRequestOtp,
  verifyLoginOtp as apiVerifyOtp,
  logoutCustomer as apiLogout,
} from '@/lib/api/auth';

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  loginWithOtp: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  register: (data: CustomerRegistrationData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getCurrentCustomer();
      setCustomer(profile);
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const loginWithPassword = async (email: string, pass: string) => {
    try {
      const res = await apiLoginPassword(email, pass);
      if (res.success && res.customer) {
        setCustomer(res.customer);
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
    } finally {
      setCustomer(null);
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        loginWithPassword,
        loginWithOtp,
        requestOtp,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
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
