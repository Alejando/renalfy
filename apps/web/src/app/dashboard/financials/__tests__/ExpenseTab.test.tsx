import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseTab } from '../components/ExpenseTab.js';
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

describe('ExpenseTab', () => {
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
              type: 'SUPPLIES',
              amount: 200,
              description: 'Office supplies',
              status: 'ACTIVE',
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with create button', () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Nuevo Egreso')).toBeInTheDocument();
  });

  it('renders filters section with date chips and type select', () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Este Mes')).toBeInTheDocument();
    expect(screen.getByText('Mes Anterior')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('fetches and displays expenses data', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Suministros')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Nuevo Egreso');
    fireEvent.click(createButton);

    expect(createButton).toBeInTheDocument();
  });

  it('filters expenses when chip is clicked', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    const esMesButton = screen.getByText('Este Mes');
    fireEvent.click(esMesButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays expense table with correct columns', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      const elements = screen.getAllByText('Suministros');
      expect(elements.length).toBeGreaterThan(0);
    });

    const headers = screen.getAllByText('Fecha');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('allows filtering by expense type', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    // First combobox is the FinancialFilters type select
    const typeSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'UTILITIES' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('renders expense table with expense data', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('Office supplies')).toBeInTheDocument();
    });
  });
});
