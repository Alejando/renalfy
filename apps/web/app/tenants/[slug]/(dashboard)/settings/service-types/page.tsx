import { apiFetch } from '../../../../../../lib/api';
import type { ServiceTypeResponse } from '@repo/types';
import { ServiceTypesPageClient } from './service-types-page-client';
import { ErrorState } from '../../../../../components/error-state';

export default async function ServiceTypesPage() {
  let serviceTypes: ServiceTypeResponse[];

  try {
    serviceTypes = await apiFetch<ServiceTypeResponse[]>('/service-types?include=all');
  } catch {
    return <ErrorState message="No se pudieron cargar los tipos de servicio." />;
  }

  return <ServiceTypesPageClient serviceTypes={serviceTypes} />;
}
