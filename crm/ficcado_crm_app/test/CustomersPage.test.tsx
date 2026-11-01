import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomersPage from '@/app/(app)/dashboard/customers/page';

// Mock child components
vi.mock('@/components/LoadingGecko', () => ({
  default: ({ label }: { label?: string }) => <div data-testid="loading">{label || 'Loading'}</div>,
}));

const mockCustomers = Array.from({ length: 15 }, (_, i) => ({
  sno: String(i + 1),
  name: `Customer ${i + 1}`,
  phone: `98765432${i.toString().padStart(2, '0')}`,
  addresses: [{ label: 'Home', address: `${i + 1} Park Street, Bangalore` }],
  address: `${i + 1} Park Street, Bangalore`,
  email: `customer${i + 1}@ficcado.com`,
  totalOrders: `${(i % 5) + 1}`,
  invoiceNumbers: `INV-2026-00${i + 1}`,
  createdAt: '2026-01-15T10:00:00Z',
}));

describe('CustomersPage Component & Modal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url === '/api/customer-info' && (!opts || !opts.method || opts.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ customers: mockCustomers }),
        } as any);
      }
      if (url === '/api/sales') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ sales: [] }),
        } as any);
      }
      if (url === '/api/customer-info' && opts?.method === 'PUT') {
        const body = JSON.parse(opts.body);
        if (body.email === 'conflict@ficcado.com') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({ error: 'Email is already registered to another customer: conflict@ficcado.com' }),
          } as any);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            customer: {
              ...mockCustomers[0],
              name: body.name,
              email: body.email,
              addresses: body.addresses,
            },
          }),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as any);
    });
  });

  it('renders customer list and pagination controls with correct page slice', async () => {
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    // Check first page shows customer 1 to 10 in both views
    expect(screen.getAllByText('Customer 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Customer 10').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Customer 11').length).toBe(0);

    // Check pagination summary
    expect(screen.getByText(/Showing/)).toBeDefined();
    expect(screen.getAllByText('15').length).toBeGreaterThan(0); // total customers
  });

  it('navigates to next page when clicking next button', async () => {
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const nextBtn = screen.getByRole('button', { name: /Next ›/ });
    fireEvent.click(nextBtn);

    // Page 2 should now show customer 11 to 15
    await waitFor(() => {
      expect(screen.getAllByText('Customer 11').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Customer 15').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Customer 1').length).toBe(0);
    });
  });

  it('opens centered pop-up modal when clicking View / Edit Profile', async () => {
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const viewButtons = screen.getAllByRole('button', { name: /View \/ Edit Profile/ });
    fireEvent.click(viewButtons[0]);

    // Modal pops up
    await waitFor(() => {
      expect(screen.getByText('Customer Profile & Order History')).toBeDefined();
      expect(screen.getByDisplayValue('Customer 1')).toBeDefined();
      expect(screen.getByDisplayValue('customer1@ficcado.com')).toBeDefined();
      expect(screen.getByDisplayValue('9876543200')).toBeDefined();
    });
  });

  it('saves customer profile updates and displays success message', async () => {
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const viewButtons = screen.getAllByRole('button', { name: /View \/ Edit Profile/ });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Customer 1')).toBeDefined();
    });

    // Edit customer name
    const nameInput = screen.getByDisplayValue('Customer 1');
    fireEvent.change(nameInput, { target: { value: 'Customer 1 Updated' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Customer Changes/ });
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Customer profile updated successfully.')).toBeDefined();
    });
  });

  it('displays backend error message if update fails with conflict', async () => {
    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    const viewButtons = screen.getAllByRole('button', { name: /View \/ Edit Profile/ });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('customer1@ficcado.com')).toBeDefined();
    });

    // Enter conflicting email
    const emailInput = screen.getByDisplayValue('customer1@ficcado.com');
    fireEvent.change(emailInput, { target: { value: 'conflict@ficcado.com' } });

    const saveBtn = screen.getByRole('button', { name: /Save Customer Changes/ });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Email is already registered to another customer/)).toBeDefined();
    });
  });
});
