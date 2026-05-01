import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSales } from '../hooks/useSales';
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
