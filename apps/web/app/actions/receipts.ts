'use server';

import { revalidatePath } from 'next/cache';
import {
  CreateReceiptSchema,
  UpdateReceiptStatusSchema,
  type PaginatedReceiptsResponse,
  type ReceiptResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type ReceiptActionState = { error: string } | null;

export interface FetchReceiptsQuery {
  page?: number;
  status?: string;
  patientId?: string;
  paymentType?: string;
  date?: string;
}

export async function fetchReceiptsAction(
  query: FetchReceiptsQuery = {},
): Promise<PaginatedReceiptsResponse> {
  const params = new URLSearchParams();
  if (query.page) {
    params.set('page', query.page.toString());
  }
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.patientId) {
    params.set('patientId', query.patientId);
  }
  if (query.paymentType) {
    params.set('paymentType', query.paymentType);
  }
  if (query.date) {
    params.set('date', query.date);
  }
  const queryString = params.toString();
  return apiFetch<PaginatedReceiptsResponse>(
    `/receipts${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchReceiptAction(id: string): Promise<ReceiptResponse> {
  return apiFetch<ReceiptResponse>(`/receipts/${id}`);
}

export async function createReceiptAction(
  _prev: ReceiptActionState,
  formData: FormData,
): Promise<{ error: string } | { receipt: ReceiptResponse }> {
  const rawData = {
    patientId: formData.get('patientId'),
    locationId: formData.get('locationId'),
    serviceTypeId: formData.get('serviceTypeId') || undefined,
    appointmentId: formData.get('appointmentId') || undefined,
    planId: formData.get('planId') || undefined,
    date: formData.get('date'),
    amount: formData.get('amount'),
    paymentType: formData.get('paymentType'),
    notes: formData.get('notes') || undefined,
  };

  const result = CreateReceiptSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const receipt = await apiFetch<ReceiptResponse>('/receipts', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
    revalidatePath('/receipts');
    return { receipt };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al crear recibo' };
  }
}

export async function updateReceiptStatusAction(
  id: string,
  formData: FormData,
): Promise<ReceiptActionState> {
  const rawData = {
    status: formData.get('status'),
    notes: formData.get('notes') || undefined,
  };

  const result = UpdateReceiptStatusSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Estado inválido' };
  }

  try {
    await apiFetch<ReceiptResponse>(`/receipts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al cambiar estado' };
  }

  revalidatePath('/receipts');
  revalidatePath(`/receipts/${id}`);
  return null;
}
