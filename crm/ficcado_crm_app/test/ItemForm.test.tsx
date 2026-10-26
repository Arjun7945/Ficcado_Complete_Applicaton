import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ItemsPage, { Item } from '@/app/(app)/dashboard/items/page';

// Mock child components
vi.mock('@/components/LoadingGecko', () => ({
  default: ({ label }: { label?: string }) => <div data-testid="loading">{label || 'Loading'}</div>,
}));

vi.mock('@/components/ItemThumbnail', () => ({
  default: () => <div data-testid="item-thumbnail" />,
}));

vi.mock('@/components/StatusBadge', () => ({
  default: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

const sampleItems: Item[] = [
  {
    rowIndex: 0,
    sno: '1',
    id: 1,
    itemName: 'CLASSIC OVERSIZED TEE',
    itemType: 'T-Shirt',
    price: '999.00',
    costPrice: '450.00',
    sizes: 'M, L, XL',
    status: 'In Stock',
    currentStatus: 'ACTIVE',
    description: 'A premium heavyweight cotton tee.',
    colors: ['#000000', '#FFFFFF'],
    tags: ['streetwear', 'cotton'],
    version: 3,
    images: [],
    reviewCount: 5,
    averageRating: 4.8,
  },
];

describe('ItemsPage Colors, Tags, and AUD-09 Optimistic Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url === '/api/items' && (!opts || opts.method === 'GET' || !opts.method)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: sampleItems }),
        } as any);
      }
      if (url.includes('/images')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([]),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      } as any);
    });
  });

  it('renders items with colors and tags in the table', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('CLASSIC OVERSIZED TEE').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/streetwear/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cotton/).length).toBeGreaterThan(0);
  });

  it('opens edit modal with populated colors, tags, and description', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('CLASSIC OVERSIZED TEE').length).toBeGreaterThan(0);
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit \/ Images/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Edit: CLASSIC OVERSIZED TEE')).toBeDefined();
    expect(screen.getByText('#000000')).toBeDefined();
    expect(screen.getByText('#FFFFFF')).toBeDefined();
    expect(screen.getByDisplayValue('A premium heavyweight cotton tee.')).toBeDefined();
  });

  it('validates color hex input format in edit modal', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('CLASSIC OVERSIZED TEE').length).toBeGreaterThan(0);
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit \/ Images/i });
    fireEvent.click(editBtns[0]);

    const colorTextInput = screen.getByPlaceholderText('#RRGGBB');
    const addColorBtn = screen.getByRole('button', { name: /\+ Add Color/i });

    // Try invalid hex
    fireEvent.change(colorTextInput, { target: { value: 'invalid-hex' } });
    fireEvent.click(addColorBtn);

    expect(screen.getByText('Color must be a valid 6-character hex code (#RRGGBB).')).toBeDefined();

    // Try valid hex
    fireEvent.change(colorTextInput, { target: { value: '#123456' } });
    fireEvent.click(addColorBtn);

    expect(screen.getByText('#123456')).toBeDefined();
  });

  it('displays conflict banner with reload button when optimistic lock fails (409)', async () => {
    (global.fetch as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/api/items' && (!opts || opts.method === 'GET' || !opts.method)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: sampleItems }),
        } as any);
      }
      if (url.includes('/api/items/1') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            code: 'ITEM_VERSION_CONFLICT',
            detail: 'This item was changed by another admin. Reload to see the latest version.',
          }),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ([]),
      } as any);
    });

    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('CLASSIC OVERSIZED TEE').length).toBeGreaterThan(0);
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit \/ Images/i });
    fireEvent.click(editBtns[0]);

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('item-conflict-banner')).toBeDefined();
    });

    expect(screen.getByText(/This item was changed by another admin. Reload to see the latest version./i)).toBeDefined();

    const reloadBtn = screen.getByRole('button', { name: /Reload Item/i });
    expect(reloadBtn).toBeDefined();

    fireEvent.click(reloadBtn);

    // Modal should close on reload
    await waitFor(() => {
      expect(screen.queryByTestId('item-conflict-banner')).toBeNull();
    });
  });
});
