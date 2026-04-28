import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type {
  PurchaseOrderResponse,
  PaginatedPurchaseOrdersResponse,
} from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../../../../../actions/purchase-orders', () => ({
  fetchSuppliersForSelectAction: vi.fn().mockResolvedValue([]),
  fetchLocationsForSelectAction: vi.fn().mockResolvedValue([]),
  createPurchaseOrderAction: vi.fn(),
}));

vi.mock('./purchase-order-status-badge', () => ({
  PurchaseOrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`status-badge-${status}`}>{status}</span>
  ),
}));

import { useRouter } from 'next/navigation';
import { PurchaseOrdersPageClient } from './purchase-orders-page-client';

const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();

const ORDER_UUID_1 = '11111111-1111-4111-8111-111111111111';
const ORDER_UUID_2 = '22222222-2222-4222-8222-222222222222';
const TENANT_UUID = '33333333-3333-4333-8333-333333333333';

function makeOrder(overrides: Partial<PurchaseOrderResponse> = {}): PurchaseOrderResponse {
  return {
    id: ORDER_UUID_1,
    tenantId: TENANT_UUID,
    supplierId: 'supplier-uuid-1',
    locationId: 'location-uuid-1',
    userId: 'user-uuid-1',
    date: new Date('2026-01-15'),
    status: 'DRAFT',
    notes: null,
    expectedDate: null,
    total: '1500.00',
    supplierName: 'Distribuidora Médica del Norte',
    locationName: 'Sucursal Central',
    itemCount: 3,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeOrders(
  data: PurchaseOrderResponse[] = [makeOrder()],
): PaginatedPurchaseOrdersResponse {
  return { data, total: data.length, page: 1, limit: 20 };
}

describe('PurchaseOrdersPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      refresh: mockRouterRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it('renders page heading', () => {
    render(<PurchaseOrdersPageClient orders={makeOrders()} userRole="OWNER" userLocationId={null} suppliers={[]} />);
    expect(screen.getByRole('heading', { name: /órdenes de compra/i })).toBeInTheDocument();
  });

  it('renders table with order data', () => {
    render(<PurchaseOrdersPageClient orders={makeOrders()} userRole="OWNER" userLocationId={null} suppliers={[]} />);
    expect(screen.getByText('Distribuidora Médica del Norte')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Central')).toBeInTheDocument();
  });

  it('shows empty state when list is empty', () => {
    render(<PurchaseOrdersPageClient orders={makeOrders([])} userRole="OWNER" userLocationId={null} suppliers={[]} />);
    expect(screen.getByText(/sin órdenes/i)).toBeInTheDocument();
  });

  it('shows "Nueva Orden" button for ADMIN', () => {
    render(<PurchaseOrdersPageClient orders={makeOrders()} userRole="ADMIN" userLocationId={null} suppliers={[]} />);
    expect(screen.getByRole('button', { name: /nueva orden/i })).toBeInTheDocument();
  });

  it('does not show "Nueva Orden" button for MANAGER', () => {
    render(<PurchaseOrdersPageClient orders={makeOrders()} userRole="MANAGER" userLocationId={null} suppliers={[]} />);
    expect(screen.queryByRole('button', { name: /nueva orden/i })).not.toBeInTheDocument();
  });

  it('shows status badge for each order', () => {
    render(<PurchaseOrdersPageClient orders={makeOrders()} userRole="OWNER" userLocationId={null} suppliers={[]} />);
    expect(screen.getByTestId('status-badge-DRAFT')).toBeInTheDocument();
  });

  it('shows multiple orders in table', () => {
    const orders = [
      makeOrder({ id: ORDER_UUID_1, supplierName: 'Proveedor A', status: 'DRAFT' }),
      makeOrder({ id: ORDER_UUID_2, supplierName: 'Proveedor B', status: 'SENT' }),
    ];
    render(<PurchaseOrdersPageClient orders={makeOrders(orders)} userRole="OWNER" userLocationId={null} suppliers={[]} />);
    expect(screen.getByText('Proveedor A')).toBeInTheDocument();
    expect(screen.getByText('Proveedor B')).toBeInTheDocument();
  });

  it('shows pagination when total > limit', () => {
    render(
      <PurchaseOrdersPageClient
        orders={{ data: [makeOrder()], total: 25, page: 1, limit: 20 }}
        userRole="OWNER"
        userLocationId={null}
        suppliers={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('does not show pagination when total <= limit', () => {
    render(
      <PurchaseOrdersPageClient
        orders={{ data: [makeOrder()], total: 1, page: 1, limit: 20 }}
        userRole="OWNER"
        userLocationId={null}
        suppliers={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('shows supplier options in the filter select when suppliers are provided', () => {
    const suppliers = [
      { id: 'supplier-1', name: 'Proveedor A' },
      { id: 'supplier-2', name: 'Proveedor B' },
    ];
    render(
      <PurchaseOrdersPageClient
        orders={makeOrders()}
        userRole="OWNER"
        userLocationId={null}
        suppliers={suppliers}
      />,
    );
    expect(screen.getByRole('option', { name: 'Proveedor A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Proveedor B' })).toBeInTheDocument();
  });
});