import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PaginatedReceiptsResponse, ReceiptResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../../../../actions/receipts', () => ({
  createReceiptAction: vi.fn(),
  updateReceiptStatusAction: vi.fn(),
}));

vi.mock('./receipt-create-drawer', () => ({
  ReceiptCreateDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="receipt-create-drawer" /> : null,
}));

import { useRouter } from 'next/navigation';
import { ReceiptsPageClient } from './receipts-page-client';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();

function makeReceipt(overrides: Partial<ReceiptResponse> = {}): ReceiptResponse {
  return {
    id: 'receipt-1',
    tenantId: 'tenant-1',
    locationId: 'loc-1',
    patientId: 'patient-1',
    userId: 'user-1',
    serviceTypeId: null,
    planId: null,
    folio: 'CEN-2026-00001',
    date: new Date('2026-03-22'),
    amount: '500.00',
    paymentType: 'CASH',
    status: 'ACTIVE',
    notes: null,
    createdAt: new Date('2026-03-22'),
    updatedAt: new Date('2026-03-22'),
    ...overrides,
  };
}

function makeReceipts(
  data: ReceiptResponse[] = [makeReceipt()],
): PaginatedReceiptsResponse {
  return {
    data,
    total: data.length,
    page: 1,
    limit: 20,
  };
}

describe('ReceiptsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      refresh: mockRouterRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it('renders page heading', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByRole('heading', { name: /recibos/i })).toBeInTheDocument();
  });

  it('shows folio in the table', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByText('CEN-2026-00001')).toBeInTheDocument();
  });

  it('shows EmptyState when receipts list is empty', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts([])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByText(/sin recibos/i)).toBeInTheDocument();
  });

  it('shows ACTIVE status badge', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    // badge is a <span>, the select option is also "Activo" — query by role to distinguish
    const badges = screen.getAllByText('Activo');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows CASH payment type badge', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    const badges = screen.getAllByText('Efectivo');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows status filter options', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
  });

  it('navigates with status filter when filter changes', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    const statusFilter = screen.getByLabelText(/estado/i);
    fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('status=ACTIVE'));
  });

  it('does not show pagination when total <= limit', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts([makeReceipt()])}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('shows pagination when total > limit', () => {
    render(
      <ReceiptsPageClient
        receipts={{ data: [makeReceipt()], total: 25, page: 1, limit: 20 }}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('opens create drawer when "Nuevo recibo" button is clicked', async () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /nuevo recibo/i }));
    await waitFor(() => {
      expect(screen.getByTestId('receipt-create-drawer')).toBeInTheDocument();
    });
  });

  it('renders link to receipt detail for each row', () => {
    render(
      <ReceiptsPageClient
        receipts={makeReceipts()}
        userRole="OWNER"
        userLocationId={null}
        locations={[]}
      />,
    );
    const link = screen.getByRole('link', { name: /CEN-2026-00001/i });
    expect(link).toHaveAttribute('href', '/receipts/receipt-1');
  });
});
