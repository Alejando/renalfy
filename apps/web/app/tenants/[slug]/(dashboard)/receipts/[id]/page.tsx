import { notFound } from 'next/navigation';
import type { ReceiptResponse } from '@repo/types';
import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import { ReceiptDetailClient } from './receipt-detail-client';
import { ErrorState } from '../../../../../components/error-state';

interface ReceiptDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptDetailPage({ params }: ReceiptDetailPageProps) {
  const { id } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let receipt: ReceiptResponse;

  try {
    receipt = await apiFetch<ReceiptResponse>(`/receipts/${id}`);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('404')) {
      notFound();
    }
    return <ErrorState message="No se pudo cargar el recibo." />;
  }

  // MANAGER/STAFF can only see receipts from their location (RLS enforces this in backend,
  // but we provide a clear 404 here instead of a confusing empty state)
  if (
    (sessionUser.role === 'MANAGER' || sessionUser.role === 'STAFF') &&
    sessionUser.locationId &&
    receipt.locationId !== sessionUser.locationId
  ) {
    notFound();
  }

  return <ReceiptDetailClient receipt={receipt} />;
}
