import type { PaginatedPurchaseOrdersResponse, PaginatedSuppliersResponse } from '@repo/types';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { PurchaseOrdersPageClient } from './purchase-orders-page-client';
import { ErrorState } from '@/app/components/error-state';

interface PurchaseOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PurchaseOrdersPage({
  searchParams,
}: PurchaseOrdersPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const supplierId =
    typeof params['supplierId'] === 'string' ? params['supplierId'] : undefined;
  const status = typeof params['status'] === 'string' ? params['status'] : undefined;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;
  const dateFrom = typeof params['dateFrom'] === 'string' ? params['dateFrom'] : undefined;
  const dateTo = typeof params['dateTo'] === 'string' ? params['dateTo'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (sessionUser.role === 'STAFF') {
    return (
      <ErrorState message="No tienes permiso para ver órdenes de compra." />
    );
  }

  let ordersData: PaginatedPurchaseOrdersResponse;
  let suppliersData: PaginatedSuppliersResponse;
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    if (supplierId) query.set('supplierId', supplierId);
    if (status) query.set('status', status);
    if (search) query.set('search', search);
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    [ordersData, suppliersData] = await Promise.all([
      apiFetch<PaginatedPurchaseOrdersResponse>(`/purchase-orders?${query.toString()}`),
      apiFetch<PaginatedSuppliersResponse>('/suppliers?limit=100'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar las órdenes de compra." />;
  }

  return (
    <PurchaseOrdersPageClient
      orders={ordersData}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
      suppliers={suppliersData.data.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}