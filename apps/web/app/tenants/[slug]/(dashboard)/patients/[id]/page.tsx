import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import type { PatientResponse, PaginatedAppointmentsResponse } from '@repo/types';
import { PatientDetailClient } from './patient-detail-client';
import { ErrorState } from '../../../../../components/error-state';

interface PatientDetailPageProps {
  params: Promise<{ id: string; slug: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let patient: PatientResponse;
  let appointments: PaginatedAppointmentsResponse;

  try {
    patient = await apiFetch<PatientResponse>(`/patients/${id}`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message.includes('404')) {
      return <ErrorState message="Paciente no encontrado." />;
    }
    return <ErrorState message="No se pudo cargar el paciente." />;
  }

  try {
    appointments = await apiFetch<PaginatedAppointmentsResponse>(
      `/appointments?patientId=${id}&limit=50`,
    );
  } catch {
    appointments = { data: [], total: 0, page: 1, limit: 50 };
  }

  return (
    <PatientDetailClient
      patient={patient}
      appointments={appointments}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
    />
  );
}
