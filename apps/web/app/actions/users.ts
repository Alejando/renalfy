'use server';

import { revalidatePath } from 'next/cache';
import { CreateUserSchema, UpdateUserSchema, UpdateUserStatusSchema } from '@repo/types';
import { apiFetch } from '../../lib/api';

export type UserActionState = { error: string } | null;

export async function createUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const role = formData.get('role') as string;
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role,
    locationId: formData.get('locationId') || undefined,
    phone: formData.get('phone') || undefined,
  };

  const result = CreateUserSchema.safeParse(rawData);
  if (!result.success) {
    const issue = result.error.issues[0];
    const isLocationError = issue?.path.includes('locationId');
    return {
      error: isLocationError
        ? 'La sucursal es obligatoria para este rol'
        : (issue?.message ?? 'Datos inválidos'),
    };
  }

  try {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear usuario';
    if (msg.includes('409') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
      return { error: 'Ya existe un usuario con ese correo' };
    }
    return { error: msg };
  }

  revalidatePath('/settings/users');
  return null;
}

export async function updateUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de usuario requerido' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    phone: formData.get('phone') || undefined,
    locationId: formData.get('locationId') || undefined,
  };

  const result = UpdateUserSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar usuario' };
  }

  revalidatePath('/settings/users');
  return null;
}

export async function updateUserStatusAction(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED',
): Promise<UserActionState> {
  const result = UpdateUserStatusSchema.safeParse({ status });
  if (!result.success) {
    return { error: 'Estado inválido' };
  }

  try {
    await apiFetch(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al cambiar estado' };
  }

  revalidatePath('/settings/users');
  return null;
}
