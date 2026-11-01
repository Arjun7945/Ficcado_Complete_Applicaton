'use client';

/**
 * app/(app)/dashboard/customers/page.tsx
 *
 * Customer Information Management Page.
 * Strictly adheres to Ficcado Design System & Brand Guide (docs/DESIGN.md).
 *
 * Features:
 * - Centered pop-up modal for viewing & editing customer profile and order history
 * - Multi-address repeatable editor (Home, Work, Other)
 * - Complete pagination with configurable page size (10, 20, 50) and quick jump controls
 * - Real-time in-place data updates and instant search filtering
 */

import { useState, useEffect } from 'react';
import LoadingGecko from '@/components/LoadingGecko';
import ErrorMessage, { parseApiError } from '@/components/ErrorMessage';
import { formatISTDateTime } from '@/lib/dateUtils';

interface AddressEntry {
  label:   string;
  address: string;
}

interface CustomerRecord {
  sno:            string;
  name:           string;
  phone:          string;
  addresses:      AddressEntry[];
  address:        string;   // legacy compat — first address text
  email:          string;
  totalOrders:    string;
  invoiceNumbers: string;
  createdAt:      string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<{ message: string; hint?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10);

  // Selected customer View/Edit & Order History state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerOrders, setCustomerOrders]     = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders]       = useState(false);
  const [editName, setEditName]                 = useState('');
  const [editEmail, setEditEmail]               = useState('');
  const [editAddresses, setEditAddresses]       = useState<AddressEntry[]>([]);
  const [savingProfile, setSavingProfile]       = useState(false);
  const [saveError, setSaveError]               = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess]           = useState<string | null>(null);

  // Handle ESC key listener & body scroll lock when modal is open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedCustomer(null);
      }
    }

    if (selectedCustomer) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCustomer]);

  // Reset page when search query or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  async function openCustomerDetailModal(c: CustomerRecord) {
    setSelectedCustomer(c);
    setEditName(c.name || '');
    setEditEmail(c.email || '');
    // Ensure addresses is always an array of AddressEntry
    setEditAddresses(
      Array.isArray(c.addresses) && c.addresses.length > 0
        ? c.addresses.map((a) => ({ label: a.label || 'Default', address: a.address || '' }))
        : c.address ? [{ label: 'Default', address: c.address }] : []
    );
    setSaveError(null);
    setSaveSuccess(null);
    setLoadingOrders(true);

    try {
      const res = await fetch('/api/sales');
      const data = await res.json();
      if (data.sales) {
        const matchingOrders = data.sales.filter((s: any) => {
          const phoneMatch = s.customerPhone && c.phone && s.customerPhone.trim() === c.phone.trim();
          const invMatch = c.invoiceNumbers && c.invoiceNumbers.includes(s.invoiceNumber);
          return phoneMatch || invMatch;
        });
        setCustomerOrders(matchingOrders);
      }
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  // ── Address list helpers ────────────────────────────────────────────────────
  function addAddress() {
    setEditAddresses((prev) => [...prev, { label: 'Other', address: '' }]);
  }

  function updateAddressField(idx: number, field: 'label' | 'address', value: string) {
    setEditAddresses((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function removeAddress(idx: number) {
    setEditAddresses((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveCustomerProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;

    // Validate: remove empty entries before saving
    const cleanedAddresses = editAddresses
      .filter((a) => a.address.trim())
      .map((a) => ({ label: a.label.trim() || 'Address', address: a.address.trim() }));

    setSaveError(null);
    setSaveSuccess(null);
    setSavingProfile(true);

    try {
      const res = await fetch('/api/customer-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone:     selectedCustomer.phone,
          name:      editName.trim(),
          email:     editEmail.trim(),
          addresses: cleanedAddresses,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save customer details.');
        return;
      }

      setSaveSuccess('Customer profile updated successfully.');

      // Update in-place in selectedCustomer state
      setSelectedCustomer((prev) => prev ? {
        ...prev,
        name: editName.trim(),
        email: editEmail.trim(),
        addresses: cleanedAddresses,
        address: cleanedAddresses[0]?.address ?? '',
      } : null);

      // Update in-place in customers table array so changes appear immediately
      setCustomers((prev) =>
        prev.map((c) =>
          c.phone === selectedCustomer.phone
            ? {
                ...c,
                name: editName.trim(),
                email: editEmail.trim(),
                addresses: cleanedAddresses,
                address: cleanedAddresses[0]?.address ?? '',
              }
            : c
        )
      );

      // Re-fetch in background to ensure full backend parity
      fetchCustomers(false);
    } catch {
      setSaveError("Couldn't save customer details. Please check your network connection.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function fetchCustomers(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer-info', {
        headers: { 'Cache-Control': 'no-store' },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(parseApiError(data));
      } else {
        setCustomers(data.customers ?? []);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers(true);
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const allAddressText = (c.addresses || []).map((a) => a.address).join(' ').toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      allAddressText.includes(q) ||
      (c.invoiceNumbers || '').toLowerCase().includes(q)
    );
  });

  const totalCustomers     = customers.length;
  const customersWithEmail = customers.filter((c) => c.email && c.email.trim().length > 0).length;
  const totalOrdersPlaced  = customers.reduce((sum, c) => sum + (parseInt(c.totalOrders, 10) || 0), 0);

  // Pagination slicing
  const totalFiltered      = filteredCustomers.length;
  const totalPages         = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validCurrentPage   = Math.min(currentPage, totalPages);
  const startIndex         = (validCurrentPage - 1) * pageSize;
  const endIndex           = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Customer Information Management</h1>
          <div className="page-subtitle">View profiles, purchase history, and contact information across all sales</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => fetchCustomers(true)} disabled={loading}>
          ⟳ Refresh
        </button>
      </div>

      {error && <ErrorMessage message={error.message} hint={error.hint} onDismiss={() => setError(null)} />}

      {/* KPI Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Registered Customers</div>
          <div className="stat-value">{totalCustomers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Orders Placed</div>
          <div className="stat-value">{totalOrdersPlaced}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Customers with Email</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{customersWithEmail}</div>
        </div>
      </div>

      {/* Search Bar Panel */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-bar" style={{ width: '100%', flex: 1 }}>
            <span style={{ color: 'var(--color-ink-muted)', fontSize: 16 }}>🔍</span>
            <input
              type="text"
              placeholder="Search customers by Name, Phone Number, Email, Address, or Invoice Number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSearchQuery('')}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Customer Directory Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <LoadingGecko label="Loading Customer Directory…" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-ink)', marginBottom: 6 }}>
              {searchQuery ? 'No matching customers found' : 'No customer records yet'}
            </div>
            <p style={{ fontSize: 13.5, margin: 0, color: 'var(--color-ink-muted)' }}>
              {searchQuery
                ? 'Try adjusting your search terms or clearing the filter.'
                : 'Customer profiles are automatically created and updated whenever a sale is logged.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View Card List */}
            <div className="mobile-only mobile-card-list" style={{ padding: 12 }}>
              {paginatedCustomers.map((c, idx) => {
                const addrList = Array.isArray(c.addresses) && c.addresses.length > 0
                  ? c.addresses
                  : c.address ? [{ label: 'Default', address: c.address }] : [];
                return (
                  <div key={c.phone || idx} className="mobile-data-card">
                    <div className="mobile-data-card-header">
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name || 'Customer'}</span>
                      <span className="badge badge-success">{c.totalOrders || '1'} order(s)</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-brand-primary)', fontWeight: 600 }}>
                      📞 {c.phone || '—'}
                    </div>
                    {c.email && (
                      <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>✉ {c.email}</div>
                    )}
                    {addrList.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
                        📍 {addrList[0].label}: {addrList[0].address}
                      </div>
                    )}
                    <div className="mobile-data-card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => openCustomerDetailModal(c)}
                      >
                        View Profile & Orders
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="desktop-only" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>#</th>
                    <th>Customer Name</th>
                    <th>Phone Number</th>
                    <th>Email Address</th>
                    <th>Saved Addresses</th>
                    <th style={{ textAlign: 'center' }}>Total Orders</th>
                    <th>Related Invoices</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((c, idx) => {
                    const addrList = Array.isArray(c.addresses) && c.addresses.length > 0
                      ? c.addresses
                      : c.address ? [{ label: 'Default', address: c.address }] : [];
                    const rowNumber = startIndex + idx + 1;

                    return (
                      <tr key={c.phone || idx}>
                        <td style={{ textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: 13, fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                          {c.name || '—'}
                        </td>
                        <td>
                          <code style={{
                            fontSize: 12.5,
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: 'var(--color-brand-primary)',
                            background: 'rgba(43,98,198,0.06)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}>
                            {c.phone || '—'}
                          </code>
                        </td>
                        <td>
                          {c.email ? (
                            <span style={{ fontSize: 13, color: 'var(--color-ink)' }}>{c.email}</span>
                          ) : (
                            <span className="badge badge-warning">No Email</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          {addrList.length === 0 ? (
                            <span style={{ color: 'var(--color-ink-muted)' }}>—</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {addrList.slice(0, 2).map((a, ai) => (
                                <div key={ai} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                  <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 5px', flexShrink: 0 }}>
                                    {a.label || 'Address'}
                                  </span>
                                  <span style={{ color: 'var(--color-ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                    {a.address}
                                  </span>
                                </div>
                              ))}
                              {addrList.length > 2 && (
                                <span style={{ fontSize: 11, color: 'var(--color-brand-primary)' }}>+{addrList.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ fontWeight: 700, padding: '3px 10px' }}>
                            {c.totalOrders || '1'} order(s)
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11.5, color: 'var(--color-ink-muted)', maxWidth: 200, display: 'block' }} className="truncate">
                            {c.invoiceNumbers || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openCustomerDetailModal(c)}
                          >
                            View / Edit Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Structured Pagination Controls Bar */}
            {totalFiltered > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  background: 'var(--color-surface)',
                  borderTop: '1px solid var(--color-border)',
                  gap: 12,
                  fontSize: 13,
                  color: 'var(--color-ink-muted)',
                }}
              >
                {/* Left info & Page Size Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span>
                    Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{totalFiltered}</strong> customers
                    {searchQuery && totalCustomers !== totalFiltered && (
                      <span style={{ marginLeft: 4 }}>
                        (filtered from {totalCustomers} total)
                      </span>
                    )}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-select"
                      style={{
                        width: 'auto',
                        padding: '2px 8px',
                        fontSize: 12.5,
                        height: 28,
                        borderRadius: 4,
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Right Navigation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="First page"
                    style={{ padding: '3px 8px', minWidth: 30 }}
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    style={{ padding: '3px 10px' }}
                  >
                    ‹ Prev
                  </button>

                  {/* Page number buttons */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <span key={`dots-${idx}`} style={{ padding: '4px 6px', color: 'var(--color-ink-muted)' }}>…</span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            className={`btn btn-sm ${validCurrentPage === item ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setCurrentPage(item as number)}
                            style={{
                              padding: '2px 8px',
                              minWidth: 28,
                              height: 28,
                              fontWeight: validCurrentPage === item ? 700 : 500,
                            }}
                          >
                            {item}
                          </button>
                        )
                      )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    style={{ padding: '3px 10px' }}
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Last page"
                    style={{ padding: '3px 8px', minWidth: 30 }}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── PROPER POP-UP MODAL: CUSTOMER PROFILE & ORDER HISTORY ── */}
      {selectedCustomer && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedCustomer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(34, 38, 30, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 920,
              width: '94vw',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 60px rgba(34, 38, 30, 0.35)',
              overflow: 'hidden',
              margin: 'auto',
              animation: 'slide-up 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                flexShrink: 0,
                padding: '16px 24px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 className="modal-title" style={{ fontSize: 18, margin: 0, color: 'var(--color-ink)' }}>
                    Customer Profile & Order History
                  </h2>
                  <span className="badge badge-success" style={{ fontWeight: 700 }}>
                    {selectedCustomer.totalOrders || '1'} Order(s)
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-ink-muted)', marginTop: 4 }}>
                  Phone: <strong style={{ color: 'var(--color-brand-primary)' }}>{selectedCustomer.phone}</strong>
                  {selectedCustomer.createdAt && (
                    <span> • Registered: {formatISTDateTime(selectedCustomer.createdAt)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSelectedCustomer(null)}
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-ink-muted)',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
                title="Close Window (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div
              className="modal-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {saveSuccess && (
                <ErrorMessage
                  message={saveSuccess}
                  variant="success"
                  onDismiss={() => setSaveSuccess(null)}
                />
              )}
              {saveError && (
                <ErrorMessage
                  message={saveError}
                  variant="error"
                  onDismiss={() => setSaveError(null)}
                />
              )}

              {/* Edit Customer Profile Card */}
              <form
                onSubmit={handleSaveCustomerProfile}
                className="card"
                style={{
                  background: 'var(--color-bg)',
                  padding: 20,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: 0, color: 'var(--color-brand-primary)' }}>
                    ✏ Edit Customer Information
                  </h3>
                  <span style={{ fontSize: 11.5, color: 'var(--color-ink-muted)' }}>
                    Changes reflect immediately across all related CRM screens
                  </span>
                </div>

                <div className="grid-form-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Customer Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Customer Full Name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Phone Number <span className="badge badge-neutral" style={{ fontSize: 10, marginLeft: 4 }}>Primary Key</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={selectedCustomer.phone}
                      disabled
                      style={{ opacity: 0.75, cursor: 'not-allowed', background: 'rgba(0,0,0,0.04)' }}
                    />
                  </div>
                </div>

                {/* Addresses Editor */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
                      Saved Delivery Addresses ({editAddresses.length})
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={addAddress}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      + Add Address
                    </button>
                  </div>

                  {editAddresses.length === 0 ? (
                    <div style={{
                      padding: '16px 20px',
                      border: '1px dashed var(--color-border)',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--color-ink-muted)',
                      textAlign: 'center',
                      background: 'var(--color-surface)',
                    }}>
                      No saved addresses yet — click &quot;+ Add Address&quot; to add one.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {editAddresses.map((addr, ai) => (
                        <div
                          key={ai}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 6,
                            padding: '10px 14px',
                          }}
                        >
                          <div style={{ flex: '0 0 130px' }}>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Label</label>
                            <input
                              type="text"
                              className="form-input"
                              value={addr.label}
                              onChange={(e) => updateAddressField(ai, 'label', e.target.value)}
                              placeholder="e.g. Home, Office"
                              style={{ fontSize: 12.5 }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Delivery Address</label>
                            <textarea
                              className="form-textarea"
                              rows={2}
                              value={addr.address}
                              onChange={(e) => updateAddressField(ai, 'address', e.target.value)}
                              placeholder="House/Flat No., Street, Area, City, PIN"
                              style={{ fontSize: 12.5 }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAddress(ai)}
                            style={{
                              marginTop: 22,
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              fontSize: 18,
                              lineHeight: 1,
                              padding: '4px 8px',
                              borderRadius: 4,
                            }}
                            title="Remove this address"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={savingProfile}
                  >
                    {savingProfile ? <LoadingGecko size="inline" label="Saving Changes…" /> : 'Save Customer Changes'}
                  </button>
                </div>
              </form>

              {/* Customer Order History Section */}
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  marginBottom: 12,
                  color: 'var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>📦 Purchase & Order History</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink-muted)' }}>
                    {customerOrders.length} transaction(s) found
                  </span>
                </h3>

                {loadingOrders ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <LoadingGecko label="Fetching customer order history…" />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div style={{
                    padding: 28,
                    textAlign: 'center',
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-ink-muted)',
                  }}>
                    No recorded order history for this customer yet.
                  </div>
                ) : (
                  <div style={{
                    overflowX: 'auto',
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <table className="table" style={{ width: '100%', fontSize: 12.5 }}>
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Purchased Item(s) & Sizes</th>
                          <th style={{ textAlign: 'right' }}>Discount</th>
                          <th style={{ textAlign: 'right' }}>Total Amount</th>
                          <th>Order Date</th>
                          <th>Completed Date</th>
                          <th style={{ textAlign: 'center' }}>Payment Mode</th>
                          <th style={{ textAlign: 'center' }}>Pending Dues Status</th>
                          <th>Created By</th>
                          <th>Closed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerOrders.map((ord, idx) => {
                          const isPaid      = ord.paymentStatus === 'Paid';
                          const totalVal    = parseFloat(ord.totalAmount || '0') || 0;
                          const discountVal = parseFloat(ord.discount || '0') || 0;

                          return (
                            <tr key={ord.invoiceNumber || idx}>
                              <td style={{ fontWeight: 700 }}>
                                <a
                                  href={`/dashboard/sales/${encodeURIComponent(ord.invoiceNumber)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--color-brand-primary)', textDecoration: 'none' }}
                                >
                                  {ord.invoiceNumber} ↗
                                </a>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{ord.itemNames || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>Size: {ord.sizes || '—'}</div>
                              </td>
                              <td style={{ textAlign: 'right', color: discountVal > 0 ? 'var(--color-error)' : 'var(--color-ink-muted)' }} className="tabular-nums">
                                {discountVal > 0 ? `-₹${discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'No Discount'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-brand-primary)' }} className="tabular-nums">
                                ₹{totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ fontSize: 11.5, color: 'var(--color-ink-muted)' }}>
                                {formatISTDateTime(ord.createdAt)}
                              </td>
                              <td style={{ fontSize: 11.5, color: 'var(--color-ink-muted)' }}>
                                {formatISTDateTime(ord.updatedAt)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge badge-neutral" style={{ fontSize: 11 }}>{ord.modeOfPayment || '—'}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {isPaid ? (
                                  <span className="badge badge-success" style={{ fontWeight: 700 }}>No Dues</span>
                                ) : (
                                  <span className="badge badge-warning" style={{ fontWeight: 700, color: 'var(--color-error)' }}>
                                    Payment Pending: ₹{totalVal.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td style={{ fontSize: 12 }}>{ord.createdBy || '—'}</td>
                              <td style={{ fontSize: 12 }}>{ord.saleClosedBy || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                flexShrink: 0,
                padding: '12px 24px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedCustomer(null)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
