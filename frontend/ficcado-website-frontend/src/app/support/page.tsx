'use client';

// =============================================================================
// Reach Out To Us / Customer Support — /support
// Refactored per REFACTOR_ON_PREVIOUS_UPDATE.md:
// - Added 'Enter Order ID' text input with format validation (FIC-A0001 or team Order ID).
// - Routed submissions to Google Sheets 'Support Requests' tab.
// - Honest confirmation messaging with Ficcado operations team.
// =============================================================================

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  FileCheck2,
  Send,
  Menu,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useModal } from '@/context/ModalContext';
import { BRAND } from '@/config/site';
import { isValidOrderId, normalizeOrderId } from '@/lib/orderId';

type SupportType =
  | 'Help regarding order'
  | 'enquiry on products'
  | 'complaints'
  | 'issue on application'
  | 'other';

interface SubmittedTicket {
  ticketId: string;
  name: string;
  email: string;
  phone?: string;
  type: SupportType;
  orderId?: string;
  description: string;
  createdAt: string;
}

export default function SupportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { openModal } = useModal();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<SupportType>('Help regarding order');

  // Order ID input for "Help regarding order"
  const [orderId, setOrderId] = useState('');
  const [orderIdError, setOrderIdError] = useState('');

  const [description, setDescription] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SubmittedTicket | null>(null);

  function handleOrderIdChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    if (cleaned.length <= 20) {
      setOrderId(cleaned);
      if (orderIdError && isValidOrderId(cleaned)) {
        setOrderIdError('');
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Please provide your name', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please provide a valid email address', 'error');
      return;
    }

    let normalizedId = '';
    if (type === 'Help regarding order') {
      normalizedId = normalizeOrderId(orderId);
      if (!normalizedId) {
        setOrderIdError('Order ID is required to look up your order details.');
        showToast('Please enter your Order ID', 'error');
        return;
      }
      if (!isValidOrderId(normalizedId)) {
        setOrderIdError('Invalid format. Enter your temporary Reference ID (e.g. FIC-A0001) or team Order ID.');
        showToast('Please enter a valid Reference ID or Order ID', 'error');
        return;
      }
      setOrderIdError('');
    }

    if (!description.trim()) {
      showToast('Please describe your issue or enquiry', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiType =
        type === 'Help regarding order'
          ? 'order-support'
          : type === 'enquiry on products'
          ? 'product-inquiry'
          : 'contact';

      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          type: apiType,
          orderId: normalizedId || undefined,
          message: description.trim(),
          sourcePage: '/support',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          showToast('Too many submissions from your network. Please wait a few minutes.', 'error');
          return;
        }
        const errorMsg = result.error?.message || result.error || 'Failed to submit support request';
        throw new Error(errorMsg);
      }

      const inquiryId = result.data?.inquiryId || result.inquiryId || `FIC-TKT-${Date.now().toString().slice(-5)}`;

      const ticket: SubmittedTicket = {
        ticketId: inquiryId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        type,
        orderId: normalizedId || undefined,
        description: description.trim(),
        createdAt: new Date().toISOString(),
      };

      setSubmittedTicket(ticket);
      showToast('Support request registered successfully! 🎉', 'success');
    } catch (err: unknown) {
      console.error('Support ticket submission error:', err);
      showToast((err as Error).message || 'Unable to submit ticket. Please contact us on WhatsApp.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setSubmittedTicket(null);
    setDescription('');
    setOrderId('');
    setOrderIdError('');
    setName('');
    setEmail('');
    setPhone('');
  }

  return (
    <div id="support-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
      {/* Mobile Top Header */}
      <header
        className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
          </button>
          <h1 className="text-base font-800 tracking-tight" style={{ color: 'var(--text-main)' }}>
            Reach Out To Us
          </h1>
        </div>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] active:scale-95 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
      </header>

      {/* Hero Banner */}
      <section className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-800 uppercase tracking-wider">
            <MessageSquare size={14} />
            <span>Customer Care Hub • We’re Here To Help</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Reach Out To Ficcado
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Have a question about an order, want to inquire about custom sizing, or facing an issue on the app? Reach out directly via email or our dynamic ticket desk below.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10">
        {/* Quick FAQ Reference Callout */}
        <div className="card p-5 md:p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0">
              <HelpCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-800 text-[var(--text-main)]">
                Looking for quick answers?
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Check our FAQ for instant answers on sizing, ordering, WhatsApp fulfillment, and returns.
              </p>
            </div>
          </div>
          <Link
            href="/faq"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all shadow-xs shrink-0 text-center"
          >
            Browse FAQ &rarr;
          </Link>
        </div>

        {/* OPTION 1: Direct Email Channel */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <h2 className="text-lg md:text-xl font-900 text-[var(--text-main)]">
              Option 1: Direct Email Priority Support
            </h2>
          </div>

          <div className="card p-6 md:p-8 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-surface-alt)] border border-[var(--border-light)] rounded-3xl shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                  <Mail size={16} />
                  <span>Official Support Desk & Direct Contact</span>
                </div>
                <a
                  href={`mailto:${BRAND.support}`}
                  className="text-xl md:text-2xl font-900 text-[var(--primary)] hover:underline block tracking-tight"
                >
                  {BRAND.support}
                </a>
                <p className="text-xs text-[var(--text-muted)] max-w-lg leading-relaxed">
                  Support is active <strong>{BRAND.supportHours}</strong>. Live chat is available through this contact desk and WhatsApp (<strong>{BRAND.liveChat.timingShort}</strong>).
                </p>
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <a
                  href={`mailto:${BRAND.support}?subject=Inquiry%20from%20Ficcado%20Storefront`}
                  className="btn-primary py-3 px-6 text-xs font-bold rounded-xl shadow-xs text-center"
                >
                  Launch Mail App ✉️
                </a>
                <span className="text-[11px] text-center text-[var(--text-muted)]">
                  Support Hours: {BRAND.supportHours}
                </span>
              </div>
            </div>

            {/* Business Identity & Compliance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)]">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-1">
                <span className="font-bold text-[var(--text-main)] block">Direct Phone & WhatsApp</span>
                <p><a href={`tel:${BRAND.phone}`} className="text-[var(--primary)] font-bold">{BRAND.phone}</a> (+91 6282000729)</p>
                <p className="text-[11px] text-[var(--text-muted)]">Live Chat: {BRAND.liveChat.timingShort}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-1">
                <span className="font-bold text-[var(--text-main)] block">Grievance Officer (POG)</span>
                <p className="font-semibold text-[var(--text-main)]">{BRAND.pog.name}</p>
                <p><a href={`mailto:${BRAND.pog.email}`} className="text-[var(--primary)] hover:underline text-[11px] font-mono">{BRAND.pog.email}</a></p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-1 sm:col-span-2 md:col-span-1">
                <span className="font-bold text-[var(--text-main)] block">Business Identity & GST</span>
                <p className="font-semibold text-[var(--text-main)]">{BRAND.legalName}</p>
                <p className="text-[11px]">GSTIN: <span className="font-mono font-bold text-[var(--text-main)]">{BRAND.gst}</span></p>
                <p className="text-[11px] text-[var(--text-muted)]">Delivery & Sales: {BRAND.deliverySalesRegion}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[11px] text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span><strong>Registered Address:</strong> {BRAND.address.full}</span>
              <span className="shrink-0 font-semibold text-[var(--text-main)]">User Eligibility: Age &ge; 18</span>
            </div>
          </div>
        </section>

        {/* OPTION 2: Support Desk Form */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <h2 className="text-lg md:text-xl font-900 text-[var(--text-main)]">
              Option 2: Submit A Request Via Support Desk
            </h2>
          </div>

          {submittedTicket ? (
            /* Submission Honest Confirmation Card */
            <div className="card p-8 md:p-10 bg-[var(--bg-surface)] border-2 border-[var(--accent-green)] rounded-3xl shadow-md text-center max-w-2xl mx-auto space-y-6 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <FileCheck2 size={32} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-800 uppercase tracking-wider text-emerald-600">
                  Request Logged Successfully
                </span>
                <h3 className="text-2xl font-900 text-[var(--text-main)]">
                  Thank You, {submittedTicket.name}!
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                  {submittedTicket.orderId ? (
                    <>
                      We received your request. Our team will verify order{' '}
                      <strong className="text-[var(--primary)] font-mono">{submittedTicket.orderId}</strong> and contact you via WhatsApp / email shortly.
                    </>
                  ) : (
                    <>
                      Your support request has been registered. Our care specialists will review your message and reach out to <strong>{submittedTicket.email}</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* Ticket Details Box */}
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-left space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-muted)]">Ticket Reference ID:</span>
                  <span className="font-mono font-bold text-[var(--primary)]">{submittedTicket.ticketId}</span>
                </div>
                {submittedTicket.orderId && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-light)]">
                    <span className="text-[var(--text-muted)]">Quoted Order ID:</span>
                    <span className="font-mono font-bold text-[var(--text-main)]">{submittedTicket.orderId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-muted)]">Category:</span>
                  <span className="font-semibold text-[var(--text-main)] capitalize">{submittedTicket.type}</span>
                </div>
                <div className="py-1">
                  <span className="text-[var(--text-muted)] block mb-1">Issue Description:</span>
                  <p className="text-[var(--text-main)] leading-relaxed italic">&ldquo;{submittedTicket.description}&rdquo;</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-primary py-2.5 px-6 text-xs font-bold rounded-xl"
                >
                  Submit Another Request
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="btn-ghost py-2.5 px-6 text-xs font-bold rounded-xl border border-[var(--border-light)]"
                >
                  Back to Drops
                </button>
              </div>
            </div>
          ) : (
            /* Interactive Form */
            <form onSubmit={handleSubmit} className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl shadow-sm space-y-6">
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="support-name" className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                    <span>Full Name</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="support-name"
                    type="text"
                    required
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field text-xs md:text-sm"
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="support-email" className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                    <span>Email Address</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field text-xs md:text-sm"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="support-phone" className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                    <span>Mobile / WhatsApp Number (Optional)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[var(--primary)] flex items-center gap-1">
                    <Phone size={12} />
                    <span>For quick callback or WhatsApp support</span>
                  </span>
                </div>
                <input
                  id="support-phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field text-xs md:text-sm"
                  autoComplete="tel"
                />
              </div>

              {/* Category / Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  How can we help you today? (Select Type)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(
                    [
                      'Help regarding order',
                      'enquiry on products',
                      'complaints',
                      'issue on application',
                      'other',
                    ] as SupportType[]
                  ).map((t) => {
                    const isSelected = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setType(t);
                          if (t !== 'Help regarding order') setOrderIdError('');
                        }}
                        className={`p-3 rounded-2xl text-xs font-bold text-center transition-all capitalize border ${
                          isSelected
                            ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs scale-[1.02]'
                            : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:bg-[var(--border-light)] border-[var(--border-light)]'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── CONTEXTUAL SECTION: Order ID (for Help regarding order) ── */}
              {type === 'Help regarding order' && (
                <div className="space-y-2 p-4 md:p-5 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label htmlFor="support-order-id" className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      <span>Order ID</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                      <HelpCircle size={12} />
                      <span>Found in your WhatsApp order message</span>
                    </span>
                  </div>

                  <input
                    id="support-order-id"
                    type="text"
                    required
                    placeholder="e.g. FIC-A0001 or ORD-1042"
                    value={orderId}
                    onChange={(e) => handleOrderIdChange(e.target.value)}
                    maxLength={30}
                    className={`input-field font-mono font-bold tracking-wider uppercase text-xs md:text-sm ${
                      orderIdError ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                    aria-describedby={orderIdError ? 'order-id-error' : undefined}
                  />

                  {orderIdError ? (
                    <p id="order-id-error" className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle size={13} />
                      <span>{orderIdError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Enter the Order ID shared by the Ficcado team, or your temporary Reference ID (starts with FIC-).
                    </p>
                  )}
                </div>
              )}

              {/* Description Field */}
              <div className="space-y-1.5">
                <label htmlFor="support-description" className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                  <span>Describe Your Issue or Request</span>
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="support-description"
                  required
                  rows={4}
                  placeholder={
                    type === 'Help regarding order'
                      ? 'Please provide details about what you need assistance with (e.g., delivery address change, size replacement question)...'
                      : 'Please elaborate on your inquiry or feedback...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field text-xs md:text-sm resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3.5 text-xs md:text-sm font-bold shadow-md rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ opacity: isSubmitting ? 0.7 : 1 }}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Logging Support Request...' : 'Submit Support Request'}</span>
                </button>
                <p className="text-[10px] text-center text-zinc-500 leading-relaxed">
                  By submitting this request, you acknowledge our{' '}
                  <Link href="/privacy" className="underline hover:text-zinc-300">
                    Privacy Policy
                  </Link>
                  . Your details are processed solely to resolve your inquiry.
                </p>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
