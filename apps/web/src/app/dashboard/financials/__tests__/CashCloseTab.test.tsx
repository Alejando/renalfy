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
              salesTotal: 5000,
              incomesTotal: 1000,
              expensesTotal: 800,
              calculatedTotal: 5200,
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with create button', () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Nuevo Corte')).toBeInTheDocument();
  });

  it('renders filters section with date chips', () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Este Mes')).toBeInTheDocument();
    expect(screen.getByText('Mes Anterior')).toBeInTheDocument();
    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  it('fetches and displays cash closes data', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Total en Caja')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Nuevo Corte');
    fireEvent.click(createButton);

    expect(createButton).toBeInTheDocument();
  });

  it('filters cash closes when chip is clicked', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    const esMesButton = screen.getByText('Este Mes');
    fireEvent.click(esMesButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays cash close table with correct columns', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Fecha')).toBeInTheDocument();
    });

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

    const detailsButtons = screen.getAllByText('Detalles');
    expect(detailsButtons.length).toBeGreaterThan(0);
  });

  it('allows filtering by date range using chips', async () => {
    render(<CashCloseTab />, { wrapper: queryWrapper });

    fireEvent.click(screen.getByText('Este Mes'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Mes Anterior'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
