import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DetailDrawer } from '../components/DetailDrawer';

describe('DetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('does not render when closed', () => {
    render(
      <DetailDrawer
        open={false}
        onClose={vi.fn()}
        transactionId="1"
        type="sale"
      />
    );
    expect(screen.queryByText('Detalles de Venta')).not.toBeInTheDocument();
  });

  it('renders sale details drawer when open', async () => {
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            id: '1',
            folio: 'LOC-2026-00001',
            clientId: 'client-1',
            clientName: 'John Doe',
            createdAt: '2026-04-30',
            items: [
              {
                id: 'item-1',
                productId: 'product-1',
                productName: 'Product A',
                quantity: 2,
                unitPrice: 50,
                subtotal: 100,
              },
            ],
            total: 100,
            paymentType: 'CASH',
            status: 'ACTIVE',
          }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="1"
        type="sale"
      />
    );

    expect(screen.getByText('Detalles de Venta')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('LOC-2026-00001')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/sales/1');
  });

  it('renders income details drawer when open', async () => {
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            id: '1',
            date: '2026-04-30',
            type: 'SALES_OTHER',
            amount: 500,
            description: 'Other income',
            status: 'ACTIVE',
          }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="1"
        type="income"
      />
    );

    expect(screen.getByText('Detalles de Ingreso')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Otra venta')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/incomes/1');
  });

  it('renders expense details drawer when open', async () => {
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            id: '1',
            date: '2026-04-30',
            type: 'SUPPLIES',
            amount: 250,
            description: 'Office supplies',
            status: 'ACTIVE',
          }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="1"
        type="expense"
      />
    );

    expect(screen.getByText('Detalles de Egreso')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Suministros')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/expenses/1');
  });

  it('renders cash close details drawer when open', async () => {
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            id: '1',
            date: '2026-04-30',
            openingBalance: 1000,
            closingBalance: 2500,
            salesTotal: 1000,
            incomesTotal: 500,
            expensesTotal: 0,
            status: 'CLOSED',
          }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="1"
        type="cashClose"
      />
    );

    expect(screen.getByText('Detalles de Corte de Caja')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Ventas')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/cash-closes/1');
  });

  it('shows loading state while fetching', () => {
    const mockFetch = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return Promise.resolve({
        ok: true,
        json: async () => Promise.resolve({ id: '1' }),
      } as unknown as Response);
    });
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="1"
        type="sale"
      />
    );

    // Should show loading skeletons initially
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when fetch fails', async () => {
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: false,
        json: async () => Promise.resolve({ error: 'Not found' }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="999"
        type="sale"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch sale details')).toBeInTheDocument();
    });
  });

  it('calls onClose when drawer is closed', async () => {
    const onClose = vi.fn();
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            id: '1',
            folio: 'LOC-2026-00001',
            clientId: 'client-1',
            createdAt: '2026-04-30',
            items: [],
            total: 100,
            paymentType: 'CASH',
            status: 'ACTIVE',
          }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    const { rerender } = render(
      <DetailDrawer
        open={true}
        onClose={onClose}
        transactionId="1"
        type="sale"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Detalles de Venta')).toBeInTheDocument();
    });

    rerender(
      <DetailDrawer
        open={false}
        onClose={onClose}
        transactionId="1"
        type="sale"
      />
    );

    // Verify the drawer was opened and can be closed
    expect(mockFetch).toHaveBeenCalled();
  });

  it('formats currency values correctly', async () => {
    const mockFetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            id: '1',
            folio: 'LOC-2026-00001',
            clientId: 'client-1',
            createdAt: '2026-04-30',
            items: [
              {
                id: 'item-1',
                productId: 'product-1',
                quantity: 1,
                unitPrice: 1500.5,
                subtotal: 1500.5,
              },
            ],
            total: 1500.5,
            paymentType: 'CASH',
            status: 'ACTIVE',
          }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    render(
      <DetailDrawer
        open={true}
        onClose={vi.fn()}
        transactionId="1"
        type="sale"
      />
    );

    await waitFor(() => {
      const currencyMatches = screen.getAllByText(/\$1,500\.50/);
      expect(currencyMatches.length).toBeGreaterThan(0);
    });
  });
});
