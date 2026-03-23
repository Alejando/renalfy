'use server';

import { revalidatePath } from 'next/cache';
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  type PaginatedPlansResponse,
  type PlanResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';
import type { LocationResponse, ServiceTypeResponse } from '@repo/types';

export type PlanActionState = { error: string } | null;

export interface FetchPlansQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  companyId?: string;
  status?: string;
}

interface PatientSummary {
  id: string;
  name: string;
}

interface PaginatedPatientsSummary {
  data: PatientSummary[];
}

interface CompanySummary {
  id: string;
  name: string;
}

interface PaginatedCompaniesSummary {
  data: CompanySummary[];
}

export async function fetchPlansAction(
  query: FetchPlansQuery = {},
): Promise<PaginatedPlansResponse> {
  const params = new URLSearchParams();
  if (query.page) {
    params.set('page', query.page.toString());
  }
  if (query.limit) {
    params.set('limit', query.limit.toString());
  }
  if (query.patientId) {
    params.set('patientId', query.patientId);
  }
  if (query.companyId) {
    params.set('companyId', query.companyId);
  }
  if (query.status) {
    params.set('status', query.status);
  }
  const queryString = params.toString();
  return apiFetch<PaginatedPlansResponse>(
    `/plans${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchPlanAction(id: string): Promise<PlanResponse> {
  return apiFetch<PlanResponse>(`/plans/${id}`);
}

export async function createPlanAction(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const rawData = {
    patientId: formData.get('patientId'),
    locationId: formData.get('locationId') || undefined,
    companyId: formData.get('companyId') || undefined,
    serviceTypeId: formData.get('serviceTypeId') || undefined,
    startDate: formData.get('startDate'),
    plannedSessions: Number(formData.get('plannedSessions')),
    amount: formData.get('amount'),
    notes: formData.get('notes') || undefined,
  };

  const result = CreatePlanSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/plans', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear plan' };
  }

  revalidatePath('/plans');
  return null;
}

export async function updatePlanAction(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de plan requerido' };
  }

  const rawData = {
    companyId: formData.get('companyId') || undefined,
    serviceTypeId: formData.get('serviceTypeId') || undefined,
    startDate: formData.get('startDate') || undefined,
    plannedSessions: formData.get('plannedSessions')
      ? Number(formData.get('plannedSessions'))
      : undefined,
    amount: formData.get('amount') || undefined,
    notes: formData.get('notes') || undefined,
  };

  const result = UpdatePlanSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar plan' };
  }

  revalidatePath('/plans');
  return null;
}

export async function deletePlanAction(id: string): Promise<PlanActionState> {
  try {
    await apiFetch(`/plans/${id}`, { method: 'DELETE' });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar plan' };
  }

  revalidatePath('/plans');
  return null;
}

export async function fetchPatientsForSelectAction(): Promise<PatientSummary[]> {
  const data = await apiFetch<PaginatedPatientsSummary>('/patients?limit=1000');
  return data.data;
}

export async function fetchCompaniesForSelectAction(): Promise<CompanySummary[]> {
  const data = await apiFetch<PaginatedCompaniesSummary>('/companies?limit=1000');
  return data.data;
}

export async function fetchServiceTypesForSelectAction(): Promise<ServiceTypeResponse[]> {
  return apiFetch<ServiceTypeResponse[]>('/service-types');
}

export async function fetchLocationsForSelectAction(): Promise<LocationResponse[]> {
  return apiFetch<LocationResponse[]>('/locations');
}
