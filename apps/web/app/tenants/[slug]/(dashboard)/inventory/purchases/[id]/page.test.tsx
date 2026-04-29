import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SessionUser } from '@/lib/session';
import PurchaseDetailPage from './page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

// Mock getSessionUser
vi.mock('@/lib/session', () => ({
  getSessionUser: vi.fn(),
}));

describe('PurchaseDetailPage', () => {
  it('should render error when user is not authenticated', async () => {
    const { getSessionUser } = await import('@/lib/session');
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const element = await PurchaseDetailPage({
      params: Promise.resolve({ slug: 'test-clinic', id: 'test-id' }),
    });

    render(element);
    expect(screen.getByText(/permiso/i)).toBeInTheDocument();
  });

  it('should render error when user has STAFF role', async () => {
    const { getSessionUser } = await import('@/lib/session');
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: 'user-id',
      role: 'STAFF',
      tenantId: 'tenant-id',
      locationId: 'location-id',
    } as SessionUser);

    const element = await PurchaseDetailPage({
      params: Promise.resolve({ slug: 'test-clinic', id: 'test-id' }),
    });

    render(element);
    expect(screen.getByText(/permiso.*compras/i)).toBeInTheDocument();
  });
});
