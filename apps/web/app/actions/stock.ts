'use server';

import { revalidatePath } from 'next/cache';
import {
  UpsertLocationStockSchema,
  StockQuantityAdjustmentSchema,
  type PaginatedStockResponse,
  type PaginatedStockSummaryResponse,
  type LocationStockResponse,
  type StockQuery,
  type StockSummaryQuery,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type StockActionState = { error: string } | null;

export async function fetchStockAction(
  query: Partial<StockQuery> & { page: number; limit: number } = { page: 1, limit: 20 },
): Promise<PaginatedStockResponse> {
  const params = new URLSearchParams();
  params.set('page', query.page.toString());
  params.set('limit', query.limit.toString());
  if (query.locationId) params.set('locationId', query.locationId);
  if (query.onlyLowStock) params.set('onlyLowStock', 'true');
  if (query.search) params.set('search', query.search);
  return apiFetch<PaginatedStockResponse>(`/stock?${params.toString()}`);
}

export async function fetchStockSummaryAction(
  query: StockSummaryQuery = { page: 1, limit: 20 },
): Promise<PaginatedStockSummaryResponse> {
  const params = new URLSearchParams();
  params.set('page', query.page.toString());
  params.set('limit', query.limit.toString());
  if (query.isAnyLocationBelowAlert) {
    params.set('isAnyLocationBelowAlert', 'true');
  }
  return apiFetch<PaginatedStockSummaryResponse>(
    `/stock/summary?${params.toString()}`,
  );
}

export async function fetchLocationStockAction(id: string): Promise<LocationStockResponse> {
  return apiFetch<LocationStockResponse>(`/stock/${id}`);
}

export async function upsertLocationStockAction(
  data: {
    locationId: string;
    productId: string;
    minStock?: number;
    alertLevel?: number;
    packageQty?: number | null;
  },
): Promise<StockActionState> {
  const result = UpsertLocationStockSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/stock/by-location', {
      method: 'PUT',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al configurar stock' };
  }

  revalidatePath('/inventory/stock');
  revalidatePath('/inventory/products');
  return null;
}

export async function adjustStockQuantityAction(
  _prev: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de stock requerido' };
  }

  const adjustmentType = formData.get('adjustmentType') as string;
  const quantityStr = formData.get('quantity');
  const deltaStr = formData.get('delta');

  let data: Record<string, unknown>;
  if (adjustmentType === 'SET' && quantityStr != null) {
    data = { adjustmentType: 'SET', quantity: Number(quantityStr) };
  } else if (adjustmentType === 'DELTA' && deltaStr != null) {
    data = { adjustmentType: 'DELTA', delta: Number(deltaStr) };
  } else {
    return { error: 'Tipo de ajuste inválido o valor no proporcionado' };
  }

  const result = StockQuantityAdjustmentSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/stock/${id}/quantity`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al ajustar cantidad' };
  }

  revalidatePath('/inventory/stock');
  revalidatePath('/inventory/products');
  return null;
}
