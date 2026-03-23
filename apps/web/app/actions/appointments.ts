'use server';

import { revalidatePath } from 'next/cache';
import {
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
  CreateMeasurementSchema,
  type PaginatedAppointmentsResponse,
  type AppointmentResponse,
  type MeasurementResponse,
  type ClinicalTemplateResponse,
} from '@repo/types';
import { apiFetch } from '../../lib/api';

export type AppointmentActionState = { error: string } | null;

export interface FetchAppointmentsQuery {
  page?: number;
  status?: string;
  patientId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  date?: string;
}

export async function fetchAppointmentsAction(
  query: FetchAppointmentsQuery = {},
): Promise<PaginatedAppointmentsResponse> {
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
  if (query.date) {
    params.set('date', query.date);
  }
  const queryString = params.toString();
  return apiFetch<PaginatedAppointmentsResponse>(
    `/appointments${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchAppointmentAction(
  id: string,
): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/appointments/${id}`);
}

export async function createAppointmentAction(
  _prev: AppointmentActionState,
  formData: FormData,
): Promise<{ error: string } | { appointment: AppointmentResponse }> {
  const scheduledAtRaw = formData.get('scheduledAt');
  const rawData = {
    patientId: formData.get('patientId'),
    locationId: formData.get('locationId'),
    serviceTypeId: formData.get('serviceTypeId') || undefined,
    scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw as string) : undefined,
    notes: formData.get('notes') || undefined,
    clinicalData: formData.get('clinicalData')
      ? (JSON.parse(formData.get('clinicalData') as string) as Record<string, unknown>)
      : undefined,
  };

  const result = CreateAppointmentSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const appointment = await apiFetch<AppointmentResponse>('/appointments', {
      method: 'POST',
      body: JSON.stringify(result.data),
    });
    revalidatePath('/appointments');
    return { appointment };
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al crear la cita',
    };
  }
}

export async function updateAppointmentStatusAction(
  id: string,
  formData: FormData,
): Promise<AppointmentActionState> {
  const rawData = {
    status: formData.get('status'),
    notes: formData.get('notes') || undefined,
  };

  const result = UpdateAppointmentStatusSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Estado inválido' };
  }

  try {
    await apiFetch<AppointmentResponse>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(result.data),
    });
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al cambiar estado',
    };
  }

  revalidatePath('/appointments');
  revalidatePath(`/appointments/${id}`);
  return null;
}

export async function createMeasurementAction(
  appointmentId: string,
  formData: FormData,
): Promise<{ error: string } | { measurement: MeasurementResponse }> {
  const recordedAtRaw = formData.get('recordedAt');
  const rawData = {
    recordedAt: recordedAtRaw ? new Date(recordedAtRaw as string) : undefined,
    notes: formData.get('notes') || undefined,
    data: formData.get('data')
      ? (JSON.parse(formData.get('data') as string) as Record<string, unknown>)
      : {},
  };

  const result = CreateMeasurementSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const measurement = await apiFetch<MeasurementResponse>(
      `/appointments/${appointmentId}/measurements`,
      {
        method: 'POST',
        body: JSON.stringify(result.data),
      },
    );
    revalidatePath(`/appointments/${appointmentId}`);
    return { measurement };
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : 'Error al registrar medición',
    };
  }
}

export async function fetchClinicalTemplateByServiceTypeAction(
  serviceTypeId: string,
): Promise<ClinicalTemplateResponse | null> {
  try {
    const templates = await apiFetch<ClinicalTemplateResponse[]>(
      `/clinical-templates?serviceTypeId=${serviceTypeId}`,
    );
    return templates[0] ?? null;
  } catch {
    return null;
  }
}
