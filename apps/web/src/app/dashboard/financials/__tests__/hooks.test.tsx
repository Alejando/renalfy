import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSales } from '../hooks/useSales.js';
import { useIncomes } from '../hooks/useIncomes.js';
import { useExpenses } from '../hooks/useExpenses.js';
import { useCashCloses } from '../hooks/useCashCloses.js';
import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useSales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch sales data', async () => {
    const mockSalesData = [
      { id: '1', folio: 'LOC-2026-00001', total: 1000 },
      { id: '2', folio: 'LOC-2026-00002', total: 2000 },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSalesData),
      } as Response)
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useSales(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useIncomes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch incomes data', async () => {
    const mockIncomesData = [
      { id: '1', type: 'SALES_OTHER', amount: 500 },
      { id: '2', type: 'REFUND', amount: 300 },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockIncomesData),
      } as Response)
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useIncomes(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch expenses data', async () => {
    const mockExpensesData = [
      { id: '1', type: 'SUPPLIES', amount: 200 },
      { id: '2', type: 'UTILITIES', amount: 150 },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockExpensesData),
      } as Response)
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useExpenses(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useCashCloses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch cash closes data', async () => {
    const mockCashClosesData = [
      { id: '1', date: '2026-04-30', totalSales: 1000, totalIncomes: 500, totalExpenses: 200 },
      { id: '2', date: '2026-04-29', totalSales: 800, totalIncomes: 400, totalExpenses: 150 },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCashClosesData),
      } as Response)
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCashCloses(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
