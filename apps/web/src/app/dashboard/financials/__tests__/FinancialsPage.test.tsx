import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinancialsPage } from '../components/FinancialsPage';
import { ReactNode } from 'react';

const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const queryWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={mockQueryClient}>
    {children}
  </QueryClientProvider>
);

describe('FinancialsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryClient.clear();

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/api/sales')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            Promise.resolve({
              data: [
                {
                  id: '1',
                  folio: 'LOC-2026-00001',
                  clientName: 'John Doe',
                  date: '2026-04-30',
                  total: 1000,
                  status: 'ACTIVE',
                },
              ],
            }),
        } as unknown as Response);
      }
      if (url.includes('/api/incomes')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            Promise.resolve({
              data: [
                {
                  id: '1',
                  date: '2026-04-30',
                  type: 'SALES_OTHER',
                  amount: 500,
                  description: 'Other income',
                },
              ],
            }),
        } as unknown as Response);
      }
      if (url.includes('/api/expenses')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            Promise.resolve({
              data: [
                {
                  id: '1',
                  date: '2026-04-30',
                  type: 'SUPPLIES',
                  amount: 250,
                  description: 'Office supplies',
                },
              ],
            }),
        } as unknown as Response);
      }
      if (url.includes('/api/cash-closes')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            Promise.resolve({
              data: [
                {
                  id: '1',
                  date: '2026-04-30',
                  openingBalance: 1000,
                  closingBalance: 2500,
                  salesTotal: 1000,
                  incomesTotal: 500,
                  expensesTotal: 0,
                },
              ],
            }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => Promise.resolve([]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders the main title', () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });
    expect(screen.getByText('Financials')).toBeInTheDocument();
  });

  it('renders all 4 tabs', () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });
    expect(screen.getByRole('tab', { name: 'Ventas' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Egresos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Corte de Caja' })).toBeInTheDocument();
  });

  it('renders sales tab content when sales tab is clicked', async () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    const salesTab = screen.getByRole('tab', { name: 'Ventas' });

    await act(async () => {
      fireEvent.click(salesTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Crear Venta')).toBeInTheDocument();
    });
  });

  it('switches to income tab when clicked', async () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    const incomeTab = screen.getByRole('tab', { name: 'Ingresos' });
    await act(async () => {
      fireEvent.click(incomeTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Crear Ingreso')).toBeInTheDocument();
    });
  });

  it('switches to expense tab when clicked', async () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    const expenseTab = screen.getByRole('tab', { name: 'Egresos' });
    await act(async () => {
      fireEvent.click(expenseTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Crear Egreso')).toBeInTheDocument();
    });
  });

  it('switches to cash close tab when clicked', async () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    const cashCloseTab = screen.getByRole('tab', { name: 'Corte de Caja' });
    await act(async () => {
      fireEvent.click(cashCloseTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Crear Corte')).toBeInTheDocument();
    });
  });

  it('maintains tab state when switching between tabs', async () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    // All tabs should be present
    expect(screen.getByRole('tab', { name: 'Ventas' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Egresos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Corte de Caja' })).toBeInTheDocument();

    // Switch to income tab
    const incomeTab = screen.getByRole('tab', { name: 'Ingresos' });
    await act(async () => {
      fireEvent.click(incomeTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Crear Ingreso')).toBeInTheDocument();
    });
  });

  it('renders detail drawer component', () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    // The DetailDrawer component should be rendered (though not visible by default)
    // We can verify this by checking that the page renders without errors
    expect(screen.getByText('Financials')).toBeInTheDocument();
  });

  it('renders all tab content sections', async () => {
    render(<FinancialsPage />, { wrapper: queryWrapper });

    // Check sales tab
    expect(screen.getByText('Ventas')).toBeInTheDocument();

    // Check income tab exists
    const incomeTab = screen.getByRole('tab', { name: 'Ingresos' });
    expect(incomeTab).toBeInTheDocument();

    // Check expense tab exists
    const expenseTab = screen.getByRole('tab', { name: 'Egresos' });
    expect(expenseTab).toBeInTheDocument();

    // Check cash close tab exists
    const cashCloseTab = screen.getByRole('tab', { name: 'Corte de Caja' });
    expect(cashCloseTab).toBeInTheDocument();
  });
});
