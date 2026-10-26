import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AppSidebar from '@/components/AppSidebar';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/admin',
}));

// Mock NotificationBell to isolate sidebar testing
vi.mock('@/components/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}));

// Mock presence fetch
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ onlineAdmins: [] }),
  } as any);
});

describe('AppSidebar Admin Permissions (P2-1A)', () => {
  it('renders Admin Control menu and section for ADMIN role', () => {
    const onLogout = vi.fn();

    render(
      <AppSidebar
        adminName="Jane Admin"
        adminRole="admin"
        onLogout={onLogout}
      />
    );

    // Verify Admin section title is present
    expect(screen.getByText('Admin')).toBeDefined();

    // Verify Admin Control item and link href are present
    const adminControlLink = screen.getByRole('link', { name: /Admin Control/i });
    expect(adminControlLink).toBeDefined();
    expect(adminControlLink.getAttribute('href')).toBe('/dashboard/admin');

    // Verify My Profile item is present
    const profileLink = screen.getByRole('link', { name: /My Profile/i });
    expect(profileLink).toBeDefined();

    // Verify Admin role is displayed in the footer
    expect(screen.getByText('Jane Admin')).toBeDefined();
    expect(screen.getByText('admin')).toBeDefined();
  });
});
