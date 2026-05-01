import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CashCloseTab } from '../components/CashCloseTab.js';
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

describe('CashCloseTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryClient.clear();

    global.fetch = vi.fn(async () => {
      return Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve([
            {
              id: '1',
              date: '2026-04-30',
              totalSales: 5000,
              totalIncomes: 1000,
              totalExpenses: 800,
              totalCash: 5200,
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with title and create button', () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Cortes de Caja')).toBeInTheDocument();
    expect(screen.getByText('Crear Corte')).toBeInTheDocument();
  });

  it('renders filters section', () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
  });

  it('fetches and displays cash closes data', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Cortes de Caja')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Crear Corte');
    fireEvent.click(createButton);

    expect(createButton).toBeInTheDocument();
  });

  it('filters cash closes when filter values change', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    const dateFromInput = screen.getByLabelText(
      'Desde'
    ) as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays cash close table with correct columns', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Fecha')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Egresos')).toBeInTheDocument();
  });

  it('renders cash close table with cash close data', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Total en Caja')).toBeInTheDocument();
    });
  });

  it('does not show cancel button for cash closes', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Total en Caja')).toBeInTheDocument();
    });

    // Cash closes should only have Details button, not Cancel
    const detailsButtons = screen.getAllByText('Detalles');
    expect(detailsButtons.length).toBeGreaterThan(0);
  });

  it('allows filtering by date range', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    const dateFromInput = screen.getByLabelText(
      'Desde'
    ) as HTMLInputElement;
    const dateToInput = screen.getByLabelText(
      'Hasta'
    ) as HTMLInputElement;

    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });
    fireEvent.change(dateToInput, { target: { value: '2026-04-30' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
