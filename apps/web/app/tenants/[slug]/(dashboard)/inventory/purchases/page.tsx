import type { PaginatedPurchasesResponse } from '@repo/types';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { PurchasesPageClient } from './purchases-page-client';
import { ErrorState } from '@/app/components/error-state';

interface PurchasesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PurchasesPage({
  searchParams,
}: PurchasesPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (sessionUser.role === 'STAFF') {
    return (
      <ErrorState message="No tienes permiso para ver compras." />
    );
  }

  let purchasesData: PaginatedPurchasesResponse;
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', '20');
    purchasesData = await apiFetch<PaginatedPurchasesResponse>(
      `/purchases?${query.toString()}`
    );
  } catch {
    return <ErrorState message="No se pudieron cargar las compras." />;
  }

  return <PurchasesPageClient purchases={purchasesData} />;
}
