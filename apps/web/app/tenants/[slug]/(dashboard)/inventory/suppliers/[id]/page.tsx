import type { SupplierResponse } from '@repo/types';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { SupplierDetailClient } from './supplier-detail-client';
import { ErrorState } from '@/app/components/error-state';
import {
  fetchSupplierProductsAction,
  fetchAllProductsForSelectAction,
  type SupplierProductListItem,
} from '@/app/actions/suppliers';

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const { id } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (!['OWNER', 'ADMIN'].includes(sessionUser.role)) {
    return (
      <ErrorState message="No tienes permiso para ver detalles de proveedores." />
    );
  }

  let supplier: SupplierResponse;
  let supplierProducts: SupplierProductListItem[];
  let allProducts: Array<{ id: string; name: string }>;

  try {
    [supplier, supplierProducts, allProducts] = await Promise.all([
      apiFetch<SupplierResponse>(`/suppliers/${id}`),
      fetchSupplierProductsAction(id),
      fetchAllProductsForSelectAction(),
    ]);
  } catch {
    return <ErrorState message="No se pudo cargar el proveedor." />;
  }

  return (
    <SupplierDetailClient
      supplier={supplier}
      supplierProducts={supplierProducts}
      allProducts={allProducts}
      userRole={sessionUser.role}
    />
  );
}