'use client';

// =============================================================================
// Checkout Page — /checkout
// Server-Verified WhatsApp Order Flow
// Refactored per REQUIREMENT_AND_REFACTOR_PART_2.md Section R4 & R5
// =============================================================================

import { useState, useEffect, useReducer, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  MessageCircle,
  MapPin,
  Check,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { getColorName } from '@/lib/colors';
import type { CourierOption } from '@/types';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
];

const FORM_STORAGE_KEY = 'ficcado-checkout-form-draft';

function generateSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return `sub_${Date.now()}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `sub_${Date.now()}_${Date.now().toString(36)}`;
}

interface FormFields {
  fullName: string;
  mobile: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormFields; value: string }
  | { type: 'RESTORE_DRAFT'; payload: Partial<FormFields> };

function formReducer(state: FormFields, action: FormAction): FormFields {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESTORE_DRAFT':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalAmount, clearCart, syncPrices } = useCart();
  const { showToast } = useToast();

  const [priceChangeNotice, setPriceChangeNotice] = useState<string | null>(null);

  const [form, dispatch] = useReducer(formReducer, {
    fullName: '',
    mobile: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Kerala',
    pincode: '',
    landmark: '',
  });

  const { fullName, mobile, email, addressLine1, addressLine2, city, state, pincode, landmark } = form;

  const setFullName = (v: string) => dispatch({ type: 'SET_FIELD', field: 'fullName', value: v });
  const setMobile = (v: string) => dispatch({ type: 'SET_FIELD', field: 'mobile', value: v });
  const setEmail = (v: string) => dispatch({ type: 'SET_FIELD', field: 'email', value: v });
  const setAddressLine1 = (v: string) => dispatch({ type: 'SET_FIELD', field: 'addressLine1', value: v });
  const setAddressLine2 = (v: string) => dispatch({ type: 'SET_FIELD', field: 'addressLine2', value: v });
  const setCity = (v: string) => dispatch({ type: 'SET_FIELD', field: 'city', value: v });
  const setState = (v: string) => dispatch({ type: 'SET_FIELD', field: 'state', value: v });
  const setPincode = (v: string) => dispatch({ type: 'SET_FIELD', field: 'pincode', value: v });
  const setLandmark = (v: string) => dispatch({ type: 'SET_FIELD', field: 'landmark', value: v });

  // Restore saved form draft after client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormFields>;
        dispatch({ type: 'RESTORE_DRAFT', payload: parsed });
      }
    } catch {
      // Ignore error
    }
  }, []);

  // Courier Options State (Dynamic from Google Sheets)
  const [courierOptions, setCourierOptions] = useState<CourierOption[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [isLoadingDelivery, setIsLoadingDelivery] = useState<boolean>(true);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronous lock & persistent session submission ID to prevent race conditions or duplicate submissions
  const isSubmittingRef = useRef<boolean>(false);
  const [submissionId] = useState<string>(generateSubmissionId);

  // Inline Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stable references for initial mount fetch
  const syncPricesRef = useRef(syncPrices);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    syncPricesRef.current = syncPrices;
    showToastRef.current = showToast;
  }, [syncPrices, showToast]);

  // Fetch active courier options from /api/delivery-options and revalidate prices ONCE on mount
  useEffect(() => {
    let isMounted = true;

    async function loadDeliveryOptions() {
      try {
        setIsLoadingDelivery(true);
        const res = await fetch('/api/delivery-options');
        if (res.ok) {
          const json = await res.json();
          const data: CourierOption[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.options)
              ? json.options
              : Array.isArray(json?.data)
                ? json.data
                : [];
          if (isMounted) {
            setCourierOptions(data);
            if (data.length > 0) {
              setSelectedCourierId((prev) => (prev && data.some((o) => o.id === prev) ? prev : data[0].id));
            }
          }
        }
      } catch (err) {
        console.warn('[Checkout] Failed to load delivery options:', err);
      } finally {
        if (isMounted) setIsLoadingDelivery(false);
      }
    }

    async function revalidateCartPrices() {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const json = await res.json();
          const products = Array.isArray(json) ? json : json?.data || [];
          if (Array.isArray(products) && products.length > 0 && isMounted) {
            const result = syncPricesRef.current(products);
            if (result.changed) {
              const notice = `Price update: ${result.changes
                .map((c) => `${c.name} is now ₹${c.newPrice} (was ₹${c.oldPrice})`)
                .join(', ')}. Your total has been updated.`;
              setPriceChangeNotice(notice);
              showToastRef.current(notice, 'info');
            }
          }
        }
      } catch (err) {
        console.warn('[Checkout] Failed to revalidate prices:', err);
      }
    }

    loadDeliveryOptions();
    revalidateCartPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save form draft on change (B-25: strictly gated on affirmative preferences consent)
  useEffect(() => {
    try {
      const consentRaw = localStorage.getItem('ficcado-consent');
      if (!consentRaw) {
        // Zero storage before consent decision
        return;
      }
      const parsed = JSON.parse(consentRaw);
      if (parsed.preferences !== true) {
        localStorage.removeItem(FORM_STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify({
          fullName,
          mobile,
          email,
          addressLine1,
          addressLine2,
          city,
          state,
          pincode,
          landmark,
        }),
      );
    } catch {
      // Ignore quota errors
    }
  }, [fullName, mobile, email, addressLine1, addressLine2, city, state, pincode, landmark]);

  const selectedCourier = courierOptions.find((c) => c.id === selectedCourierId) || null;
  const deliveryCharge = selectedCourier ? selectedCourier.rate : 0;
  const grandTotal = subtotalAmount + deliveryCharge;
  const hasActiveCouriers = courierOptions.length > 0;

  function cleanIndianMobile(val: string): string {
    let digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits;
  }

  function cleanPincode(val: string): string {
    return val.replace(/\D/g, '').trim();
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Full name is required (at least 2 characters).';
    }

    const cleanMobile = cleanIndianMobile(mobile);
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      errs.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address.';
    }

    if (!addressLine1.trim() || addressLine1.trim().length < 3) {
      errs.addressLine1 = 'House/Flat, building, and street address is required.';
    }

    if (!city.trim() || city.trim().length < 2) {
      errs.city = 'City is required.';
    }

    const cleanPin = cleanPincode(pincode);
    if (!cleanPin || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      errs.pincode = 'Enter a valid 6-digit Indian PIN code.';
    }

    if (!state.trim()) {
      errs.state = 'Please select your state.';
    }

    if (!selectedCourierId) {
      errs.delivery = 'Please select a delivery option.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handlePlaceOrder() {
    if (isSubmittingRef.current || isSubmitting) return;

    if (items.length === 0) {
      showToast('Your shopping bag is empty. Please add items first.', 'error');
      router.push('/');
      return;
    }

    if (!hasActiveCouriers || !selectedCourier) {
      showToast('Delivery options are currently unavailable. Please contact us on WhatsApp.', 'error');
      return;
    }

    if (!agreedToTerms) {
      showToast('Please agree to Ficcado Terms & Conditions to place order', 'error');
      return;
    }

    if (!validateForm()) {
      showToast('Please complete all required delivery details', 'error');
      return;
    }

    // Synchronously lock submission against rapid duplicate clicks
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const currentSubmissionId = submissionId || generateSubmissionId();

      const payload = {
        submission_id: currentSubmissionId,
        customer: {
          fullName: fullName.trim(),
          mobile: cleanIndianMobile(mobile),
          email: email.trim(),
        },
        address: {
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || '',
          city: city.trim(),
          state: state.trim(),
          pincode: cleanPincode(pincode),
          landmark: landmark.trim() || '',
        },
        courier_partner_id: selectedCourier.id,
        items: items.map((i) => ({
          id: i.id,
          size: i.size || 'M',
          color: i.color || 'Standard',
          qty: i.qty || 1,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          throw new Error('Too many order attempts from your network. Please wait a few minutes before trying again.');
        }
        const errorMsg = data.error?.message || data.error || 'Server could not process your order.';
        const fieldKey = data.error?.field || data.field;
        if (fieldKey) {
          const cleanKey = fieldKey.includes('.') ? fieldKey.split('.').pop()! : fieldKey;
          setErrors((prev) => ({
            ...prev,
            [cleanKey]: errorMsg,
          }));
        }
        throw new Error(errorMsg);
      }

      const orderPayload = data.data || data;

      // Order successfully verified and recorded
      try {
        sessionStorage.setItem(
          'ficcado-last-order',
          JSON.stringify({
            referenceId: orderPayload.referenceId,
            whatsappUrl: orderPayload.whatsappUrl,
            total: orderPayload.total,
            subtotal: orderPayload.subtotal,
            deliveryCharge: orderPayload.deliveryCharge,
            isOffline: orderPayload.isOffline,
          }),
        );
      } catch (e) {
        console.warn('Failed to save order in sessionStorage', e);
      }

      // Clear the Bag and form draft only after confirmed server creation (B-25)
      clearCart();
      try {
        localStorage.removeItem(FORM_STORAGE_KEY);
      } catch { }

      // Launch WhatsApp
      try {
        window.open(orderPayload.whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // Handled by continuation page
      }

      // Navigate to continuation page (do not reset isSubmittingRef to prevent late double-clicks)
      router.push('/checkout/whatsapp-continue');
    } catch (err) {
      console.error('[Checkout] Error creating order:', err);
      showToast((err as Error).message || 'Failed to place order. Please try again.', 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div id="checkout-page" className="flex flex-col min-h-full" style={{ background: 'var(--bg-app)' }}>
      {/* Mobile Top Header */}
      <header
        className="flex md:hidden items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="btn-icon"
          aria-label="Back to store"
        >
          <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
        </button>
        <h1 className="flex-1 text-base font-800 text-[var(--text-main)]">
          Checkout & WhatsApp Order
        </h1>
      </header>

      {/* Desktop Heading Banner */}
      <div className="hidden md:block mb-6 px-4 md:px-0 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#128C7E] bg-[#E8F8F5] px-2.5 py-0.5 rounded-full border border-[#25D366]/30">
            WhatsApp Fulfillment Flow
          </span>
          <span className="text-xs text-[var(--text-muted)] font-medium">Step 1 of 2</span>
        </div>
        <h1 className="text-3xl font-900 text-[var(--text-main)] tracking-tight">
          Delivery Details & Order Verification
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-0 pb-16 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Form & Courier Selection */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Address Card */}
            <div className="card p-5 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
                <MapPin size={18} className="text-[var(--primary)]" />
                <h2 className="text-base font-800 text-[var(--text-main)]">
                  1. Delivery Address
                </h2>
              </div>

              {/* Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="checkout-name" className="text-xs font-bold text-[var(--text-main)]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    className={`input-field text-xs md:text-sm ${errors.fullName ? 'border-red-500' : ''}`}
                  />
                  {errors.fullName && <p className="text-[11px] text-red-500">{errors.fullName}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-mobile" className="text-xs font-bold text-[var(--text-main)]">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-mobile"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: '' }));
                    }}
                    className={`input-field text-xs md:text-sm ${errors.mobile ? 'border-red-500' : ''}`}
                  />
                  {errors.mobile && <p className="text-[11px] text-red-500">{errors.mobile}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="checkout-email" className="text-xs font-bold text-[var(--text-main)]">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  className={`input-field text-xs md:text-sm ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-[11px] text-red-500">{errors.email}</p>}
              </div>

              {/* Address Line 1 */}
              <div className="space-y-1">
                <label htmlFor="checkout-address1" className="text-xs font-bold text-[var(--text-main)]">
                  House / Flat / Block / Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="checkout-address1"
                  type="text"
                  required
                  autoComplete="address-line1"
                  placeholder="Flat, house no., building, street"
                  value={addressLine1}
                  onChange={(e) => {
                    setAddressLine1(e.target.value);
                    if (errors.addressLine1) setErrors((prev) => ({ ...prev, addressLine1: '' }));
                  }}
                  className={`input-field text-xs md:text-sm ${errors.addressLine1 ? 'border-red-500' : ''}`}
                />
                {errors.addressLine1 && <p className="text-[11px] text-red-500">{errors.addressLine1}</p>}
              </div>

              {/* Address Line 2 */}
              <div className="space-y-1">
                <label htmlFor="checkout-address2" className="text-xs font-bold text-[var(--text-main)]">
                  Area / Locality / Sector (Optional)
                </label>
                <input
                  id="checkout-address2"
                  type="text"
                  autoComplete="address-line2"
                  placeholder="Area, colony, sector"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="input-field text-xs md:text-sm"
                />
              </div>

              {/* City, State, PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="checkout-city" className="text-xs font-bold text-[var(--text-main)]">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    placeholder="City"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                    }}
                    className={`input-field text-xs md:text-sm ${errors.city ? 'border-red-500' : ''}`}
                  />
                  {errors.city && <p className="text-[11px] text-red-500">{errors.city}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-state" className="text-xs font-bold text-[var(--text-main)]">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="checkout-state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="input-field text-xs md:text-sm h-10.5 bg-[var(--bg-surface-alt)] cursor-pointer"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-pincode" className="text-xs font-bold text-[var(--text-main)]">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-pincode"
                    type="text"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="6-digit PIN code"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                    }}
                    className={`input-field text-xs md:text-sm ${errors.pincode ? 'border-red-500' : ''}`}
                  />
                  {errors.pincode && <p className="text-[11px] text-red-500">{errors.pincode}</p>}
                </div>
              </div>

              {/* Landmark */}
              <div className="space-y-1">
                <label htmlFor="checkout-landmark" className="text-xs font-bold text-[var(--text-main)]">
                  Landmark (Optional)
                </label>
                <input
                  id="checkout-landmark"
                  type="text"
                  placeholder="Nearby landmark"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="input-field text-xs md:text-sm"
                />
              </div>
            </div>

            {/* Delivery Courier Partner Selection Card */}
            <div className="card p-5 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
                <Truck size={18} className="text-[var(--primary)]" />
                <h2 className="text-base font-800 text-[var(--text-main)]">
                  2. Delivery Option
                </h2>
              </div>

              {isLoadingDelivery ? (
                <div className="space-y-3 p-1">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface-alt)] flex items-center justify-between gap-3 animate-fade-in"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full skeleton shrink-0" />
                        <div className="space-y-1.5">
                          <div className="w-28 sm:w-36 h-4 rounded skeleton" />
                          <div className="w-20 sm:w-24 h-3 rounded skeleton" />
                        </div>
                      </div>
                      <div className="w-16 h-5 rounded-full skeleton" />
                    </div>
                  ))}
                </div>
              ) : !hasActiveCouriers ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle size={16} className="text-amber-700 shrink-0" />
                    <span>Delivery options are currently unavailable.</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Please contact us on WhatsApp to check delivery options and place your order directly.
                  </p>
                  <a
                    href="https://wa.me/916282000729?text=Hello%20Ficcado%20team%2C%20I%20would%20like%20to%20place%20an%20order%20and%20check%20delivery%20options."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#128C7E] hover:underline pt-1"
                  >
                    <MessageCircle size={14} />
                    <span>Contact Ficcado on WhatsApp &rarr;</span>
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {courierOptions.map((opt) => {
                    const isSelected = selectedCourierId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedCourierId(opt.id)}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${isSelected
                            ? 'border-[var(--primary)] bg-[var(--primary-light)]/30 shadow-xs'
                            : 'border-[var(--border-light)] hover:border-gray-300 bg-[var(--bg-surface-alt)]'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[var(--text-main)]">{opt.name}</p>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          {opt.deliveryTime && (
                            <p className="text-[11px] text-[var(--text-muted)]">{opt.deliveryTime}</p>
                          )}
                        </div>

                        <div className="pt-2 font-black text-xs text-[var(--primary)]">
                          {opt.rate === 0 ? 'Free' : `+₹${opt.rate.toLocaleString('en-IN')}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order CTA */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="card p-5 md:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[var(--primary)]" />
                  <h3 className="text-base font-800 text-[var(--text-main)]">Order Summary</h3>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {items.reduce((a, i) => a + i.qty, 0)} Items
                </span>
              </div>

              {priceChangeNotice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300 animate-fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  <p>{priceChangeNotice}</p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto no-scrollbar">
                {items.map((item, idx) => (
                  <div
                    key={`${item.id}-${item.size}-${item.color}-${idx}`}
                    className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-light)]/60"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-[var(--text-main)] line-clamp-1">{item.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>Size: {item.size}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 align-middle"
                            style={{ background: item.color }}
                          />
                          <span>Color: {item.colorName || getColorName(item.color)}</span>
                        </span>
                        <span>•</span>
                        <span>Qty: {item.qty}</span>
                      </p>
                    </div>
                    <span className="font-bold text-[var(--text-main)] shrink-0">
                      ₹{(item.price * item.qty).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Items Subtotal</span>
                  <span className="font-semibold text-[var(--text-main)]">
                    ₹{subtotalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">
                    Delivery {selectedCourier ? `(${selectedCourier.name})` : ''}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {selectedCourier
                      ? selectedCourier.rate === 0
                        ? 'Free'
                        : `₹${selectedCourier.rate.toLocaleString('en-IN')}`
                      : 'Unavailable'}
                  </span>
                </div>
                <div className="border-t border-[var(--border-light)] pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-800 text-[var(--text-main)]">Total Amount</span>
                  <span className="text-xl font-900 text-[var(--primary)]">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2 border-t border-[var(--border-light)]">
                <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    id="checkout-terms-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)] cursor-pointer shrink-0"
                  />
                  <span className="leading-tight">
                    I agree to Ficcado&apos;s{' '}
                    <Link href="/terms" target="_blank" className="font-bold text-[var(--primary)] hover:underline">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/returns-refunds" target="_blank" className="font-bold text-[var(--primary)] hover:underline">
                      Returns Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {/* Place Order CTA */}
              <button
                id="place-order-whatsapp-btn"
                type="button"
                onClick={handlePlaceOrder}
                disabled={items.length === 0 || isSubmitting || !hasActiveCouriers || !selectedCourier}
                aria-busy={isSubmitting}
                className={`w-full py-4 px-6 rounded-2xl text-xs md:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSubmitting ? 'pointer-events-none cursor-wait opacity-80' : ''
                }`}
                style={{
                  background:
                    items.length === 0 || isSubmitting || !hasActiveCouriers || !selectedCourier
                      ? '#9CA3AF'
                      : '#25D366',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Preparing your order...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} />
                    <span>Place Order — ₹{grandTotal.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center space-y-1.5">
                <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
                  <span>💬 You&apos;ll continue and confirm your order on WhatsApp</span>
                </p>
                <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                  By placing this order, you agree to our{' '}
                  <Link href="/terms" className="underline hover:text-zinc-300">
                    Terms
                  </Link>{' '}
                  and acknowledge our{' '}
                  <Link href="/privacy" className="underline hover:text-zinc-300">
                    Privacy Policy
                  </Link>
                  . Your contact & shipping details are used solely to fulfill delivery and confirm your order via WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
