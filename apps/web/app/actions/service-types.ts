'use server';

import { revalidatePath } from 'next/cache';
import { CreateServiceTypeSchema, UpdateServiceTypeSchema } from '@repo/types';
import { apiFetch } from '../../lib/api';
import type { ServiceTypeResponse, ServiceTypeStatus } from '@repo/types';

export type ServiceTypeActionState = { error: string } | null;

export async function fetchServiceTypesAction(): Promise<ServiceTypeResponse[]> {
  return apiFetch<ServiceTypeResponse[]>('/service-types?include=all');
}

export async function createServiceTypeAction(
  _prev: ServiceTypeActionState,
  formData: FormData,
): Promise<ServiceTypeActionState> {
  const priceRaw = formData.get('price');
  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    price: priceRaw ? Number(priceRaw) : undefined,
  };

  const result = CreateServiceTypeSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/service-types', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear tipo de servicio' };
  }

  revalidatePath('/settings/service-types');
  return null;
}

export async function updateServiceTypeAction(
  _prev: ServiceTypeActionState,
  formData: FormData,
): Promise<ServiceTypeActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de tipo de servicio requerido' };
  }

  const priceRaw = formData.get('price');
  const rawData = {
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    price: priceRaw ? Number(priceRaw) : undefined,
  };

  const result = UpdateServiceTypeSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/service-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar tipo de servicio' };
  }

  revalidatePath('/settings/service-types');
  return null;
}

export async function toggleServiceTypeStatusAction(
  id: string,
  status: ServiceTypeStatus,
): Promise<ServiceTypeActionState> {
  try {
    await apiFetch(`/service-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al cambiar estado' };
  }

  revalidatePath('/settings/service-types');
  return null;
}
