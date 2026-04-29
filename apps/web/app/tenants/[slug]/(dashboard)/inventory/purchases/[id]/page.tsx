import type { PurchaseDetailResponse } from '@repo/types';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { ErrorState } from '@/app/components/error-state';
import { PurchaseDetailClient } from './purchase-detail-client';

interface PurchaseDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function PurchaseDetailPage({
  params,
}: PurchaseDetailPageProps) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role === 'STAFF') {
    return <ErrorState message="No tienes permiso para ver compras." />;
  }

  let purchase: PurchaseDetailResponse;
  try {
    purchase = await apiFetch<PurchaseDetailResponse>(`/purchases/${id}`);
  } catch {
    return <ErrorState message="No se pudo cargar la compra." />;
  }

  if (sessionUser.role === 'MANAGER' && purchase.locationId !== sessionUser.locationId) {
    return <ErrorState message="No tienes permiso para ver compras de otra sucursal." />;
  }

  return <PurchaseDetailClient purchase={purchase} />;
}
