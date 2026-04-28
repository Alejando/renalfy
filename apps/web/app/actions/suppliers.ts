'use server';

import { revalidatePath } from 'next/cache';
import {
  CreateSupplierSchema,
  UpdateSupplierSchema,
  type PaginatedSuppliersResponse,
  type SupplierResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type SupplierActionState = { error: string } | null;

export async function fetchSuppliersAction(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    includeInactive?: boolean;
  } = {},
): Promise<PaginatedSuppliersResponse> {
  const params = new URLSearchParams();
  if (query.page) {
    params.set('page', query.page.toString());
  }
  if (query.limit) {
    params.set('limit', query.limit.toString());
  }
  if (query.search) {
    params.set('search', query.search);
  }
  if (query.includeInactive) {
    params.set('includeInactive', 'true');
  }
  const queryString = params.toString();
  return apiFetch<PaginatedSuppliersResponse>(
    `/suppliers${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchSupplierAction(id: string): Promise<SupplierResponse> {
  return apiFetch<SupplierResponse>(`/suppliers/${id}`);
}

export async function createSupplierAction(
  _prev: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const rawData = {
    name: formData.get('name'),
    initials: formData.get('initials') || undefined,
    contact: formData.get('contact') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || undefined,
  };

  const result = CreateSupplierSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/suppliers', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear proveedor' };
  }

  revalidatePath('/inventory/suppliers');
  return null;
}

export async function updateSupplierAction(
  _prev: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de proveedor requerido' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    initials: formData.get('initials') || undefined,
    contact: formData.get('contact') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || undefined,
    status: formData.get('status') || undefined,
  };

  const result = UpdateSupplierSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar proveedor' };
  }

  revalidatePath('/inventory/suppliers');
  return null;
}

export async function deleteSupplierAction(id: string): Promise<SupplierActionState> {
  try {
    await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar proveedor' };
  }

  revalidatePath('/inventory/suppliers');
  return null;
}

export async function addSupplierProductAction(
  supplierId: string,
  data: { productId: string; price: string; leadTimeDays?: number },
): Promise<SupplierActionState> {
  try {
    await apiFetch(`/suppliers/${supplierId}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al agregar producto' };
  }

  revalidatePath(`/inventory/suppliers/${supplierId}`);
  return null;
}

export async function updateSupplierProductAction(
  supplierId: string,
  productId: string,
  data: { price?: string; leadTimeDays?: number },
): Promise<SupplierActionState> {
  try {
    await apiFetch(`/suppliers/${supplierId}/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar producto' };
  }

  revalidatePath(`/inventory/suppliers/${supplierId}`);
  return null;
}

export async function removeSupplierProductAction(
  supplierId: string,
  productId: string,
): Promise<SupplierActionState> {
  try {
    await apiFetch(`/suppliers/${supplierId}/products/${productId}`, {
      method: 'DELETE',
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar producto' };
  }

  revalidatePath(`/inventory/suppliers/${supplierId}`);
  return null;
}

export interface SupplierProductListItem {
  id: string;
  productId: string;
  price: string;
  leadTimeDays: number | null;
  product: { id: string; name: string; brand: string | null };
}

export async function fetchSupplierProductsAction(
  supplierId: string,
): Promise<SupplierProductListItem[]> {
  return apiFetch<SupplierProductListItem[]>(
    `/suppliers/${supplierId}/products`,
  );
}

export async function fetchAllProductsForSelectAction(): Promise<
  Array<{ id: string; name: string }>
> {
  const res = await apiFetch<{ data: Array<{ id: string; name: string }> }>('/products?limit=100');
  return res.data;
}