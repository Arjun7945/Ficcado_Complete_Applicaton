'use client';

// =============================================================================
// Customer Account Page — /account
// Profile management, saved addresses, and live order tracking
// =============================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Package,
  MapPin,
  CheckCircle2,
  LogOut,
  ShoppingBag,
  Truck,
  Plus,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { CustomerOrder, getCustomerOrders, updateCustomerProfile } from '@/lib/api/auth';

type AccountTab = 'orders' | 'addresses' | 'profile';

export default function AccountPage() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading, logout, refreshProfile } = useCustomerAuth();
  const { openModal } = useModal();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AccountTab>('orders');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Address edit state
  const [newAddress, setNewAddress] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile edit fields
  useEffect(() => {
    if (customer) {
      setEditName(customer.name || '');
      setEditPhone(customer.phone || '');
    }
  }, [customer]);

  // Load orders when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingOrders(true);
      getCustomerOrders()
        .then((data) => setOrders(data))
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    showToast('Signed out of your account', 'info');
    router.push('/');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    setSavingAddress(true);
    try {
      const updated = await updateCustomerProfile({ address: newAddress.trim() });
      if (updated) {
        await refreshProfile();
        setNewAddress('');
        showToast('Address saved successfully', 'success');
      } else {
        showToast('Could not save address', 'error');
      }
    } catch {
      showToast('Error saving address', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      showToast('Please provide valid name and phone number', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateCustomerProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      if (updated) {
        await refreshProfile();
        showToast('Profile updated successfully', 'success');
      } else {
        showToast('Could not update profile', 'error');
      }
    } catch {
      showToast('Error updating profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('DELIVERED') || s.includes('PAID') || s.includes('COMPLETED')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
    if (s.includes('CANCELLED') || s.includes('FAILED') || s.includes('RETURNED')) {
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800';
    }
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Loading your account details...</p>
      </div>
    );
  }

  // Not authenticated view
  if (!isAuthenticated || !customer) {
    return (
      <div className="min-h-[70vh] max-w-lg mx-auto px-4 py-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] shadow-sm">
          <User size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-900 tracking-tight text-[var(--text-main)]">
            Customer Account
          </h1>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm">
            Sign in to track orders, save delivery addresses, and enjoy faster checkout for upcoming drops.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => openModal('authModal')}
            className="flex-1 h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all active:scale-95 shadow-btn cursor-pointer"
          >
            Sign In or Register
          </button>
          <Link
            href="/"
            className="flex-1 h-11 flex items-center justify-center rounded-xl bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-main)] transition-colors"
          >
            Explore Drops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div id="account-page" className="min-h-full pb-16 animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-[var(--border-light)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <span className="text-[var(--border-medium)] hidden sm:inline">/</span>
          <h1 className="text-lg font-900 tracking-tight text-[var(--text-main)]">
            Customer Account
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-white font-black text-xl shadow-xs">
            {customer.name?.charAt(0) || 'C'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-900 tracking-tight text-[var(--text-main)]">
                {customer.name}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                FIC-CUST-{customer.id}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {customer.email}
              {customer.emailVerified && (
                <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 size={12} /> Verified
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              +91 {customer.phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[var(--border-light)] pt-4 md:pt-0 md:pl-6">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Total Orders
            </p>
            <p className="text-2xl font-900 text-[var(--text-main)]">
              {customer.totalOrders || orders.length}
            </p>
          </div>
          <div className="space-y-0.5 ml-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Saved Addresses
            </p>
            <p className="text-2xl font-900 text-[var(--text-main)]">
              {customer.addresses?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[var(--bg-surface-alt)] p-1.5 border border-[var(--border-light)] max-w-md">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-white dark:bg-neutral-800 text-[var(--text-main)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <Package size={15} />
          <span>Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'addresses'
              ? 'bg-white dark:bg-neutral-800 text-[var(--text-main)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <MapPin size={15} />
          <span>Addresses ({customer.addresses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-neutral-800 text-[var(--text-main)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <User size={15} />
          <span>Profile</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="p-8 text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-[var(--primary)] mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-muted)]">Fetching your order history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-center space-y-3">
              <ShoppingBag size={36} className="text-[var(--text-muted)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--text-main)]">No orders placed yet</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                Once you place an order with online payment, you can track delivery and view invoices here.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors mt-2"
              >
                <span>Browse Latest Drops</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-light)]">
                    <div>
                      <p className="text-xs font-mono font-bold text-[var(--primary)]">
                        {order.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(order.deliveryStatus)}`}>
                        {order.deliveryStatus}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.lineItems?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-main)]">
                            {item.itemName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-alt)] font-bold text-[var(--text-muted)]">
                            {item.size}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            × {item.quantity}
                          </span>
                        </div>
                        <span className="font-bold text-[var(--text-main)]">
                          ₹{(item.priceEach * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Totals & Tracking */}
                  <div className="pt-3 border-t border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      {order.courierPartner && (
                        <p className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Truck size={14} className="text-[var(--primary)]" />
                          <span>Courier: {order.courierPartner}</span>
                          {order.trackingNumber && (
                            <span className="font-mono font-bold">({order.trackingNumber})</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)]">Total Amount:</span>
                      <span className="text-base font-900 text-[var(--text-main)]">
                        ₹{order.grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Saved Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.addresses && customer.addresses.length > 0 ? (
              customer.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      <MapPin size={14} className="text-[var(--primary)]" />
                      <span>Address #{addr.id}</span>
                    </span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                    {addr.address}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-center space-y-2">
                <MapPin size={32} className="text-[var(--text-muted)] mx-auto" />
                <p className="text-xs font-bold text-[var(--text-main)]">No saved addresses</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Add a delivery address below for quicker checkout.</p>
              </div>
            )}
          </div>

          {/* Add Address Form */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Plus size={16} className="text-[var(--primary)]" />
              <span>Add New Delivery Address</span>
            </h3>

            <form onSubmit={handleAddAddress} className="space-y-3">
              <textarea
                required
                rows={3}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Full address (House/Flat no., Building, Street name, Locality, City, State, Pincode)"
                className="w-full p-3 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
              />
              <button
                type="submit"
                disabled={savingAddress || !newAddress.trim()}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-btn disabled:opacity-50"
              >
                {savingAddress ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <span>Save Address</span>
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Profile Information */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] max-w-lg space-y-5">
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            Personal Information
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Email Address (Permanent)
              </label>
              <input
                type="email"
                disabled
                value={customer.email}
                className="w-full h-10 px-3.5 rounded-xl bg-gray-100 dark:bg-neutral-800/60 border border-[var(--border-light)] text-xs text-[var(--text-muted)] cursor-not-allowed"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Your email is tied to your account orders and OTP authentication.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-btn disabled:opacity-50"
            >
              {savingProfile ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
