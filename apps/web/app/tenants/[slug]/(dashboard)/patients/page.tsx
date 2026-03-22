import { apiFetch } from '../../../../../lib/api';
import { getSessionUser } from '../../../../../lib/session';
import type { LocationResponse, PaginatedPatientsResponse } from '@repo/types';
import { PatientsPageClient } from './patients-page-client';
import { ErrorState } from '../../../../components/error-state';

interface PatientsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;
  const include = params['include'] === 'deleted' ? 'deleted' : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let patientsData: PaginatedPatientsResponse;
  let locations: LocationResponse[];

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    if (search) {
      queryParams.set('search', search);
    }
    if (include) {
      queryParams.set('include', include);
    }

    [patientsData, locations] = await Promise.all([
      apiFetch<PaginatedPatientsResponse>(`/patients?${queryParams.toString()}`),
      apiFetch<LocationResponse[]>('/locations'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar los pacientes." />;
  }

  return (
    <PatientsPageClient
      patients={patientsData}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
      locations={locations}
    />
  );
}
