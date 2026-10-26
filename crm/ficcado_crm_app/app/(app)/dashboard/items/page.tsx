'use client';

/**
 * app/(app)/dashboard/items/page.tsx
 * Items Management — full CRUD for item catalog, selling price, cost price,
 * colors (#RRGGBB hex), tags, plain-text description, optimistic locking (AUD-09),
 * multi-image upload & management (Cloudflare R2), and review ratings display.
 */

import React, { useEffect, useState } from 'react';
import LoadingGecko from '@/components/LoadingGecko';
import ErrorMessage, { parseApiError } from '@/components/ErrorMessage';
import StatusBadge from '@/components/StatusBadge';
import ItemThumbnail from '@/components/ItemThumbnail';
import { ItemStatus, ITEM_STATUS_OPTIONS } from '@/lib/enums';
import { logger } from '@/lib/logger';

interface ItemImageInfo {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  caption?: string;
  displayOrder: number;
}

export interface Item {
  rowIndex: number;
  sno: string;
  id: number;
  itemName: string;
  itemType: string;
  price: string;
  costPrice: string;
  sizes: string;
  status: string;
  currentStatus: string;
  description?: string;
  colors?: string[];
  tags?: string[];
  version?: number;
  coverThumbnailUrl?: string | null;
  images?: ItemImageInfo[];
  averageRating?: number;
  reviewCount?: number;
}

