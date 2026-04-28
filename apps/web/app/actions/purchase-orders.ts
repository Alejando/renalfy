'use server';

import { revalidatePath } from 'next/cache';
import {
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
  AddPurchaseOrderItemSchema,
  UpdatePurchaseOrderItemSchema,
  type PaginatedPurchaseOrdersResponse,
  type PurchaseOrderDetailResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type PurchaseOrderActionState = { error: string; orderId?: never } | { orderId: string; error?: never } | null;

interface LocationSummary {
  id: string;
  name: string;
}

export async function fetchPurchaseOrdersAction(
  query: {
    page?: number;
    limit?: number;
    supplierId?: string;
    locationId?: string;
    status?: string;
    search?: string;
  } = {},
): Promise<PaginatedPurchaseOrdersResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', query.page.toString());
  if (query.limit) params.set('limit', query.limit.toString());
  if (query.supplierId) params.set('supplierId', query.supplierId);
  if (query.locationId) params.set('locationId', query.locationId);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  const queryString = params.toString();
  return apiFetch<PaginatedPurchaseOrdersResponse>(
    `/purchase-orders${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchPurchaseOrderAction(
  id: string,
): Promise<PurchaseOrderDetailResponse> {
  return apiFetch<PurchaseOrderDetailResponse>(`/purchase-orders/${id}`);
}

export async function createPurchaseOrderAction(
  _prev: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const rawData = {
    supplierId: formData.get('supplierId'),
    locationId: formData.get('locationId'),
    expectedDate: formData.get('expectedDate') || undefined,
    notes: formData.get('notes') || undefined,
  };

  const result = CreatePurchaseOrderSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const created = await apiFetch<{ id: string }>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
    revalidatePath('/inventory/purchase-orders');
    return { orderId: created.id };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear orden' };
  }
}

export async function updatePurchaseOrderAction(
  _prev: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de orden requerido' };
  }

  const rawData = {
    expectedDate: formData.get('expectedDate') || undefined,
    notes: formData.get('notes') || undefined,
  };

  const result = UpdatePurchaseOrderSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar orden' };
  }

  revalidatePath('/inventory/purchase-orders');
  return null;
}

export async function updatePurchaseOrderStatusAction(
  id: string,
  status: 'SENT' | 'CONFIRMED' | 'CANCELLED',
): Promise<PurchaseOrderActionState> {
  try {
    await apiFetch(`/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar estado' };
  }

  revalidatePath('/inventory/purchase-orders');
  revalidatePath(`/inventory/purchase-orders/${id}`);
  return null;
}

export async function addOrderItemAction(
  _prev: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const orderId = formData.get('orderId') as string;
  if (!orderId) {
    return { error: 'ID de orden requerido' };
  }

  const rawData = {
    productId: formData.get('productId'),
    quantity: Number(formData.get('quantity')),
    unitPrice: formData.get('unitPrice'),
  };

  const result = AddPurchaseOrderItemSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/purchase-orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al agregar ítem' };
  }

  revalidatePath(`/inventory/purchase-orders/${orderId}`);
  return null;
}

export async function updateOrderItemAction(
  _prev: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const orderId = formData.get('orderId') as string;
  const itemId = formData.get('itemId') as string;
  if (!orderId || !itemId) {
    return { error: 'ID de orden e ítem requeridos' };
  }

  const rawData = {
    quantity: formData.get('quantity')
      ? Number(formData.get('quantity'))
      : undefined,
    unitPrice: formData.get('unitPrice') || undefined,
  };

  const result = UpdatePurchaseOrderItemSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/purchase-orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar ítem' };
  }

  revalidatePath(`/inventory/purchase-orders/${orderId}`);
  return null;
}

export async function removeOrderItemAction(
  orderId: string,
  itemId: string,
): Promise<PurchaseOrderActionState> {
  try {
    await apiFetch(`/purchase-orders/${orderId}/items/${itemId}/delete`, {
      method: 'POST',
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar ítem' };
  }

  revalidatePath(`/inventory/purchase-orders/${orderId}`);
  return null;
}

interface SupplierSummary {
  id: string;
  name: string;
}

interface PaginatedSuppliers {
  data: SupplierSummary[];
}

export async function fetchSuppliersForSelectAction(): Promise<SupplierSummary[]> {
  const data = await apiFetch<PaginatedSuppliers>('/suppliers?limit=100');
  return data.data;
}

export async function fetchLocationsForSelectAction(): Promise<LocationSummary[]> {
  return apiFetch<LocationSummary[]>('/locations');
}

export async function fetchProductsForSupplierAction(
  supplierId: string,
): Promise<
  Array<{
    id: string;
    productId: string;
    price: string;
    leadTimeDays: number | null;
    product: { id: string; name: string; brand: string | null };
  }>
> {
  return apiFetch(
    `/suppliers/${supplierId}/products`,
  ) as Promise<
    Array<{
      id: string;
      productId: string;
      price: string;
      leadTimeDays: number | null;
      product: { id: string; name: string; brand: string | null };
    }>
  >;
}

export async function fetchProductsForSelectAction(): Promise<
  Array<{ id: string; name: string }>
> {
  const res = await apiFetch<{ data: Array<{ id: string; name: string }> }>('/products?limit=100');
  return res.data;
}