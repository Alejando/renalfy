import type {
  LocationResponse,
  PaginatedAppointmentsResponse,
  ServiceTypeResponse,
} from '@repo/types';
import { apiFetch } from '../../../../../lib/api';
import { getSessionUser } from '../../../../../lib/session';
import { AppointmentsPageClient } from './appointments-page-client';
import { ErrorState } from '../../../../components/error-state';

interface AppointmentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface PatientSummary {
  id: string;
  name: string;
}

interface PaginatedPatientsSummary {
  data: PatientSummary[];
}

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const status = typeof params['status'] === 'string' ? params['status'] : undefined;
  const date = typeof params['date'] === 'string' ? params['date'] : undefined;
  const patientId =
    typeof params['patientId'] === 'string' ? params['patientId'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let appointmentsData: PaginatedAppointmentsResponse;
  let locations: LocationResponse[];
  let serviceTypes: ServiceTypeResponse[];
  let patientsData: PaginatedPatientsSummary;

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    if (status) {
      queryParams.set('status', status);
    }
    if (date) {
      queryParams.set('date', date);
    }
    if (patientId) {
      queryParams.set('patientId', patientId);
    }

    [appointmentsData, locations, serviceTypes, patientsData] = await Promise.all([
      apiFetch<PaginatedAppointmentsResponse>(
        `/appointments?${queryParams.toString()}`,
      ),
      apiFetch<LocationResponse[]>('/locations'),
      apiFetch<ServiceTypeResponse[]>('/service-types'),
      apiFetch<PaginatedPatientsSummary>('/patients?limit=100'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar las citas." />;
  }

  return (
    <AppointmentsPageClient
      appointments={appointmentsData}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
      locations={locations}
      serviceTypes={serviceTypes}
      patients={patientsData.data}
    />
  );
}
