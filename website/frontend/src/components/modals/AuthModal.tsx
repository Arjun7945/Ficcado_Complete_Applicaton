'use client';

// =============================================================================
// AuthModal — Customer Sign In, Registration & 3-Step Forgot-Password Modal
// Password-only authentication, immediate registration, and OTP-verified password reset.
// Luxury Ficcado design tokens and strict WCAG AA contrast compliance.
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Phone,
  User,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { normalizePhone, isValidIndianPhone } from '@/lib/phone';
import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  confirmPasswordReset,
} from '@/lib/api/auth';

type AuthView = 'signin' | 'register' | 'forgot-password';
type ForgotStep = 'request' | 'verify' | 'new-password';

export function AuthModal() {
  const { activeModal, closeModal } = useModal();
  const { loginWithPassword, register } = useCustomerAuth();
  const { showToast } = useToast();

  const isOpen = activeModal === 'authModal';

  // Navigation state
  const [activeView, setActiveView] = useState<AuthView>('signin');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');

  // Sign In inputs (empty strings, no prefill)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration inputs (empty strings, no prefill)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Forgot Password inputs & tokens
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [phoneFieldError, setPhoneFieldError] = useState<string | null>(null);

  // Clear every auth input and state on open or close
  const resetAllFields = () => {
    setEmail('');
    setPassword('');
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegAddress('');
    setForgotEmail('');
    setForgotOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setPhoneFieldError(null);
    setOtpCountdown(0);
  };

  useEffect(() => {
    if (!isOpen) {
      resetAllFields();
      setActiveView('signin');
      setForgotStep('request');
    }
  }, [isOpen]);

  // Handle countdown timer for resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  if (!isOpen) return null;

  // ── 1. Sign In Handler (Password Only) ──────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await loginWithPassword(email.trim(), password);
      if (res.success) {
        showToast('Welcome back to Ficcado!', 'success');
        closeModal();
      } else {
        setErrorMsg(res.message || 'Invalid email address or password.');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Sign in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 2. Registration Handler (Immediate Account Creation, No OTP) ────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneFieldError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    const normalizedPhone = normalizePhone(regPhone);
    if (!isValidIndianPhone(normalizedPhone)) {
      setPhoneFieldError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 98765 43210)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: normalizedPhone,
        password: regPassword,
        address: regAddress.trim() || undefined,
      });

      if (res.success) {
        showToast('Account created successfully!', 'success');
        closeModal();
      } else {
        setErrorMsg(
          res.message ||
            'We could not create an account with these details. If you already have an account, sign in or use Forgot password.'
        );
      }
    } catch (err) {
      setErrorMsg(
        (err as Error).message ||
          'We could not create an account with these details. If you already have an account, sign in or use Forgot password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 3. Forgot Password Flow ────────────────────────────────────────────────
  // Step 1: Request Code
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setSuccessMsg(res.message);
      setForgotStep('verify');
      setOtpCountdown(res.cooldownSeconds || 60);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Unable to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await verifyPasswordResetOtp(forgotEmail.trim(), forgotOtp.trim());
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setForgotStep('new-password');
      } else {
        setErrorMsg(res.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: New Password
  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await confirmPasswordReset(
        forgotEmail.trim(),
        resetToken,
        newPassword,
        confirmPassword
      );

      showToast(res.message || 'Password updated. Please sign in.', 'success');
      resetAllFields();
      setActiveView('signin');
      setSuccessMsg('Password updated. Please sign in.');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Could not update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 h-[100dvh] max-h-[100dvh] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none"
      style={{
        zIndex: 'var(--z-modal)',
        paddingBottom:
          'calc(var(--ios-bottom-bar-clearance, 0px) + max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem)))',
      }}
    >
      {/* Backdrop Overlay */}
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
            <h2 id="auth-heading" className="text-base font-900 tracking-tight text-[var(--text-main)]">
              {activeView === 'signin'
                ? 'Sign In to Ficcado'
                : activeView === 'register'
                ? 'Create an Account'
                : 'Reset Password'}
            </h2>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">
              {activeView === 'signin'
                ? 'Access your orders, saved addresses & exclusive drops'
                : activeView === 'register'
                ? 'Join the community for order tracking & faster checkout'
                : forgotStep === 'request'
                ? 'Enter your registered email to receive a reset code'
                : forgotStep === 'verify'
                ? 'Enter the 6-digit verification code sent to your email'
                : 'Enter and confirm your new account password'}
            </p>
          </div>
          <button
            id="auth-modal-close-btn"
            onClick={closeModal}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--primary-light)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] active:scale-90 transition-all cursor-pointer shadow-xs"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector (Sign In / Register) */}
        {activeView !== 'forgot-password' && (
          <div className="px-6 pt-4 shrink-0">
            <div className="flex rounded-xl bg-[var(--bg-surface-alt)] p-1 border border-[var(--border-light)]">
              <button
                type="button"
                id="auth-tab-signin"
                onClick={() => {
                  setActiveView('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeView === 'signin'
                    ? 'bg-[var(--primary)] text-[var(--text-inverse)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--primary-light)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="auth-tab-register"
                onClick={() => {
                  setActiveView('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeView === 'register'
                    ? 'bg-[var(--primary)] text-[var(--text-inverse)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--primary-light)]'
                }`}
              >
                Register
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)]"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-xs text-[var(--accent-green)]"
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: SIGN IN */}
          {activeView === 'signin' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ paddingLeft: '2.75rem' }}
                    className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-[var(--text-main)]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('forgot-password');
                      setForgotStep('request');
                      setForgotEmail(email);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ paddingLeft: '2.75rem' }}
                    className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-signin-submit"
                disabled={isSubmitting}
                className="btn-primary w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50 mt-2"
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

          {/* VIEW: REGISTER */}
          {activeView === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                >
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="off"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Full name"
                    style={{ paddingLeft: '2.75rem' }}
                    className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <User
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ paddingLeft: '2.75rem' }}
                    className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                >
                  Phone Number (India +91) *
                </label>
                <div className="relative">
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    required
                    autoComplete="off"
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value);
                      if (phoneFieldError) setPhoneFieldError(null);
                    }}
                    placeholder="10-digit mobile number"
                    style={{ paddingLeft: '2.75rem' }}
                    className={`input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none ${
                      phoneFieldError
                        ? 'border-[var(--accent-red)] focus:border-[var(--accent-red)]'
                        : 'border-[var(--border-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]'
                    }`}
                  />
                  <Phone
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
                {phoneFieldError && (
                  <p className="text-xs text-[var(--accent-red)] font-semibold mt-1">
                    {phoneFieldError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                >
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ paddingLeft: '2.75rem' }}
                    className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-address"
                  className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                >
                  Delivery Address (Optional)
                </label>
                <div className="relative">
                  <textarea
                    id="reg-address"
                    name="address"
                    rows={2}
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="House/Apt, Street, City, Pincode"
                    style={{ paddingLeft: '2.75rem' }}
                    className="input-field w-full p-2.5 pl-11 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none"
                  />
                  <MapPin
                    size={15}
                    className="absolute left-3.5 top-3 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-register-submit"
                disabled={isSubmitting}
                className="btn-primary w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50 mt-2"
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

          {/* VIEW: FORGOT PASSWORD (3 STEPS) */}
          {activeView === 'forgot-password' && (
            <div className="space-y-4">
              {/* Step 1: Request Code */}
              {forgotStep === 'request' && (
                <form onSubmit={handleRequestResetCode} className="space-y-3">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                    >
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="forgot-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={{ paddingLeft: '2.75rem' }}
                        className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="forgot-request-submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Send Reset Code</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('signin');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] cursor-pointer transition-colors"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verify Code */}
              {forgotStep === 'verify' && (
                <form onSubmit={handleVerifyResetCode} className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="forgot-otp"
                        className="text-xs font-semibold text-[var(--text-main)]"
                      >
                        6-Digit Code sent to {forgotEmail}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('request');
                          setForgotOtp('');
                          setErrorMsg(null);
                        }}
                        className="text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="forgot-otp"
                        name="otp"
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        autoComplete="off"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="input-field w-full h-11 text-center tracking-widest text-base font-bold rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <KeyRound
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="forgot-verify-submit"
                    disabled={isSubmitting || forgotOtp.length !== 6}
                    className="btn-primary w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <CheckCircle2 size={14} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('signin');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] cursor-pointer transition-colors"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>

                    {otpCountdown > 0 ? (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Resend in {otpCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestResetCode}
                        disabled={isSubmitting}
                        className="text-[11px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Step 3: Set New Password */}
              {forgotStep === 'new-password' && (
                <form onSubmit={handleConfirmNewPassword} className="space-y-3">
                  <div>
                    <label
                      htmlFor="forgot-new-password"
                      className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                    >
                      New Password (min 6 chars)
                    </label>
                    <div className="relative">
                      <input
                        id="forgot-new-password"
                        name="newPassword"
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your password"
                        style={{ paddingLeft: '2.75rem' }}
                        className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="forgot-confirm-password"
                      className="block text-xs font-semibold text-[var(--text-main)] mb-1"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="forgot-confirm-password"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        style={{ paddingLeft: '2.75rem' }}
                        className="input-field w-full h-10 pl-11 pr-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="forgot-reset-submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-btn disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('signin');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] cursor-pointer transition-colors"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
