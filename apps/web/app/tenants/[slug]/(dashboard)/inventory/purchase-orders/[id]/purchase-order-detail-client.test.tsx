import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PurchaseOrderDetailResponse } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('@/app/actions/purchase-orders', () => ({
  updatePurchaseOrderStatusAction: vi.fn(),
}));

vi.mock('./add-order-item-dialog', () => ({
  AddOrderItemDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-item-dialog" /> : null,
}));

vi.mock('../purchase-order-status-badge', () => ({
  PurchaseOrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`badge-${status}`}>{status}</span>
  ),
}));

import { useRouter } from 'next/navigation';
import {
  updatePurchaseOrderStatusAction,
} from '@/app/actions/purchase-orders';
import { PurchaseOrderDetailClient } from './purchase-order-detail-client';

const mockRouterBack = vi.fn();
const mockRouterRefresh = vi.fn();
const ORDER = '11111111-1111-4111-8111-111111111111';
const TENANT = '33333333-3333-4333-8333-333333333333';

function item(o: Partial<{
  id: string; productId: string; quantity: number; unitPrice: string; subtotal: string;
  pName: string; pBrand: string | null;
}> = {}) {
  return {
    id: o.id ?? 'i-1',
    purchaseOrderId: ORDER,
    productId: o.productId ?? 'p-1',
    quantity: o.quantity ?? 5,
    unitPrice: o.unitPrice ?? '150.00',
    subtotal: o.subtotal ?? '750.00',
    createdAt: new Date('2026-01-15'),
    product: { id: 'p-1', name: o.pName ?? 'Guantes', brand: o.pBrand ?? null },
  };
}

function order(overrides: Partial<PurchaseOrderDetailResponse> = {}): PurchaseOrderDetailResponse {
  return {
    id: ORDER,
    tenantId: TENANT,
    supplierId: 's-1',
    locationId: 'l-1',
    userId: 'u-1',
    date: new Date('2026-01-15'),
    status: 'DRAFT',
    notes: null,
    expectedDate: null,
    total: '750.00',
    supplierName: 'Distribuidora Norte',
    locationName: 'Central',
    itemCount: 1,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    items: [item()],
    supplier: { id: 's-1', name: 'Distribuidora Norte', contact: 'Juan', phone: '555', email: 'a@b.com' },
    location: { id: 'l-1', name: 'Central' },
    ...overrides,
  };
}

describe('PurchaseOrderDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), refresh: mockRouterRefresh, back: mockRouterBack,
      forward: vi.fn(), replace: vi.fn(), prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it('shows supplier name and status badge', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    expect(screen.getAllByText('Distribuidora Norte').length).toBeGreaterThan(0);
    expect(screen.getByTestId('badge-DRAFT')).toBeInTheDocument();
  });

  it('shows SENT status badge', () => {
    render(<PurchaseOrderDetailClient order={order({ status: 'SENT' })} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByTestId('badge-SENT')).toBeInTheDocument();
  });

  it('renders items in table', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByText('Guantes')).toBeInTheDocument();
  });

  it('shows total', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    expect(screen.getAllByText('$750.00').length).toBeGreaterThan(0);
  });

  it('shows "Enviar al Proveedor" button in DRAFT for ADMIN', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="ADMIN" userLocationId={null} />);
    expect(screen.getByRole('button', { name: /enviar al proveedor/i })).toBeInTheDocument();
  });

  it('hides action buttons for MANAGER', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="MANAGER" userLocationId={null} />);
    expect(screen.queryByRole('button', { name: /enviar al proveedor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it('shows "Confirmar Orden" in SENT status', () => {
    render(<PurchaseOrderDetailClient order={order({ status: 'SENT' })} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByRole('button', { name: /confirmar orden/i })).toBeInTheDocument();
  });

  it('hides "Cancelar" in CONFIRMED status', () => {
    render(<PurchaseOrderDetailClient order={order({ status: 'CONFIRMED' })} userRole="OWNER" userLocationId={null} />);
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('shows Sprint 19 notice in CONFIRMED', () => {
    render(<PurchaseOrderDetailClient order={order({ status: 'CONFIRMED' })} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByText(/sprint 19/i)).toBeInTheDocument();
  });

  it('shows "Agregar Producto" in DRAFT for OWNER', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByRole('button', { name: /agregar producto/i })).toBeInTheDocument();
  });

  it('shows "Cancelar" button in DRAFT', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('shows empty table when no items', () => {
    render(<PurchaseOrderDetailClient order={order({ items: [] })} userRole="OWNER" userLocationId={null} />);
    expect(screen.getByText(/sin ítems agregados/i)).toBeInTheDocument();
  });

  it('goes back on back button click', () => {
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('calls updateStatus with SENT', async () => {
    vi.mocked(updatePurchaseOrderStatusAction).mockResolvedValue(null);
    render(<PurchaseOrderDetailClient order={order()} userRole="OWNER" userLocationId={null} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar al proveedor/i }));
    await waitFor(() => {
      expect(updatePurchaseOrderStatusAction).toHaveBeenCalledWith(ORDER, 'SENT');
    });
  });

  it('shows multiple items', () => {
    render(
      <PurchaseOrderDetailClient
        order={order({ items: [item({ pName: 'A' }), item({ id: 'i-2', pName: 'B' })] })}
        userRole="OWNER"
        userLocationId={null}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows notes when present', () => {
    render(
      <PurchaseOrderDetailClient
        order={order({ notes: 'Urgente' })}
        userRole="OWNER"
        userLocationId={null}
      />,
    );
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });
});