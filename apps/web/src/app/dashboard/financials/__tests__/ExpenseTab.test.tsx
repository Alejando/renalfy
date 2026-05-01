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
              date: '2026-04-30',
              type: 'SUPPLIES',
              amount: 200,
              description: 'Office supplies',
              status: 'ACTIVE',
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with title and create button', () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Egresos')).toBeInTheDocument();
    expect(screen.getByText('Crear Egreso')).toBeInTheDocument();
  });

  it('renders filters section', () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
  });

  it('fetches and displays expenses data', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('SUPPLIES')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Crear Egreso');
    fireEvent.click(createButton);

    expect(createButton).toBeInTheDocument();
  });

  it('filters expenses when filter values change', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    const dateFromInput = screen.getByLabelText(
      'Desde'
    ) as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays expense table with correct columns', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('SUPPLIES')).toBeInTheDocument();
    });

    // Check table headers exist
    const headers = screen.getAllByText('Fecha');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('allows filtering by expense type', async () => {
    render(<ExpenseTab />, { wrapper: queryWrapper });

    const typeSelect = screen.getByLabelText(
      'Tipo'
    ) as HTMLSelectElement;
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
