'use server';

import { revalidatePath } from 'next/cache';
import { CreateProductCategorySchema } from '@repo/types';
import { apiFetch } from '../../lib/api';

export type CategoryActionState = { error: string } | null;

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const rawData = { name: formData.get('name') };
  const result = CreateProductCategorySchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/product-categories', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear categoría' };
  }

  revalidatePath('/settings/categories');
  return null;
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
  try {
    await apiFetch(`/product-categories/${id}`, { method: 'DELETE' });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar categoría' };
  }

  revalidatePath('/settings/categories');
  return null;
}