const SIZES    = ['XS', 'S', 'M', 'L', 'XL'];
const STATUSES = ['In Stock', 'Out of Stock'];
const TYPES    = ['Shirt', 'T-Shirt', 'Pants', 'Trousers', 'Jeans', 'Shorts', 'Jacket', 'Dress', 'Skirt', 'Other'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export default function ItemsPage() {
  const [items, setItems]     = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<{ message: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  // Create modal state
  const [showCreate, setShowCreate]           = useState(false);
  const [creating, setCreating]               = useState(false);
  const [createError, setCreateError]         = useState<string | null>(null);
  const [newName, setNewName]                 = useState('');
  const [newType, setNewType]                 = useState('T-Shirt');
  const [newPrice, setNewPrice]               = useState('');
  const [newCostPrice, setNewCostPrice]       = useState('0');
  const [newSizes, setNewSizes]               = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [newStatus, setNewStatus]             = useState<string>(ItemStatus.ACTIVE);
  const [newDescription, setNewDescription]   = useState('');
  const [newColors, setNewColors]             = useState<string[]>([]);
  const [newColorInput, setNewColorInput]     = useState('#000000');
  const [newColorError, setNewColorError]     = useState<string | null>(null);
  const [newTags, setNewTags]                 = useState<string[]>([]);
  const [newTagInput, setNewTagInput]         = useState('');
  const [newTagError, setNewTagError]         = useState<string | null>(null);
  const [createFiles, setCreateFiles]         = useState<File[]>([]);
  const [createPreviews, setCreatePreviews]   = useState<string[]>([]);

  // Edit modal state
  const [editItem, setEditItem]               = useState<Item | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [editError, setEditError]             = useState<string | null>(null);
  const [isConflict, setIsConflict]           = useState(false);
  const [editName, setEditName]               = useState('');
  const [editType, setEditType]               = useState('');
  const [editPrice, setEditPrice]             = useState('');
  const [editCostPrice, setEditCostPrice]     = useState('0');
  const [editSizes, setEditSizes]             = useState<string[]>([]);
  const [editStatus, setEditStatus]           = useState<string>(ItemStatus.ACTIVE);
  const [editDescription, setEditDescription] = useState('');
  const [editColors, setEditColors]           = useState<string[]>([]);
  const [editColorInput, setEditColorInput]   = useState('#000000');
  const [editColorError, setEditColorError]   = useState<string | null>(null);
  const [editTags, setEditTags]               = useState<string[]>([]);
  const [editTagInput, setEditTagInput]       = useState('');
  const [editTagError, setEditTagError]       = useState<string | null>(null);
  const [editImages, setEditImages]           = useState<ItemImageInfo[]>([]);
  const [uploadingImage, setUploadingImage]   = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [deleting, setDeleting]               = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    try {
      const res  = await fetch('/api/items');
      const data = await res.json();
      if (!res.ok) { setError(parseApiError(data)); return; }
      setItems(data.items ?? []);
    } catch {
      setError({ message: "Couldn't load items. Check your connection." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, []);

  function toggleSize(s: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);
  }

  // Color helper functions
  function handleAddColor(
    colorInput: string,
    existingColors: string[],
    setColors: React.Dispatch<React.SetStateAction<string[]>>,
    setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>
  ) {
    setErrorMsg(null);
    let hex = colorInput.trim().toUpperCase();
    if (!hex.startsWith('#')) hex = '#' + hex;

    if (!HEX_COLOR_REGEX.test(hex)) {
      setErrorMsg('Color must be a valid 6-character hex code (#RRGGBB).');
      return;
    }
    if (existingColors.includes(hex)) {
      setErrorMsg(`Color ${hex} is already added.`);
      return;
    }
    if (existingColors.length >= 12) {
      setErrorMsg('Maximum 12 colors allowed per item.');
      return;
    }
    setColors([...existingColors, hex]);
  }

  function handleRemoveColor(
    colorToRemove: string,
    setColors: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setColors((prev) => prev.filter((c) => c !== colorToRemove));
  }

  // Tag helper functions
  function handleAddTag(
    tagInput: string,
    existingTags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>
  ) {
    setErrorMsg(null);
    const trimmed = tagInput.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setErrorMsg('Tag must be between 2 and 30 characters long.');
      return;
    }
    if (existingTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`Tag "${trimmed}" is already added.`);
      return;
    }
    if (existingTags.length >= 10) {
      setErrorMsg('Maximum 10 tags allowed per item.');
      return;
    }
    setTags([...existingTags, trimmed]);
    setInput('');
  }

  function handleRemoveTag(
    tagToRemove: string,
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setCreateFiles((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setCreatePreviews((prev) => [...prev, ...previews]);
  }

  function removeCreatePreview(index: number) {
    setCreateFiles((prev) => prev.filter((_, i) => i !== index));
    setCreatePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) { setCreateError('Item name is required'); return; }
    if (!newPrice || parseFloat(newPrice) <= 0) { setCreateError('Selling price must be greater than 0'); return; }
    if (newSizes.length === 0) { setCreateError('Select at least one size'); return; }
    if (newDescription.length > 2000) { setCreateError('Description cannot exceed 2000 characters'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: newName,
          itemType: newType,
          priceOfItem: parseFloat(newPrice),
          costPrice: parseFloat(newCostPrice || '0'),
          availableSizes: newSizes,
          currentStatus: newStatus,
          description: newDescription.trim() || null,
          colors: newColors.length > 0 ? newColors : null,
          tags: newTags.length > 0 ? newTags : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || data.detail || 'Failed to create item'); return; }

      const createdItem = data.item;

      let uploadedCount = 0;
      if (createFiles.length > 0 && createdItem?.id) {
        for (const file of createFiles) {
          const fd = new FormData();
          fd.append('file', file);
          const imgRes = await fetch(`/api/items/${createdItem.id}/images`, {
            method: 'POST',
            body: fd,
          });
          if (imgRes.ok) {
            uploadedCount++;
          } else {
            const errJson = await imgRes.json().catch(() => ({}));
            logger.error('Image upload failed', { error: errJson });
          }
        }
      }

      setShowCreate(false);
      setNewName(''); setNewPrice(''); setNewCostPrice('0');
      setNewSizes(['S', 'M', 'L', 'XL']);
      setNewDescription(''); setNewColors([]); setNewTags([]);
      setCreateFiles([]); setCreatePreviews([]);
      setSuccess(uploadedCount > 0 ? `Item '${newName}' created successfully with ${uploadedCount} image(s).` : `Item '${newName}' created successfully.`);
      loadItems();
    } catch {
      setCreateError("Couldn't connect to server. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function openEdit(item: Item) {
    setEditItem(item);
    setEditName(item.itemName);
    setEditType(item.itemType || 'T-Shirt');
    setEditPrice(item.price);
    setEditCostPrice(item.costPrice || '0');
    setEditSizes(item.sizes ? item.sizes.split(/,\s*/).filter(Boolean) : []);
    setEditDescription(item.description || '');
    setEditColors(item.colors ? [...item.colors] : []);
    setEditTags(item.tags ? [...item.tags] : []);
    setIsConflict(false);

    const rawStatus = (item.currentStatus || item.status || '').toUpperCase().replace(/\s+/g, '_');
    const STATUS_MAP: Record<string, string> = {
      OUT_OF_STOCK: ItemStatus.OUT_OF_STOCK,
      INACTIVE: ItemStatus.INACTIVE,
      DISCONTINUED: ItemStatus.DISCONTINUED,
      ACTIVE: ItemStatus.ACTIVE,
      IN_STOCK: ItemStatus.ACTIVE,
    };
    const resolvedStatus = STATUS_MAP[rawStatus] ?? ItemStatus.ACTIVE;
    setEditStatus(resolvedStatus);
    setEditImages(item.images || []);
    setEditError(null);

    if (item.id) {
      try {
        const res = await fetch(`/api/items/${item.id}/images`);
        if (res.ok) {
          const imgs = await res.json();
          if (Array.isArray(imgs)) setEditImages(imgs);
        }
      } catch (imgErr) {
        logger.warn('Failed to fetch fresh images for item', { itemId: item.id, error: String(imgErr) });
      }
    }
  }

  async function handleUploadEditImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editItem || !e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    setEditError(null);
    try {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/items/${editItem.id}/images`, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const errData = await res.json();
          setEditError(errData.error || 'Failed to upload image');
        }
      }
      const freshRes = await fetch(`/api/items/${editItem.id}/images`);
      if (freshRes.ok) {
        const imgs = await freshRes.json();
        if (Array.isArray(imgs)) setEditImages(imgs);
      }
    } catch {
      setEditError("Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!editItem) return;
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/items/${editItem.id}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        setEditError(errData.error || 'Failed to delete image');
      } else {
        setEditImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    } catch {
      setEditError("Failed to delete image.");
    } finally {
      setDeletingImageId(null);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditError(null);
    setIsConflict(false);

    if (!editName.trim()) { setEditError('Item name is required'); return; }
    if (!editPrice || parseFloat(editPrice) <= 0) { setEditError('Selling price must be greater than 0'); return; }
    if (editSizes.length === 0) { setEditError('Select at least one size'); return; }
    if (editDescription.length > 2000) { setEditError('Description cannot exceed 2000 characters'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/items/${encodeURIComponent(editItem.id || editItem.sno)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: editName,
          itemType: editType,
          priceOfItem: parseFloat(editPrice),
          costPrice: parseFloat(editCostPrice || '0'),
          availableSizes: editSizes,
          currentStatus: editStatus,
          description: editDescription.trim() || null,
          colors: editColors,
          tags: editTags,
          version: editItem.version,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.code === 'ITEM_VERSION_CONFLICT') {
          setIsConflict(true);
          setEditError("This item was changed by another admin. Reload to see the latest version.");
        } else {
          setEditError(data.error || data.detail || 'Failed to update item');
        }
        return;
      }

      setEditItem(null);
      setSuccess(`Item '${editName}' updated successfully.`);
      loadItems();
    } catch {
      setEditError("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Delete item '${item.itemName}'? This cannot be undone.`)) return;
    setDeleting(item.sno);
    try {
      const res  = await fetch(`/api/items/${encodeURIComponent(item.id || item.sno)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(parseApiError(data)); return; }
      setSuccess(`Item '${item.itemName}' deleted successfully.`);
      loadItems();
    } catch {
      setError({ message: "Couldn't delete item. Please check if it is linked to existing records." });
    } finally {
      setDeleting(null);
    }
  }

  const filtered = items.filter((it) =>
    !search || it.itemName.toLowerCase().includes(search.toLowerCase()) || it.itemType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Items Management</h1>
          <div className="page-subtitle">
            Manage product catalog, selling price, cost price, &amp; images — {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadItems} disabled={loading}>
            ⟳ Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Item</button>
        </div>
      </div>

      {success && (
        <div style={{ marginBottom: 16 }}>
          <ErrorMessage message={success} variant="success" onDismiss={() => setSuccess(null)} />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorMessage message={error.message} variant="error" onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by item name or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <LoadingGecko size="full" label="Loading catalog items…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-ink-muted)' }}>
          {search ? `No items found matching "${search}".` : 'No items in the catalog. Click "+ Add Item" to create one.'}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="mobile-only mobile-card-list">
            {filtered.map((item) => {
              const p = parseFloat(item.price || '0') || 0;
              const c = parseFloat(item.costPrice || '0') || 0;
              const margin = p > 0 ? (p - c) : 0;
              return (
                <div key={item.sno} className="mobile-data-card">
                  <div className="mobile-data-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ItemThumbnail src={item.coverThumbnailUrl} alt={item.itemName} size={32} />
                      <div className="mobile-data-card-title">{item.itemName}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mobile-data-card-row">
                    <span className="mobile-data-card-label">Type</span>
                    <span className="mobile-data-card-value">{item.itemType || '—'}</span>
                  </div>
                  <div className="mobile-data-card-row">
                    <span className="mobile-data-card-label">Selling Price</span>
                    <span className="mobile-data-card-value" style={{ fontWeight: 600, color: 'var(--color-brand-primary)' }}>
                      ₹{item.price}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--color-ink-muted)' }}>Cost: ₹{item.costPrice || '0'}</span>
                    <span style={{ color: margin >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                      Margin: ₹{margin.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
                    Sizes: {(item.sizes || '').split(/,\s*/).filter(Boolean).join(', ')}
                  </div>

                  {/* Colors & Tags preview */}
                  {((item.colors && item.colors.length > 0) || (item.tags && item.tags.length > 0)) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {item.colors && item.colors.map((c) => (
                        <span
                          key={c}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: '1px solid rgba(255,255,255,0.3)',
                            display: 'inline-block',
                          }}
                          title={c}
                        />
                      ))}
                      {item.tags && item.tags.map((t) => (
                        <span key={t} className="badge badge-neutral" style={{ fontSize: 10 }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mobile-data-card-actions">
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(item)}>Edit / Images</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)} disabled={deleting === item.sno}>
                      {deleting === item.sno ? <LoadingGecko size="inline" label="Deleting…" /> : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop/Tablet Table View */}
          <div className="desktop-only card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Selling Price</th>
                    <th>Cost Price</th>
                    <th>Margin</th>
                    <th>Colors &amp; Tags</th>
                    <th>Sizes</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const p = parseFloat(item.price || '0') || 0;
                    const c = parseFloat(item.costPrice || '0') || 0;
                    const margin = p > 0 ? (p - c) : 0;
                    return (
                      <tr key={item.sno}>
                        <td style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>{item.sno}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ItemThumbnail src={item.coverThumbnailUrl} alt={item.itemName} size={36} />
                            <div>
                              <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                              {item.reviewCount && item.reviewCount > 0 ? (
                                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
                                  ★ {item.averageRating?.toFixed(1)} <span style={{ color: 'var(--color-ink-muted)' }}>({item.reviewCount})</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>{item.itemType || '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-brand-primary)' }}>₹{item.price}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink-muted)' }}>₹{item.costPrice || '0'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: margin >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                          ₹{margin.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {item.colors && item.colors.length > 0 ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                {item.colors.map((c) => (
                                  <span
                                    key={c}
                                    style={{
                                      width: 14,
                                      height: 14,
                                      borderRadius: '50%',
                                      backgroundColor: c,
                                      border: '1px solid rgba(255,255,255,0.3)',
                                      display: 'inline-block',
                                    }}
                                    title={c}
                                  />
                                ))}
                              </div>
                            ) : null}
                            {item.tags && item.tags.length > 0 ? (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {item.tags.slice(0, 3).map((t) => (
                                  <span key={t} className="badge badge-neutral" style={{ fontSize: 10 }}>
                                    #{t}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span style={{ fontSize: 10, color: 'var(--color-ink-muted)' }}>
                                    +{item.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : null}
                            {(!item.colors || item.colors.length === 0) && (!item.tags || item.tags.length === 0) && (
                              <span style={{ color: 'var(--color-ink-muted)', fontSize: 11 }}>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(item.sizes || '').split(/,\s*/).map((s) => s.trim()).filter(Boolean).map((s) => (
                              <span key={s} className="badge badge-neutral" style={{ fontSize: 11 }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>Edit / Images</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)} disabled={deleting === item.sno}>
                              {deleting === item.sno ? <LoadingGecko size="inline" label="Deleting…" /> : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Add New Item</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {createError && <ErrorMessage message={createError} variant="error" />}
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input type="text" className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Camera Blue" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Type</label>
                  <select className="form-select" value={newType} onChange={(e) => setNewType(e.target.value)}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid-form-2">
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input type="number" className="form-input" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost Price (₹)</label>
                    <input type="number" className="form-input" value={newCostPrice} onChange={(e) => setNewCostPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Available Sizes *</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SIZES.map((s) => (
                      <button key={s} type="button" onClick={() => toggleSize(s, newSizes, setNewSizes)}
                        className={`btn btn-sm ${newSizes.includes(s) ? 'btn-primary' : 'btn-ghost'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plain-Text Description */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Description (Plain Text)</label>
                    <span style={{ fontSize: 11, color: newDescription.length > 2000 ? 'var(--color-error)' : 'var(--color-ink-muted)' }}>
                      {newDescription.length} / 2000
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={4}
                    maxLength={2000}
                    placeholder="Enter detailed plain-text item description..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Color Codes Management */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Available Colors ({newColors.length}/12)</label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="color"
                      value={HEX_COLOR_REGEX.test(newColorInput) ? newColorInput : '#000000'}
                      onChange={(e) => setNewColorInput(e.target.value.toUpperCase())}
                      style={{ width: 36, height: 36, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                      title="Choose color"
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="#RRGGBB"
                      maxLength={7}
                      value={newColorInput}
                      onChange={(e) => { setNewColorInput(e.target.value); setNewColorError(null); }}
                      style={{ width: 110, textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddColor(newColorInput, newColors, setNewColors, setNewColorError)}
                    >
                      + Add Color
                    </button>
                  </div>
                  {newColorError && <div style={{ color: 'var(--color-error)', fontSize: 11, marginBottom: 6 }}>{newColorError}</div>}
                  {newColors.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {newColors.map((color) => (
                        <div
                          key={color}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            fontSize: 12,
                          }}
                        >
                          <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color, border: '1px solid rgba(255,255,255,0.3)' }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{color}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(color, setNewColors)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Tags Management */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Item Tags ({newTags.length}/10)</label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. streetwear, vintage (2-30 chars)"
                      maxLength={30}
                      value={newTagInput}
                      onChange={(e) => { setNewTagInput(e.target.value); setNewTagError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput, newTags, setNewTags, setNewTagInput, setNewTagError);
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddTag(newTagInput, newTags, setNewTags, setNewTagInput, setNewTagError)}
                    >
                      + Add Tag
                    </button>
                  </div>
                  {newTagError && <div style={{ color: 'var(--color-error)', fontSize: 11, marginBottom: 6 }}>{newTagError}</div>}
                  {newTags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {newTags.map((tag) => (
                        <span key={tag} className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 12 }}>
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag, setNewTags)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multi-Image Upload Dropzone */}
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Item Images (Cloudflare R2)</label>
                  <div style={{
                    border: '2px dashed var(--color-border-subtle, rgba(255,255,255,0.15))',
                    borderRadius: 10, padding: '16px', textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                  }}>
                    <input
                      type="file"
                      id="create-image-input"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelection}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="create-image-input" style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-primary)' }}>
                        Click to upload product images
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                        PNG, JPG, WebP up to 5MB (First image becomes Cover)
                      </div>
                    </label>
                  </div>

                  {createPreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                      {createPreviews.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: idx === 0 ? '2px solid var(--color-brand-primary)' : '1px solid rgba(255,255,255,0.15)' }}>
                          <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {idx === 0 && (
                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--color-brand-primary)', color: '#fff', fontSize: 9, textAlign: 'center', fontWeight: 700, padding: '1px 0' }}>
                              COVER
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeCreatePreview(idx)}
                            style={{
                              position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)',
                              color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18,
                              fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {ITEM_STATUS_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <LoadingGecko size="inline" label="Creating Item &amp; Uploading Images…" /> : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (with AUD-09 Optimistic Locking & Details) */}
      {editItem && (
        <div className="modal-backdrop" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Edit: {editItem.itemName}</h2>
              <button className="btn-icon" onClick={() => setEditItem(null)}>×</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* AUD-09 Optimistic Lock Conflict Banner */}
                {isConflict && (
                  <div
                    data-testid="item-conflict-banner"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid var(--color-error, #ef4444)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ color: '#fca5a5', fontSize: 13, fontWeight: 500 }}>
                      ⚠️ This item was changed by another admin. Reload to see the latest version.
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        setIsConflict(false);
                        setEditError(null);
                        setEditItem(null);
                        await loadItems();
                      }}
                    >
                      Reload Item
                    </button>
                  </div>
                )}

                {editError && !isConflict && <ErrorMessage message={editError} variant="error" />}

                {/* Product Images Management */}
                <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.1))', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Item Images ({editImages.length}/10)</label>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', fontSize: 12 }}>
                      {uploadingImage ? <LoadingGecko size="inline" label="Uploading…" /> : '+ Add Image'}
                      <input type="file" multiple accept="image/*" onChange={handleUploadEditImage} style={{ display: 'none' }} disabled={uploadingImage} />
                    </label>
                  </div>

                  {editImages.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', textAlign: 'center', padding: '12px 0' }}>
                      No images uploaded yet. Upload images to display on product catalog &amp; website.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {editImages.map((img, idx) => (
                        <div key={img.id} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: idx === 0 ? '2px solid var(--color-brand-primary)' : '1px solid rgba(255,255,255,0.15)' }}>
                          <img src={img.thumbnailUrl} alt={img.caption || 'Item thumbnail'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {idx === 0 && (
                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--color-brand-primary)', color: '#fff', fontSize: 9, textAlign: 'center', fontWeight: 700, padding: '1px 0' }}>
                              COVER
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            disabled={deletingImageId === img.id}
                            style={{
                              position: 'absolute', top: 3, right: 3, background: 'rgba(239,68,68,0.85)',
                              color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20,
                              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Type</label>
                  <select className="form-select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid-form-2">
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input type="number" className="form-input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost Price (₹)</label>
                    <input type="number" className="form-input" value={editCostPrice} onChange={(e) => setEditCostPrice(e.target.value)} min="0" step="0.01" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Available Sizes *</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SIZES.map((s) => (
                      <button key={s} type="button" onClick={() => toggleSize(s, editSizes, setEditSizes)}
                        className={`btn btn-sm ${editSizes.includes(s) ? 'btn-primary' : 'btn-ghost'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plain-Text Description */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Description (Plain Text)</label>
                    <span style={{ fontSize: 11, color: editDescription.length > 2000 ? 'var(--color-error)' : 'var(--color-ink-muted)' }}>
                      {editDescription.length} / 2000
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={4}
                    maxLength={2000}
                    placeholder="Enter detailed plain-text item description..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Color Codes Management */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Available Colors ({editColors.length}/12)</label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="color"
                      value={HEX_COLOR_REGEX.test(editColorInput) ? editColorInput : '#000000'}
                      onChange={(e) => setEditColorInput(e.target.value.toUpperCase())}
                      style={{ width: 36, height: 36, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                      title="Choose color"
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="#RRGGBB"
                      maxLength={7}
                      value={editColorInput}
                      onChange={(e) => { setEditColorInput(e.target.value); setEditColorError(null); }}
                      style={{ width: 110, textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddColor(editColorInput, editColors, setEditColors, setEditColorError)}
                    >
                      + Add Color
                    </button>
                  </div>
                  {editColorError && <div style={{ color: 'var(--color-error)', fontSize: 11, marginBottom: 6 }}>{editColorError}</div>}
                  {editColors.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {editColors.map((color) => (
                        <div
                          key={color}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            fontSize: 12,
                          }}
                        >
                          <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color, border: '1px solid rgba(255,255,255,0.3)' }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{color}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(color, setEditColors)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Tags Management */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Item Tags ({editTags.length}/10)</label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. streetwear, vintage (2-30 chars)"
                      maxLength={30}
                      value={editTagInput}
                      onChange={(e) => { setEditTagInput(e.target.value); setEditTagError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(editTagInput, editTags, setEditTags, setEditTagInput, setEditTagError);
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddTag(editTagInput, editTags, setEditTags, setEditTagInput, setEditTagError)}
                    >
                      + Add Tag
                    </button>
                  </div>
                  {editTagError && <div style={{ color: 'var(--color-error)', fontSize: 11, marginBottom: 6 }}>{editTagError}</div>}
                  {editTags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {editTags.map((tag) => (
                        <span key={tag} className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 12 }}>
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag, setEditTags)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {ITEM_STATUS_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || isConflict}>
                  {saving ? <LoadingGecko size="inline" label="Saving…" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
