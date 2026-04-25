import type { PaginatedStockSummaryResponse } from '@repo/types';
import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import { SummaryPageClient } from './summary-page-client';
import { ErrorState } from '../../../../../components/error-state';

interface SummaryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const isAnyLocationBelowAlert = params['isAnyLocationBelowAlert'] === 'true';

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (!['OWNER', 'ADMIN'].includes(sessionUser.role)) {
    return (
      <ErrorState message="No tienes permiso para ver el resumen de stock. Esta sección es solo para administradores." />
    );
  }

  let summaryData: PaginatedStockSummaryResponse;
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', '20');
    if (isAnyLocationBelowAlert) {
      query.set('isAnyLocationBelowAlert', 'true');
    }
    summaryData = await apiFetch<PaginatedStockSummaryResponse>(
      `/stock/summary?${query.toString()}`,
    );
  } catch {
    return <ErrorState message="No se pudo cargar el resumen de stock." />;
  }

  return (
    <SummaryPageClient
      summary={summaryData}
    />
  );
}
