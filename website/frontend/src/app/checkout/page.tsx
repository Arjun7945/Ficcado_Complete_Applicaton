'use client';

// =============================================================================
// Checkout Page — /checkout
// Authenticated Checkout Flow with Saved Addresses & Server-Verified Pricing
// Phase P2-6 Refactor per Part 2 Specifications & Audit Decisions
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
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
  CreditCard,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useModal } from '@/context/ModalContext';
import { getColorName } from '@/lib/colors';
import { createPaymentOrder, verifyPayment, CreatePaymentOrderPayload } from '@/lib/api/payments';
import {
  CustomerAddress,
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress,
} from '@/lib/api/auth';
import type { CourierOption, RazorpayOptions, RazorpaySuccessResponse } from '@/types';

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

function parseAddressString(fullAddress: string): {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
} {
  const pincodeMatch = fullAddress.match(/\b([1-9][0-9]{5})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : '682001';

  let remaining = fullAddress.replace(/[-–—]?\s*\b[1-9][0-9]{5}\b/g, '').trim();

  let foundState = 'Kerala';
  for (const st of INDIAN_STATES) {
    const stateRegex = new RegExp(`[,\\s]${st}\\s*$`, 'i');
    if (stateRegex.test(remaining)) {
      foundState = st;
      remaining = remaining.replace(stateRegex, '').trim();
      break;
    }
  }

  const parts = remaining.split(',').map((p) => p.trim()).filter(Boolean);
  let city = 'Kochi';
  let addressLine1 = fullAddress;

  if (parts.length >= 2) {
    city = parts.pop()!;
    addressLine1 = parts.join(', ');
  } else if (parts.length === 1) {
    city = parts[0];
    addressLine1 = parts[0];
  }

  return {
    addressLine1: addressLine1.slice(0, 200),
    addressLine2: '',
    city: city.slice(0, 100),
    state: foundState,
    pincode: pincode.slice(0, 6),
    landmark: '',
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalAmount, clearCart, syncPrices } = useCart();
  const { showToast } = useToast();
  const {
    customer,
    isAuthenticated,
    isLoading: isAuthLoading,
    refreshProfile,
    pauseSession,
    resumeSession,
  } = useCustomerAuth();
  const { openModal } = useModal();

  const [priceChangeNotice, setPriceChangeNotice] = useState<string | null>(null);

  // Saved Addresses State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(true);
  const [isDeletingAddressId, setIsDeletingAddressId] = useState<number | null>(null);

  // New Address Inline Form State
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(false);
  const [newStreet, setNewStreet] = useState<string>('');
  const [newLandmark, setNewLandmark] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [newState, setNewState] = useState<string>('Kerala');
  const [newPincode, setNewPincode] = useState<string>('');
  const [newIsDefault, setNewIsDefault] = useState<boolean>(false);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);
  const [addressFormErrors, setAddressFormErrors] = useState<Record<string, string>>({});

  // Courier Options State
  const [courierOptions, setCourierOptions] = useState<CourierOption[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [isLoadingDelivery, setIsLoadingDelivery] = useState<boolean>(true);

  // Submission & Agreement States
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const [submissionId] = useState<string>(generateSubmissionId);

  // Stable references
  const syncPricesRef = useRef(syncPrices);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    syncPricesRef.current = syncPrices;
    showToastRef.current = showToast;
  }, [syncPrices, showToast]);

  // Load addresses from customer or API
  const loadAddresses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingAddresses(true);
      const list = await getCustomerAddresses();
      setAddresses(list);
      if (list.length > 0) {
        setSelectedAddressId((prev) => {
          if (prev && list.some((a) => a.id === prev)) return prev;
          const defaultAddr = list.find((a) => a.isDefault);
          return defaultAddr ? defaultAddr.id : list[0].id;
        });
        setIsAddingNewAddress(false);
      } else {
        setIsAddingNewAddress(true);
      }
    } catch (err) {
      console.warn('[Checkout] Failed to load saved addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated, loadAddresses]);

  // Fetch active courier options from /api/delivery-options and revalidate cart prices on mount
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

  const selectedCourier = courierOptions.find((c) => c.id === selectedCourierId) || null;
  const deliveryCharge = selectedCourier ? selectedCourier.rate : 0;
  const grandTotal = subtotalAmount + deliveryCharge;
  const hasActiveCouriers = courierOptions.length > 0;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  // Handle Saving New Address
  async function handleSaveNewAddress(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!newStreet.trim() || newStreet.trim().length < 5) {
      errs.street = 'Street address must be at least 5 characters.';
    }
    if (!newCity.trim() || newCity.trim().length < 2) {
      errs.city = 'City is required.';
    }
    const cleanPin = newPincode.replace(/\D/g, '').trim();
    if (!cleanPin || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      errs.pincode = 'Enter a valid 6-digit Indian PIN code.';
    }
    if (!newState.trim()) {
      errs.state = 'Please select a state.';
    }

    if (addresses.length >= 10) {
      errs.general = 'Maximum 10 saved addresses reached. Please delete an older address first.';
    }

    setAddressFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const formattedAddress = [
      newStreet.trim(),
      newLandmark.trim(),
      `${newCity.trim()}, ${newState.trim()} - ${cleanPin}`,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      setIsSavingAddress(true);
      const saved = await addCustomerAddress(formattedAddress, newIsDefault || addresses.length === 0);
      if (saved) {
        showToast('Delivery address saved successfully', 'success');
        setNewStreet('');
        setNewLandmark('');
        setNewCity('');
        setNewPincode('');
        setNewIsDefault(false);
        setIsAddingNewAddress(false);
        await refreshProfile();
        await loadAddresses();
        setSelectedAddressId(saved.id);
      } else {
        showToast('Failed to save address. Please try again.', 'error');
      }
    } catch (err) {
      showToast((err as Error).message || 'Failed to save address', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  }

  // Handle Delete Address
  async function handleDeleteAddress(addressId: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      setIsDeletingAddressId(addressId);
      const ok = await deleteCustomerAddress(addressId);
      if (ok) {
        showToast('Address removed', 'info');
        await refreshProfile();
        await loadAddresses();
      } else {
        showToast('Failed to delete address', 'error');
      }
    } catch (err) {
      showToast((err as Error).message || 'Error removing address', 'error');
    } finally {
      setIsDeletingAddressId(null);
    }
  }

  // Handle WhatsApp Order Placement
  async function handlePlaceOrder() {
    if (isSubmittingRef.current || isSubmitting) return;

    if (items.length === 0) {
      showToast('Your shopping bag is empty. Please add items first.', 'error');
      router.push('/');
      return;
    }

    if (!selectedAddress) {
      showToast('Please select or add a delivery address to proceed.', 'error');
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

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const parsedAddr = parseAddressString(selectedAddress.address);
      const currentSubmissionId = submissionId || generateSubmissionId();

      const payload = {
        submission_id: currentSubmissionId,
        customer: {
          fullName: customer?.name || 'Ficcado Customer',
          mobile: customer?.phone || '',
          email: customer?.email || '',
        },
        address: {
          addressLine1: parsedAddr.addressLine1,
          addressLine2: parsedAddr.addressLine2,
          city: parsedAddr.city,
          state: parsedAddr.state,
          pincode: parsedAddr.pincode,
          landmark: parsedAddr.landmark,
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
        throw new Error(errorMsg);
      }

      const orderPayload = data.data || data;

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

      clearCart();

      try {
        window.open(orderPayload.whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // Continue to fallback
      }

      router.push('/checkout/whatsapp-continue');
    } catch (err) {
      console.error('[Checkout] Error creating order:', err);
      showToast((err as Error).message || 'Failed to place order. Please try again.', 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // Handle Online Payment (Razorpay)
  async function handleRazorpayPayment() {
    if (isSubmittingRef.current || isSubmitting) return;

    if (items.length === 0) {
      showToast('Your shopping bag is empty. Please add items first.', 'error');
      router.push('/');
      return;
    }

    if (!selectedAddress) {
      showToast('Please select or add a delivery address to proceed.', 'error');
      return;
    }

    if (!hasActiveCouriers || !selectedCourier) {
      showToast('Delivery options are currently unavailable.', 'error');
      return;
    }

    if (!agreedToTerms) {
      showToast('Please agree to Ficcado Terms & Conditions to place order', 'error');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Pause customer session timer during checkout (up to 15 minutes)
      await pauseSession(15);

      // 1. Create order with Ficcado-Payment-Gateway-Data
      const orderPayload: CreatePaymentOrderPayload = {
        amount: grandTotal,
        currency: 'INR',
        customerId: customer?.id,
        customerName: customer?.name || 'Ficcado Customer',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        shippingAddress: selectedAddress.address,
        deliveryCharge: deliveryCharge,
        courierPartner: selectedCourier.name,
        items: items.map((i) => ({
          itemId: typeof i.id === 'number' ? i.id : undefined,
          itemName: i.name || 'Ficcado Streetwear Tee',
          size: i.size || 'M',
          quantity: i.qty || 1,
          priceEach: i.price,
        })),
      };

      const orderRes = await createPaymentOrder(orderPayload);
      if (!orderRes.success || !orderRes.orderId) {
        await resumeSession();
        throw new Error('Could not initialize payment order. Please try again.');
      }

      // 2. Load Razorpay Checkout Script
      const loadRazorpayScript = () => {
        return new Promise<boolean>((resolve) => {
          if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        await resumeSession();
        throw new Error('Payment gateway is currently unavailable. Please reload the page or contact support.');
      }

      // 3. Open Razorpay Checkout Modal
      const options: RazorpayOptions = {
        key: orderRes.keyId,
        amount: orderRes.amountInPaise,
        currency: orderRes.currency,
        name: 'Ficcado',
        description: 'High Quality 240 GSM Unisex Wears',
        image: '/images/brand_logo/Ficcado Brand Logo.jpeg',
        order_id: orderRes.orderId,
        prefill: {
          name: customer?.name || '',
          email: customer?.email || '',
          contact: customer?.phone || '',
        },
        theme: {
          color: '#2B62C6',
        },
        handler: async function (response: RazorpaySuccessResponse) {
          try {
            const verifyRes = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.verified) {
              clearCart();
              sessionStorage.setItem(
                'ficcado-last-confirmed-order',
                JSON.stringify({
                  invoiceNumber: verifyRes.invoiceNumber || `FIC-INV-${Date.now()}`,
                  transactionId: verifyRes.transactionId || response.razorpay_payment_id,
                  total: grandTotal,
                  subtotal: subtotalAmount,
                  deliveryCharge,
                  customerName: customer?.name || '',
                  customerEmail: customer?.email || '',
                  customerPhone: customer?.phone || '',
                  shippingAddress: selectedAddress.address,
                }),
              );
              router.push('/checkout/confirmation');
            } else {
              await resumeSession();
              showToast(verifyRes.message || 'Payment verification failed', 'error');
              isSubmittingRef.current = false;
              setIsSubmitting(false);
            }
          } catch (err) {
            await resumeSession();
            showToast((err as Error).message || 'Error confirming payment', 'error');
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: async function () {
            await resumeSession();
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            showToast('Payment window closed', 'info');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('[Checkout] Razorpay error:', err);
      showToast((err as Error).message || 'Payment failed to initialize', 'error');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // Guest Auth Guard Gate
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div id="checkout-auth-guard" className="flex flex-col min-h-[70vh] items-center justify-center px-4 py-12" style={{ background: 'var(--bg-app)' }}>
        <div className="card max-w-lg w-full p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-sm text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] mx-auto">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
              Verified Checkout Only
            </span>
            <h1 className="text-2xl md:text-3xl font-900 text-[var(--text-main)] tracking-tight">
              Customer Log In Required
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              Please sign in to your Ficcado customer account to access your saved delivery addresses and securely place your order.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-left flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[var(--primary)]" />
              <span className="text-xs font-bold text-[var(--text-main)]">
                {items.reduce((acc, i) => acc + i.qty, 0)} Items in Bag
              </span>
            </div>
            <span className="text-sm font-black text-[var(--primary)]">
              ₹{subtotalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="checkout-login-trigger-btn"
              type="button"
              onClick={() => openModal('authModal')}
              className="w-full py-4 px-6 rounded-2xl text-xs md:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer hover:opacity-95"
              style={{ background: 'var(--primary, #2B62C6)' }}
            >
              <User size={18} />
              <span>Log in with Ficcado Account</span>
            </button>

            <button
              id="checkout-back-to-cart-btn"
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 rounded-2xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              Back to Shopping
            </button>
          </div>
        </div>
      </div>
    );
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
          Ficcado Checkout
        </h1>
      </header>

      {/* Desktop Heading Banner */}
      <div className="hidden md:block mb-6 px-4 md:px-0 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--primary)]/20">
            Secure Customer Checkout
          </span>
          <span className="text-xs text-[var(--text-muted)] font-medium">Step 1 of 2</span>
        </div>
        <h1 className="text-3xl font-900 text-[var(--text-main)] tracking-tight">
          Delivery Details & Payment Verification
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-0 pb-16 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Customer Profile & Addresses & Delivery */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Verified Account Summary Card */}
            <div id="checkout-verified-account-card" className="card p-5 md:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <h2 className="text-base font-800 text-[var(--text-main)]">
                    1. Verified Customer Account
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Check size={10} strokeWidth={3} />
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Customer Name</span>
                  <p id="checkout-customer-name" className="text-xs font-bold text-[var(--text-main)] mt-0.5 truncate">
                    {customer?.name || 'Ficcado Customer'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Verified Phone</span>
                  <p id="checkout-customer-phone" className="text-xs font-bold text-[var(--text-main)] mt-0.5 truncate">
                    +91 {customer?.phone || '—'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Email Address</span>
                  <p id="checkout-customer-email" className="text-xs font-bold text-[var(--text-main)] mt-0.5 truncate">
                    {customer?.email || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Saved Delivery Addresses Card */}
            <div id="checkout-delivery-addresses-card" className="card p-5 md:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-[var(--primary)]" />
                  <h2 className="text-base font-800 text-[var(--text-main)]">
                    2. Delivery Address
                  </h2>
                </div>
                {addresses.length > 0 && !isAddingNewAddress && (
                  <button
                    id="checkout-toggle-add-address-btn"
                    type="button"
                    onClick={() => setIsAddingNewAddress(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {/* Saved Addresses List */}
              {isLoadingAddresses ? (
                <div className="space-y-3 p-1">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface-alt)] h-20 skeleton animate-pulse" />
                  ))}
                </div>
              ) : addresses.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      const isDeleting = isDeletingAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          id={`address-card-${addr.id}`}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 rounded-2xl border transition-all relative flex items-start justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-xs'
                              : 'border-[var(--border-light)] hover:border-gray-300 bg-[var(--bg-surface-alt)]'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                                    : 'border-zinc-400 bg-transparent'
                                }`}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-[var(--text-main)]">
                                  Delivery Destination
                                </p>
                                {addr.isDefault && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
                                {addr.address}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                            title="Delete address"
                            aria-label={`Delete address ${addr.id}`}
                          >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Add New Address Form */}
              {isAddingNewAddress && (
                <form
                  onSubmit={handleSaveNewAddress}
                  className="p-4 md:p-5 rounded-2xl border border-[var(--primary)]/30 bg-[var(--bg-surface-alt)] space-y-3.5 animate-fade-in"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-light)]">
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      {addresses.length === 0 ? 'Enter Delivery Address' : 'Add New Delivery Address'}
                    </span>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(false)}
                        className="text-[11px] text-[var(--text-muted)] hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {addressFormErrors.general && (
                    <p className="text-[11px] text-red-500">{addressFormErrors.general}</p>
                  )}

                  {/* Street */}
                  <div className="space-y-1">
                    <label htmlFor="new-address-street" className="text-xs font-bold text-[var(--text-main)]">
                      Flat / House / Building / Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-address-street"
                      type="text"
                      required
                      placeholder="e.g. Flat 4B, Palm Grove Apartment, MG Road"
                      value={newStreet}
                      onChange={(e) => {
                        setNewStreet(e.target.value);
                        if (addressFormErrors.street) setAddressFormErrors((prev) => ({ ...prev, street: '' }));
                      }}
                      className={`input-field text-xs md:text-sm ${addressFormErrors.street ? 'border-red-500' : ''}`}
                    />
                    {addressFormErrors.street && <p className="text-[11px] text-red-500">{addressFormErrors.street}</p>}
                  </div>

                  {/* Landmark */}
                  <div className="space-y-1">
                    <label htmlFor="new-address-landmark" className="text-xs font-bold text-[var(--text-main)]">
                      Nearby Landmark (Optional)
                    </label>
                    <input
                      id="new-address-landmark"
                      type="text"
                      placeholder="e.g. Near City Mall"
                      value={newLandmark}
                      onChange={(e) => setNewLandmark(e.target.value)}
                      className="input-field text-xs md:text-sm"
                    />
                  </div>

                  {/* City, State, PIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="new-address-city" className="text-xs font-bold text-[var(--text-main)]">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="new-address-city"
                        type="text"
                        required
                        placeholder="City"
                        value={newCity}
                        onChange={(e) => {
                          setNewCity(e.target.value);
                          if (addressFormErrors.city) setAddressFormErrors((prev) => ({ ...prev, city: '' }));
                        }}
                        className={`input-field text-xs md:text-sm ${addressFormErrors.city ? 'border-red-500' : ''}`}
                      />
                      {addressFormErrors.city && <p className="text-[11px] text-red-500">{addressFormErrors.city}</p>}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="new-address-state" className="text-xs font-bold text-[var(--text-main)]">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="new-address-state"
                        required
                        value={newState}
                        onChange={(e) => setNewState(e.target.value)}
                        className="input-field text-xs md:text-sm h-10.5 bg-[var(--bg-surface)] cursor-pointer"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="new-address-pincode" className="text-xs font-bold text-[var(--text-main)]">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="new-address-pincode"
                        type="text"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder="6-digit PIN"
                        value={newPincode}
                        onChange={(e) => {
                          setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          if (addressFormErrors.pincode) setAddressFormErrors((prev) => ({ ...prev, pincode: '' }));
                        }}
                        className={`input-field text-xs md:text-sm ${addressFormErrors.pincode ? 'border-red-500' : ''}`}
                      />
                      {addressFormErrors.pincode && <p className="text-[11px] text-red-500">{addressFormErrors.pincode}</p>}
                    </div>
                  </div>

                  {/* Default Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--text-secondary)] pt-1">
                    <input
                      type="checkbox"
                      id="new-address-is-default"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--primary)] cursor-pointer"
                    />
                    <span>Set as my default delivery address</span>
                  </label>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      id="save-new-address-btn"
                      type="submit"
                      disabled={isSavingAddress}
                      className="py-2.5 px-5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                      style={{ background: 'var(--primary, #2B62C6)' }}
                    >
                      {isSavingAddress ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Saving Address...</span>
                        </>
                      ) : (
                        <span>Save & Use Address</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Section 3: Delivery Option Selection Card */}
            <div id="checkout-courier-options-card" className="card p-5 md:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
                <Truck size={18} className="text-[var(--primary)]" />
                <h2 className="text-base font-800 text-[var(--text-main)]">
                  3. Delivery Option
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courierOptions.map((opt) => {
                    const isSelected = selectedCourierId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        id={`courier-option-${opt.id}`}
                        onClick={() => setSelectedCourierId(opt.id)}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-xs'
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
            <div id="checkout-order-summary-card" className="card p-5 md:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-sm space-y-4">
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

              {/* Online Payment Security Notice */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <ShieldCheck size={16} className="text-[var(--primary)] shrink-0" />
                <span className="font-semibold text-[11px] leading-tight">
                  Online Payment Only (Razorpay). No Cash on Delivery (COD) permitted.
                </span>
              </div>

              {/* Primary: Place Order & Pay Online with Razorpay */}
              <button
                id="place-order-razorpay-btn"
                type="button"
                onClick={handleRazorpayPayment}
                disabled={items.length === 0 || isSubmitting || !hasActiveCouriers || !selectedCourier || !selectedAddress}
                aria-busy={isSubmitting}
                className={`w-full py-4 px-6 rounded-2xl text-xs md:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSubmitting ? 'pointer-events-none cursor-wait opacity-80' : 'hover:opacity-95'
                }`}
                style={{
                  background:
                    items.length === 0 || isSubmitting || !hasActiveCouriers || !selectedCourier || !selectedAddress
                      ? '#9CA3AF'
                      : 'var(--primary, #2B62C6)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing Secure Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Pay Online with Razorpay — ₹{grandTotal.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>

              {/* Secondary: Place Order on WhatsApp */}
              <button
                id="place-order-whatsapp-btn"
                type="button"
                onClick={handlePlaceOrder}
                disabled={items.length === 0 || isSubmitting || !hasActiveCouriers || !selectedCourier || !selectedAddress}
                aria-busy={isSubmitting}
                className={`w-full py-3 px-4 rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSubmitting ? 'pointer-events-none cursor-wait opacity-80' : 'hover:opacity-95'
                }`}
                style={{
                  background:
                    items.length === 0 || isSubmitting || !hasActiveCouriers || !selectedCourier || !selectedAddress
                      ? '#9CA3AF'
                      : '#25D366',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Preparing order...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    <span>Order via WhatsApp Direct</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center space-y-1.5">
                <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
                  <span>💬 Official Ficcado verified order dispatch</span>
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
                  . Your contact & shipping details are used solely to fulfill delivery and confirm your order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
