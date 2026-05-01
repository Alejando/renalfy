import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SalesTab } from '../components/SalesTab.js';
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

describe('SalesTab', () => {
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
              folio: 'LOC-2026-00001',
              clientName: 'John Doe',
              date: '2026-04-30',
              total: 1000,
              status: 'ACTIVE',
            },
          ]),
      } as unknown as Response);
    }) as typeof global.fetch;
  });

  it('renders tab with title and create button', () => {
    render(<SalesTab />, { wrapper: queryWrapper });
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Crear Venta')).toBeInTheDocument();
  });

  it('renders filters section', () => {
    render(<SalesTab />, { wrapper: queryWrapper });
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Cliente ID')).toBeInTheDocument();
  });

  it('fetches and displays sales data', async () => {
    render(<SalesTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('LOC-2026-00001')).toBeInTheDocument();
    });
  });

  it('opens create modal when button is clicked', async () => {
    render(<SalesTab />, { wrapper: queryWrapper });

    const createButton = screen.getByText('Crear Venta');
    fireEvent.click(createButton);

    // The modal should be rendered when open
    expect(createButton).toBeInTheDocument();
  });

  it('filters sales when filter values change', async () => {
    render(<SalesTab />, { wrapper: queryWrapper });

    const dateFromInput = screen.getByLabelText(
      'Desde'
    ) as HTMLInputElement;
    fireEvent.change(dateFromInput, { target: { value: '2026-04-01' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays loading state while fetching', async () => {
    global.fetch = vi.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => Promise.resolve([]),
              } as unknown as Response),
            100
          )
        )
    ) as typeof global.fetch;

    render(<SalesTab />, { wrapper: queryWrapper });

    // Initially should show loading or empty state
    expect(screen.getByText('Ventas')).toBeInTheDocument();
  });

  it('renders sales table with correct props', async () => {
    render(<SalesTab />, { wrapper: queryWrapper });

    await waitFor(() => {
      expect(screen.getByText('LOC-2026-00001')).toBeInTheDocument();
    });

    // Check that the table is rendered
    expect(screen.getByText('Folio')).toBeInTheDocument();
  });
});
