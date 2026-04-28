import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { apiFetch } from '../../lib/api';
import {
  fetchAllProductsForSelectAction,
} from './suppliers';

describe('fetchAllProductsForSelectAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an array of products unwrapped from the paginated response', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      data: [
        { id: 'prod-1', name: 'Producto A' },
        { id: 'prod-2', name: 'Producto B' },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });

    const result = await fetchAllProductsForSelectAction();

    expect(result).toEqual([
      { id: 'prod-1', name: 'Producto A' },
      { id: 'prod-2', name: 'Producto B' },
    ]);
  });

  it('returns an empty array when there are no products', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
    });

    const result = await fetchAllProductsForSelectAction();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
