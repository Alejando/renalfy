import type { AppointmentResponse, ClinicalTemplateResponse } from '@repo/types';
import { apiFetch } from '../../../../../../lib/api';
import { ErrorState } from '../../../../../components/error-state';
import { AppointmentDetailClient } from './appointment-detail-client';

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({
  params,
}: AppointmentDetailPageProps) {
  const { id } = await params;

  let appointment: AppointmentResponse;
  let clinicalTemplate: ClinicalTemplateResponse | null = null;

  try {
    appointment = await apiFetch<AppointmentResponse>(`/appointments/${id}`);
  } catch {
    return <ErrorState message="No se pudo cargar la cita." />;
  }

  if (appointment.serviceTypeId) {
    try {
      const templates = await apiFetch<ClinicalTemplateResponse[]>(
        `/clinical-templates?serviceTypeId=${appointment.serviceTypeId}`,
      );
      clinicalTemplate = templates[0] ?? null;
    } catch {
      // template is optional — continue without it
    }
  }

  return (
    <AppointmentDetailClient
      appointment={appointment}
      clinicalTemplate={clinicalTemplate}
    />
  );
}
