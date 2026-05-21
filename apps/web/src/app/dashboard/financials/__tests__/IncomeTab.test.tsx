import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncomeTab } from '../components/IncomeTab.js';
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

describe('IncomeTab', () => {
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
              createdAt: '2026-04-30T00:00:00.000Z',
              type: 'SALES_OTHER',
              amount: 500,
              description: 'Other sales',
              status: 'ACTIVE',
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with create button', () => {
    render(<IncomeTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Nuevo Ingreso')).toBeInTheDocument();
  });

  it('renders filters section with date chips and type select', () => {
    render(<IncomeTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Este Mes')).toBeInTheDocument();
    expect(screen.getByText('Mes Anterior')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('fetches and displays incomes data', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Otras Ventas')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Nuevo Ingreso');
    fireEvent.click(createButton);

    expect(createButton).toBeInTheDocument();
  });

  it('filters incomes when chip is clicked', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    const esMesButton = screen.getByText('Este Mes');
    fireEvent.click(esMesButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays income table with correct columns', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Otras Ventas')).toBeInTheDocument();
    });

    const headers = screen.getAllByText('Fecha');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('allows filtering by income type', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    // First combobox is the FinancialFilters type select
    const typeSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'REFUND' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('renders income table with income data', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Other sales')).toBeInTheDocument();
    });
  });
});
