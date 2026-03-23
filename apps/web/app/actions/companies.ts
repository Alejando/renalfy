'use server';

import { revalidatePath } from 'next/cache';
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  type PaginatedCompaniesResponse,
  type CompanyResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type CompanyActionState = { error: string } | null;

export interface FetchCompaniesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchCompaniesAction(
  query: FetchCompaniesQuery = {},
): Promise<PaginatedCompaniesResponse> {
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
  const queryString = params.toString();
  return apiFetch<PaginatedCompaniesResponse>(
    `/companies${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchCompanyAction(id: string): Promise<CompanyResponse> {
  return apiFetch<CompanyResponse>(`/companies/${id}`);
}

export async function createCompanyAction(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const rawData = {
    name: formData.get('name'),
    taxId: formData.get('taxId') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    contactPerson: formData.get('contactPerson') || undefined,
  };

  const result = CreateCompanySchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch('/companies', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear empresa' };
  }

  revalidatePath('/companies');
  return null;
}

export async function updateCompanyAction(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'ID de empresa requerido' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    taxId: formData.get('taxId') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    contactPerson: formData.get('contactPerson') || undefined,
  };

  const result = UpdateCompanySchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await apiFetch(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar empresa' };
  }

  revalidatePath('/companies');
  return null;
}

export async function deleteCompanyAction(id: string): Promise<CompanyActionState> {
  try {
    await apiFetch(`/companies/${id}`, { method: 'DELETE' });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al eliminar empresa' };
  }

  revalidatePath('/companies');
  return null;
}
