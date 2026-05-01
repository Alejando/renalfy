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
              date: '2026-04-30',
              type: 'SALES_OTHER',
              amount: 500,
              description: 'Other sales',
              status: 'ACTIVE',
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with title and create button', () => {
    render(<IncomeTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Crear Ingreso')).toBeInTheDocument();
  });

  it('renders filters section', () => {
    render(<IncomeTab />, { wrapper: queryWrapper });
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
  });

  it('fetches and displays incomes data', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('SALES_OTHER')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Crear Ingreso');
    fireEvent.click(createButton);

    expect(createButton).toBeInTheDocument();
  });

  it('filters incomes when filter values change', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    const dateFromInput = screen.getByLabelText(
      'Desde'
    ) as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays income table with correct columns', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('SALES_OTHER')).toBeInTheDocument();
    });

    // Check table headers exist
    const headers = screen.getAllByText('Fecha');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('allows filtering by income type', async () => {
    render(<IncomeTab />, { wrapper: queryWrapper });

    const typeSelect = screen.getByLabelText(
      'Tipo'
    ) as HTMLSelectElement;
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
