import type {
  LocationResponse,
  PaginatedReceiptsResponse,
  ServiceTypeResponse,
} from '@repo/types';
import { apiFetch } from '../../../../../lib/api';
import { getSessionUser } from '../../../../../lib/session';
import { ReceiptsPageClient } from './receipts-page-client';
import { ErrorState } from '../../../../components/error-state';

interface ReceiptsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface PatientSummary {
  id: string;
  name: string;
}

interface PaginatedPatientsSummary {
  data: PatientSummary[];
}

export default async function ReceiptsPage({ searchParams }: ReceiptsPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const status = typeof params['status'] === 'string' ? params['status'] : undefined;
  const paymentType =
    typeof params['paymentType'] === 'string' ? params['paymentType'] : undefined;
  const date = typeof params['date'] === 'string' ? params['date'] : undefined;
  const patientId =
    typeof params['patientId'] === 'string' ? params['patientId'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let receiptsData: PaginatedReceiptsResponse;
  let locations: LocationResponse[];
  let serviceTypes: ServiceTypeResponse[];
  let patientsData: PaginatedPatientsSummary;

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());
    if (status) {
      queryParams.set('status', status);
    }
    if (paymentType) {
      queryParams.set('paymentType', paymentType);
    }
    if (date) {
      queryParams.set('date', date);
    }
    if (patientId) {
      queryParams.set('patientId', patientId);
    }

    [receiptsData, locations, serviceTypes, patientsData] = await Promise.all([
      apiFetch<PaginatedReceiptsResponse>(`/receipts?${queryParams.toString()}`),
      apiFetch<LocationResponse[]>('/locations'),
      apiFetch<ServiceTypeResponse[]>('/service-types'),
      apiFetch<PaginatedPatientsSummary>('/patients?limit=100'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar los recibos." />;
  }

  return (
    <ReceiptsPageClient
      receipts={receiptsData}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
      locations={locations}
      serviceTypes={serviceTypes}
      patients={patientsData.data}
    />
  );
}
