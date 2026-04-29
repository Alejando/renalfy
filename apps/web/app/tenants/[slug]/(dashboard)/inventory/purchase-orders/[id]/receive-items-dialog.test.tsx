import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PurchaseOrderDetailResponse } from '@repo/types';
import type { useRouter as useRouterType } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('@/app/actions/purchases', () => ({
  receivePurchaseAction: vi.fn().mockResolvedValue(null),
}));

import { useRouter } from 'next/navigation';
import { receivePurchaseAction } from '@/app/actions/purchases';
import { ReceiveItemsDialog } from './receive-items-dialog';

const mockRouter = {
  refresh: vi.fn(),
  back: vi.fn(),
};

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const LOCATION_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

function mockPurchaseOrder(overrides: Partial<PurchaseOrderDetailResponse> = {}): PurchaseOrderDetailResponse {
  return {
    id: ORDER_ID,
    tenantId: '44444444-4444-4444-8444-444444444444',
    supplierId: '55555555-5555-4555-8555-555555555555',
    locationId: LOCATION_ID,
    userId: '66666666-6666-4666-8666-666666666666',
    date: new Date('2026-04-28'),
    status: 'CONFIRMED' as const,
    notes: null,
    expectedDate: null,
    total: '1500.00',
    supplierName: 'Distribuidora Médica',
    locationName: 'Sucursal Norte',
    itemCount: 1,
    createdAt: new Date('2026-04-28'),
    updatedAt: new Date('2026-04-28'),
    items: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        purchaseOrderId: ORDER_ID,
        productId: PRODUCT_ID,
        quantity: 100,
        unitsPerPackage: 12,
        unitPrice: '100.00',
        tax: '0.00',
        subtotal: '10000.00',
        createdAt: new Date('2026-04-28'),
        product: {
          id: PRODUCT_ID,
          name: 'Dialysis Solution 2L',
          brand: 'MedBrand',
        },
      },
    ],
    supplier: {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Distribuidora Médica',
      contact: 'Juan Pérez',
      phone: '5551234567',
      email: 'info@distribuidora.mx',
    },
    location: {
      id: LOCATION_ID,
      name: 'Sucursal Norte',
    },
    ...overrides,
  };
}

describe('ReceiveItemsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouterType>);
  });

  it('renders dialog with product name and inputs for each item', () => {
    const order = mockPurchaseOrder();

    render(
      <ReceiveItemsDialog
        order={order}
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Dialysis Solution 2L')).toBeInTheDocument();
    expect(screen.getByLabelText(/cantidad recibida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unidades por empaque/i)).toBeInTheDocument();
  });

  it('calculates and displays stockDelta when quantityReceived and unitsPerPackage change', async () => {
    const user = userEvent.setup();
    const order = mockPurchaseOrder();

    render(
      <ReceiveItemsDialog
        order={order}
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const quantityInput = screen.getByLabelText(/cantidad recibida/i);
    const unitsInput = screen.getByLabelText(/unidades por empaque/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, '5');
    await user.clear(unitsInput);
    await user.type(unitsInput, '12');

    await waitFor(() => {
      expect(screen.getByText(/60/)).toBeInTheDocument();
    });
  });

  it('calls receivePurchaseAction and calls onSuccess on successful submit', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    const order = mockPurchaseOrder();
    const mockReceiveAction = vi.mocked(receivePurchaseAction);

    render(
      <ReceiveItemsDialog
        order={order}
        open={true}
        onClose={vi.fn()}
        onSuccess={mockOnSuccess}
      />
    );

    const quantityInput = screen.getByLabelText(/cantidad recibida/i);
    const unitsInput = screen.getByLabelText(/unidades por empaque/i);
    const submitButton = screen.getByRole('button', { name: /recibir artículos/i });

    await user.clear(quantityInput);
    await user.type(quantityInput, '5');
    await user.clear(unitsInput);
    await user.type(unitsInput, '12');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockReceiveAction).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
