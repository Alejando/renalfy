import type { PaginatedCompaniesResponse } from '@repo/types';
import { apiFetch } from '../../../../../lib/api';
import { getSessionUser } from '../../../../../lib/session';
import { CompaniesPageClient } from './companies-page-client';
import { ErrorState } from '../../../../components/error-state';

interface CompaniesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (!['OWNER', 'ADMIN'].includes(sessionUser.role)) {
    return (
      <ErrorState message="No tienes permiso para ver empresas. Esta sección es solo para administradores." />
    );
  }

  let companiesData: PaginatedCompaniesResponse;
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    if (search) {
      query.set('search', search);
    }
    companiesData = await apiFetch<PaginatedCompaniesResponse>(
      `/companies?${query.toString()}`,
    );
  } catch {
    return <ErrorState message="No se pudieron cargar las empresas." />;
  }

  return (
    <CompaniesPageClient
      companies={companiesData}
      userRole={sessionUser.role}
    />
  );
}
