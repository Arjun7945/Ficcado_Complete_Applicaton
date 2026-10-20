'use client';

// =============================================================================
// AuthModal — Customer Sign In & Registration Modal
// Supports Password login, Email OTP verification, and new account registration
// =============================================================================

import React, { useState } from 'react';
import { X, Mail, Lock, Phone, User, MapPin, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';

type AuthTab = 'signin' | 'register';
type LoginMethod = 'otp' | 'password';

export function AuthModal() {
  const { activeModal, closeModal } = useModal();
  const { loginWithPassword, loginWithOtp, requestOtp, register } = useCustomerAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Registration states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOpen = activeModal === 'authModal';

  if (!isOpen) return null;

  // Handle OTP request
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestOtp(email.trim());
      if (res.success) {
        setOtpSent(true);
        setOtpCountdown(60);
        showToast('Verification code sent to your email', 'success');

        const timer = setInterval(() => {
          setOtpCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMsg(res.message || 'Could not send verification code');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to request OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await loginWithOtp(email.trim(), otpCode.trim());
      if (res.success) {
        showToast('Successfully signed in!', 'success');
        closeModal();
      } else {
        setErrorMsg(res.message || 'Verification failed');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'OTP verification error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await loginWithPassword(email.trim(), password);
      if (res.success) {
        showToast('Welcome back to Ficcado!', 'success');
        closeModal();
      } else {
        setErrorMsg(res.message || 'Invalid email or password');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        address: regAddress.trim() || undefined,
      });

      if (res.success) {
        showToast('Account created successfully!', 'success');
        closeModal();
      } else {
        setErrorMsg(res.message || 'Registration failed');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Registration error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 h-[100dvh] max-h-[100dvh] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none"
      style={{
        zIndex: 'var(--z-modal)',
        paddingBottom: 'calc(var(--ios-bottom-bar-clearance, 0px) + max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem)))',
      }}
    >
      <div
        className="overlay animate-backdrop-in pointer-events-auto"
        onClick={closeModal}
        aria-hidden="true"
      />

      <div
        id="authModal"
        role="dialog"
        aria-modal="true"
        aria-label="Customer Account Sign In or Register"
        className="animate-sheet-in sm:animate-modal-in relative w-full sm:max-w-[440px] flex flex-col pointer-events-auto rounded-[28px] sm:rounded-3xl shadow-2xl border border-[var(--border-light)] overflow-hidden bg-[var(--bg-surface)]"
        style={{
          maxHeight: 'min(88dvh, calc(100dvh - 3.5rem - var(--ios-bottom-bar-clearance, 0px)))',
          zIndex: 10,
        }}
      >
        {/* Top Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface-alt)]">
          <div>
            <h2 className="text-base font-900 tracking-tight text-[var(--text-main)]">
              {activeTab === 'signin' ? 'Sign In to Ficcado' : 'Create an Account'}
            </h2>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">
              {activeTab === 'signin'
                ? 'Access your orders, saved addresses & exclusive drops'
                : 'Join the community for order tracking & faster checkout'}
            </p>
          </div>
          <button
            onClick={closeModal}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white dark:bg-neutral-800 border border-[var(--border-light)] text-[var(--text-main)] hover:bg-[var(--bg-surface)] active:scale-90 transition-all cursor-pointer shadow-xs"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex rounded-xl bg-[var(--bg-surface-alt)] p-1 border border-[var(--border-light)]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white dark:bg-neutral-800 text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-neutral-800 text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'signin' ? (
            <div className="space-y-4">
              {/* Login Method Toggle */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Method
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      setErrorMsg(null);
                    }}
                    className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                      loginMethod === 'otp'
                        ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    Email OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setErrorMsg(null);
                    }}
                    className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                      loginMethod === 'password'
                        ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    Password
                  </button>
                </div>
              </div>

              {loginMethod === 'otp' ? (
                !otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                        />
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-[var(--text-main)]">
                          6-Digit Code sent to {email}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                          className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          required
                          autoFocus
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full h-11 text-center tracking-widest text-base font-bold rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                        />
                        <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || otpCode.length !== 6}
                      className="w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <CheckCircle2 size={14} />
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      {otpCountdown > 0 ? (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Resend code in {otpCountdown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          disabled={isSubmitting}
                          className="text-[11px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handlePasswordLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      />
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      />
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Sign In with Password</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Arjun PS"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Phone Number (India +91) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Delivery Address (Optional)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="House/Apt, Street, City, Pincode"
                    className="w-full p-2.5 pl-9 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
                  />
                  <MapPin size={15} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
