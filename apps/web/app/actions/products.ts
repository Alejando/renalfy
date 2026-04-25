'use server';

import { revalidatePath } from 'next/cache';
import {
  CreateProductSchema,
  UpdateProductSchema,
  type ProductResponse,
  type PaginatedProductsResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type ProductActionState = { error: string } | null;

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const rawData = {
    name: formData.get('name'),
    brand: formData.get('brand') || undefined,
    productType: formData.get('productType') || undefined,
    categoryId: formData.get('categoryId') || undefined,
    description: formData.get('description') || undefined,
    purchasePrice: formData.get('purchasePrice') || undefined,
    salePrice: formData.get('salePrice') || undefined,
    packageQty: formData.get('packageQty'),
    globalAlert: formData.get('globalAlert'),
  };

  const result = CreateProductSchema.safeParse({
    name: rawData.name,
    brand: rawData.brand,
    productType: rawData.productType,
    categoryId: rawData.categoryId || null,
    description: rawData.description,
    purchasePrice: rawData.purchasePrice,
    salePrice: rawData.salePrice,
    packageQty: rawData.packageQty ? Number(rawData.packageQty) : 1,
    globalAlert: rawData.globalAlert ? Number(rawData.globalAlert) : 0,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear producto' };
  }

  revalidatePath('/inventory/products');
  return null;
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de producto requerido' };
  }

  const rawData: Record<string, unknown> = {};
  const name = formData.get('name');
  if (name) rawData['name'] = name;
  const brand = formData.get('brand');
  if (brand !== null) rawData['brand'] = brand || null;
  const productType = formData.get('productType');
  if (productType) rawData['productType'] = productType;
  const categoryId = formData.get('categoryId');
  if (categoryId !== null) rawData['categoryId'] = categoryId || null;
  const description = formData.get('description');
  if (description !== null) rawData['description'] = description || null;
  const purchasePrice = formData.get('purchasePrice');
  if (purchasePrice) rawData['purchasePrice'] = purchasePrice;
  const salePrice = formData.get('salePrice');
  if (salePrice) rawData['salePrice'] = salePrice;
  const packageQty = formData.get('packageQty');
  if (packageQty) rawData['packageQty'] = Number(packageQty);
  const globalAlert = formData.get('globalAlert');
  if (globalAlert) rawData['globalAlert'] = Number(globalAlert);

  const result = UpdateProductSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar producto' };
  }

  revalidatePath('/inventory/products');
  return null;
}

export async function deleteProductAction(id: string): Promise<ProductActionState> {
  try {
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar producto' };
  }

  revalidatePath('/inventory/products');
  return null;
}

export async function fetchProductAction(id: string): Promise<ProductResponse> {
  return apiFetch<ProductResponse>(`/products/${id}`);
}

export async function fetchProductDetailAction(
  id: string,
  locationId?: string | null,
): Promise<ProductResponse> {
  const query = locationId ? `?locationId=${locationId}` : '';
  return apiFetch<ProductResponse>(`/products/${id}${query}`);
}

export async function fetchCategoriesAction(): Promise<string[]> {
  return apiFetch<string[]>('/products/categories');
}

export async function fetchProductsAction(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {},
): Promise<PaginatedProductsResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', query.page.toString());
  if (query.limit) params.set('limit', query.limit.toString());
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);
  const queryString = params.toString();
  return apiFetch<PaginatedProductsResponse>(
    `/products${queryString ? `?${queryString}` : ''}`,
  );
}
