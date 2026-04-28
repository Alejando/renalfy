import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { PurchaseOrderDetailClient } from './purchase-order-detail-client';
import { ErrorState } from '@/app/components/error-state';
import type { PurchaseOrderDetailResponse } from '@repo/types';

interface PurchaseOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({
  params,
}: PurchaseOrderDetailPageProps) {
  const { id } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (sessionUser.role === 'STAFF') {
    return (
      <ErrorState message="No tienes permiso para ver detalles de órdenes de compra." />
    );
  }

  let orderData: PurchaseOrderDetailResponse;
  try {
    orderData = await apiFetch<PurchaseOrderDetailResponse>(
      `/purchase-orders/${id}`,
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return <ErrorState message={`No se pudo cargar la orden: ${message}`} />;
  }

  return (
    <PurchaseOrderDetailClient
      order={orderData}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
    />
  );
}