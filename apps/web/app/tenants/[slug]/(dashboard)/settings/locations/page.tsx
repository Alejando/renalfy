import { apiFetch, isNextInternalError } from '@/lib/api';
import type { LocationResponse } from '@repo/types';
import { LocationsPageClient } from './locations-page-client';
import { ErrorState } from '../../../../../components/error-state';

export default async function LocationsPage() {
  let locations: LocationResponse[];

  try {
    locations = await apiFetch<LocationResponse[]>('/locations');
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    return <ErrorState message="No se pudieron cargar las sucursales." />;
  }

  return <LocationsPageClient locations={locations} />;
}
