'use server';

import { apiFetch } from '../../lib/api';
import type { PaginatedInventoryMovementsResponse, InventoryMovementDetailResponse } from '@repo/types';

export async function fetchInventoryMovementsAction(query: {
  page?: number;
  limit?: number;
  type?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  reference?: string;
}): Promise<PaginatedInventoryMovementsResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.type) params.set('type', query.type);
  if (query.productId) params.set('productId', query.productId);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  if (query.reference) params.set('reference', query.reference);

  return apiFetch<PaginatedInventoryMovementsResponse>(
    `/inventory-movements?${params.toString()}`
  );
}

export async function fetchInventoryMovementAction(
  id: string
): Promise<InventoryMovementDetailResponse> {
  return apiFetch<InventoryMovementDetailResponse>(`/inventory-movements/${id}`);
}
