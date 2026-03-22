'use server';

import { revalidatePath } from 'next/cache';
import { CreatePatientSchema, UpdatePatientSchema } from '@repo/types';
import { apiFetch } from '../../lib/api';
import type { PaginatedPatientsResponse, PatientResponse, LocationResponse } from '@repo/types';

export type PatientActionState = { error: string } | null;

export interface FetchPatientsQuery {
  page?: number;
  search?: string;
  include?: 'deleted';
}

export async function fetchPatientsAction(
  query: FetchPatientsQuery = {},
): Promise<PaginatedPatientsResponse> {
  const params = new URLSearchParams();
  if (query.page) {
    params.set('page', query.page.toString());
  }
  if (query.search) {
    params.set('search', query.search);
  }
  if (query.include) {
    params.set('include', query.include);
  }
  const queryString = params.toString();
  return apiFetch<PaginatedPatientsResponse>(`/patients${queryString ? `?${queryString}` : ''}`);
}

export async function fetchPatientAction(id: string): Promise<PatientResponse> {
  return apiFetch<PatientResponse>(`/patients/${id}`);
}

export async function createPatientAction(
  _prev: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const birthDateRaw = formData.get('birthDate');
  const rawData = {
    name: formData.get('name'),
    locationId: formData.get('locationId'),
    birthDate: birthDateRaw ? birthDateRaw : undefined,
    phone: formData.get('phone') || undefined,
    mobile: formData.get('mobile') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || undefined,
    consent: {
      type: formData.get('consent.type'),
      version: formData.get('consent.version') || '1.0',
    },
  };

  const result = CreatePatientSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/patients', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear paciente' };
  }

  revalidatePath('/patients');
  return null;
}

export async function updatePatientAction(
  _prev: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de paciente requerido' };
  }

  const rawData = {
    phone: formData.get('phone') || undefined,
    mobile: formData.get('mobile') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || undefined,
  };

  const result = UpdatePatientSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar paciente' };
  }

  revalidatePath('/patients');
  revalidatePath(`/patients/${id}`);
  return null;
}

export async function deletePatientAction(id: string): Promise<PatientActionState> {
  try {
    await apiFetch(`/patients/${id}`, {
      method: 'DELETE',
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al dar de baja al paciente' };
  }

  revalidatePath('/patients');
  return null;
}

export async function fetchLocationsForPatientAction(): Promise<LocationResponse[]> {
  return apiFetch<LocationResponse[]>('/locations');
}
