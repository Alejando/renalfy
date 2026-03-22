'use server';

import { revalidatePath } from 'next/cache';
import { CreateLocationSchema, UpdateLocationSchema } from '@repo/types';
import { apiFetch } from '../../lib/api';

export type LocationActionState = { error: string } | null;

export async function createLocationAction(
  _prev: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const rawData = {
    name: formData.get('name'),
    address: formData.get('address') || undefined,
    phone: formData.get('phone') || undefined,
  };

  const result = CreateLocationSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/locations', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear sucursal' };
  }

  revalidatePath('/settings/locations');
  return null;
}

export async function updateLocationAction(
  _prev: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de sucursal requerido' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    address: formData.get('address') || undefined,
    phone: formData.get('phone') || undefined,
  };

  const result = UpdateLocationSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar sucursal' };
  }

  revalidatePath('/settings/locations');
  return null;
}

export async function updateLocationStatusAction(
  id: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<LocationActionState> {
  try {
    await apiFetch(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al cambiar estado' };
  }

  revalidatePath('/settings/locations');
  return null;
}
