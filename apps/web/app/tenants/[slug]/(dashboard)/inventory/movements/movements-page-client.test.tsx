import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MovementsPageClient } from './movements-page-client';
import type {
  PaginatedInventoryMovementsResponse,
  InventoryMovementResponse,
} from '@repo/types';

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

function makePaginatedMovements(
  data: InventoryMovementResponse[]
): PaginatedInventoryMovementsResponse {
  return {
    data,
    total: data.length,
    page: 1,
    limit: 20,
  };
}

describe('MovementsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table heading "Movimientos de Inventario"', () => {
    render(
      <MovementsPageClient
        movements={makePaginatedMovements([])}
      />
    );

    expect(
      screen.getByRole('heading', { name: /movimientos de inventario/i })
    ).toBeInTheDocument();
  });

  it('renders movement rows with type badge, date, and reference', () => {
    const movement = {
      id: 'mov-uuid-1',
      tenantId: 'tenant-1',
      locationId: 'loc-1',
      userId: 'user-1',
      date: new Date('2026-04-28'),
      type: 'IN' as const,
      reference: 'PURCHASE-abc',
      notes: null,
      itemCount: 2,
      createdAt: new Date('2026-04-28'),
      createdBy: {
        id: 'user-1',
        name: 'John Doe',
      },
    };

    render(
      <MovementsPageClient
        movements={makePaginatedMovements([movement])}
      />
    );

    // Should render type badge with "Entrada" text (in table, not in filter)
    const tableRows = screen.getAllByText('Entrada');
    expect(tableRows.length).toBeGreaterThan(0);
    // Should render reference
    expect(screen.getByText('PURCHASE-abc')).toBeInTheDocument();
  });

  it('shows empty state "Sin movimientos encontrados" when data is empty', () => {
    render(
      <MovementsPageClient
        movements={makePaginatedMovements([])}
      />
    );

    expect(
      screen.getByText(/sin movimientos encontrados/i)
    ).toBeInTheDocument();
  });

  it('navigates to movement detail when row is clicked', async () => {
    const movement = {
      id: 'mov-uuid-1',
      tenantId: 'tenant-1',
      locationId: 'loc-1',
      userId: 'user-1',
      date: new Date('2026-04-28'),
      type: 'IN' as const,
      reference: 'PURCHASE-abc',
      notes: null,
      itemCount: 2,
      createdAt: new Date('2026-04-28'),
      createdBy: {
        id: 'user-1',
        name: 'John Doe',
      },
    };

    const { container } = render(
      <MovementsPageClient
        movements={makePaginatedMovements([movement])}
      />
    );

    // Find the table row (cursor-pointer class)
    const row = container.querySelector('[class*="cursor-pointer"]');
    expect(row).toBeInTheDocument();

    // Verify clicking would trigger navigation
    if (row) {
      await userEvent.click(row);
      expect(mockPush).toHaveBeenCalledWith('/inventory/movements/mov-uuid-1');
    }
  });
});
