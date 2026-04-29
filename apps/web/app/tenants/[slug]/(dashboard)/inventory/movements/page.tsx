import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { fetchInventoryMovementsAction } from '@/app/actions/inventory-movements';
import { MovementsPageClient } from './movements-page-client';

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    reference?: string;
  }>;
}) {
  const params = await searchParams;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    notFound();
  }

  const movements = await fetchInventoryMovementsAction({
    page: Number(params.page ?? 1),
    limit: 20,
    type: params.type,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    reference: params.reference,
  });

  return (
    <MovementsPageClient
      movements={movements}
    />
  );
  // Note: userRole is available from sessionUser if needed for role-based features in future
}
