import type {
  PaginatedPlansResponse,
  LocationResponse,
  ServiceTypeResponse,
} from '@repo/types';
import { apiFetch } from '../../../../../lib/api';
import { getSessionUser } from '../../../../../lib/session';
import { PlansPageClient } from './plans-page-client';
import { ErrorState } from '../../../../components/error-state';

interface PlansPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface PatientSummary {
  id: string;
  name: string;
}

interface CompanySummary {
  id: string;
  name: string;
}

interface PaginatedPatientsSummary {
  data: PatientSummary[];
}

interface PaginatedCompaniesSummary {
  data: CompanySummary[];
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const status = typeof params['status'] === 'string' ? params['status'] : undefined;
  const companyId =
    typeof params['companyId'] === 'string' ? params['companyId'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let plansData: PaginatedPlansResponse;
  let patients: PatientSummary[];
  let companies: CompanySummary[];
  let serviceTypes: ServiceTypeResponse[];
  let locations: LocationResponse[];

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    if (status) queryParams.set('status', status);
    if (companyId) queryParams.set('companyId', companyId);

    [plansData, patients, companies, serviceTypes, locations] = await Promise.all([
      apiFetch<PaginatedPlansResponse>(`/plans?${queryParams.toString()}`),
      apiFetch<PaginatedPatientsSummary>('/patients?limit=1000').then((d) => d.data),
      apiFetch<PaginatedCompaniesSummary>('/companies?limit=1000').then((d) => d.data),
      apiFetch<ServiceTypeResponse[]>('/service-types'),
      apiFetch<LocationResponse[]>('/locations'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar los planes." />;
  }

  return (
    <PlansPageClient
      plans={plansData}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
      patients={patients}
      companies={companies}
      serviceTypes={serviceTypes}
      locations={locations}
    />
  );
}
