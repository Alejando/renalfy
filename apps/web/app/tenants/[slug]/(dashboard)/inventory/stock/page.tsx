import type { PaginatedStockResponse, LocationResponse } from '@repo/types';
import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import { StockPageClient } from './stock-page-client';
import { ErrorState } from '../../../../../components/error-state';

interface StockPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;
  const locationId = typeof params['locationId'] === 'string' ? params['locationId'] : undefined;
  const onlyLowStock = params['onlyLowStock'] === 'true';

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  const isOwnerAdmin = ['OWNER', 'ADMIN'].includes(sessionUser.role);

  let stockData: PaginatedStockResponse;
  let locations: LocationResponse[] = [];

  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', '20');
    if (search) query.set('search', search);
    if (isOwnerAdmin && locationId) query.set('locationId', locationId);
    if (onlyLowStock) query.set('onlyLowStock', 'true');

    if (isOwnerAdmin) {
      [stockData, locations] = await Promise.all([
        apiFetch<PaginatedStockResponse>(`/stock?${query.toString()}`),
        apiFetch<LocationResponse[]>('/locations'),
      ]);
    } else {
      stockData = await apiFetch<PaginatedStockResponse>(
        `/stock?${query.toString()}`,
      );
    }
  } catch {
    return <ErrorState message="No se pudo cargar el stock." />;
  }

  return (
    <StockPageClient
      stock={stockData}
      locations={locations}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
    />
  );
}
