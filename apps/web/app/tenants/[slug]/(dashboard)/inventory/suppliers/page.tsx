import type { PaginatedSuppliersResponse } from '@repo/types';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/session';
import { SuppliersPageClient } from './suppliers-page-client';
import { ErrorState } from '@/app/components/error-state';

interface SuppliersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;
  const includeInactive =
    params['includeInactive'] === 'true' ? true : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (!['OWNER', 'ADMIN', 'MANAGER', 'STAFF'].includes(sessionUser.role)) {
    return (
      <ErrorState message="No tienes permiso para ver proveedores." />
    );
  }

  let suppliersData: PaginatedSuppliersResponse;
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    if (search) {
      query.set('search', search);
    }
    if (includeInactive) {
      query.set('includeInactive', 'true');
    }
    suppliersData = await apiFetch<PaginatedSuppliersResponse>(
      `/suppliers?${query.toString()}`,
    );
  } catch {
    return <ErrorState message="No se pudieron cargar los proveedores." />;
  }

  return (
    <SuppliersPageClient
      suppliers={suppliersData}
      userRole={sessionUser.role}
    />
  );
}