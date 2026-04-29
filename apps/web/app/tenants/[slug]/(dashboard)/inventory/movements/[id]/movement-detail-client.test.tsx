import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovementDetailClient } from './movement-detail-client';
import type { InventoryMovementDetailResponse } from '@repo/types';

// Mock next/navigation
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe('MovementDetailClient', () => {
  it('renders movement type badge and reference', () => {
    const movement: InventoryMovementDetailResponse = {
      id: 'mov-1',
      tenantId: 'tenant-1',
      locationId: 'loc-1',
      userId: 'user-1',
      date: new Date('2026-04-28'),
      type: 'OUT',
      reference: 'SALE-xyz',
      notes: null,
      itemCount: 1,
      createdAt: new Date('2026-04-28'),
      createdBy: {
        id: 'user-1',
        name: 'Jane Doe',
      },
      items: [],
    };

    render(<MovementDetailClient movement={movement} />);

    // Should render type badge with "Salida" text
    expect(screen.getByText('Salida')).toBeInTheDocument();
    // Should render reference
    expect(screen.getByText('SALE-xyz')).toBeInTheDocument();
  });

  it('renders items table with beforeStock and afterStock columns', () => {
    const movement: InventoryMovementDetailResponse = {
      id: 'mov-1',
      tenantId: 'tenant-1',
      locationId: 'loc-1',
      userId: 'user-1',
      date: new Date('2026-04-28'),
      type: 'IN',
      reference: 'PURCHASE-abc',
      notes: null,
      itemCount: 1,
      createdAt: new Date('2026-04-28'),
      createdBy: {
        id: 'user-1',
        name: 'John Doe',
      },
      items: [
        {
          id: 'item-1',
          inventoryMovementId: 'mov-1',
          productId: 'prod-1',
          quantity: 20,
          beforeStock: 50,
          afterStock: 70,
          unitPrice: '100.00',
          product: {
            id: 'prod-1',
            name: 'Product A',
            brand: null,
          },
        },
      ],
    };

    render(<MovementDetailClient movement={movement} />);

    // Should render beforeStock value
    expect(screen.getByText('50')).toBeInTheDocument();
    // Should render afterStock value
    expect(screen.getByText('70')).toBeInTheDocument();
    // Should render product name
    expect(screen.getByText('Product A')).toBeInTheDocument();
  });
});
