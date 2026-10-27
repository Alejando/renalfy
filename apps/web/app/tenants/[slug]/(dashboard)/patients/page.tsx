import { apiFetch, isNextInternalError } from '@/lib/api';
import { getSessionUser } from '../../../../../lib/session';
import type { LocationResponse, PaginatedPatientsResponse } from '@repo/types';
import { PatientsPageClient } from './patients-page-client';
import { ErrorState } from '../../../../components/error-state';

interface PatientsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PatientsPage({ params: routeParams, searchParams }: PatientsPageProps) {
  const { slug } = await routeParams;
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;
  const include = params['include'] === 'deleted' ? 'deleted' : undefined;
  const locationId = typeof params['locationId'] === 'string' ? params['locationId'] : undefined;
  const status =
    params['status'] === 'ACTIVE' ||
    params['status'] === 'INACTIVE' ||
    params['status'] === 'DELETED'
      ? (params['status'] as 'ACTIVE' | 'INACTIVE' | 'DELETED')
      : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let patientsData: PaginatedPatientsResponse;
  let locations: LocationResponse[];

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    if (search) queryParams.set('search', search);
    if (include) queryParams.set('include', include);
    if (locationId) queryParams.set('locationId', locationId);
    if (status) queryParams.set('status', status);

    [patientsData, locations] = await Promise.all([
      apiFetch<PaginatedPatientsResponse>(`/patients?${queryParams.toString()}`),
      apiFetch<LocationResponse[]>('/locations'),
    ]);
  } catch (error) {
    if (isNextInternalError(error)) throw error;
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
