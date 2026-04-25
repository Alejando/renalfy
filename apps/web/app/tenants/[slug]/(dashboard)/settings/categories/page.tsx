import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import { CategoriesPageClient } from './categories-page-client';
import { ErrorState } from '../../../../../components/error-state';

interface CategoryOption {
  id: string;
  name: string;
  createdAt: string;
}

export default async function CategoriesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  if (!['OWNER', 'ADMIN'].includes(sessionUser.role)) {
    return (
      <ErrorState message="No tienes permiso para gestionar categorías. Esta sección es solo para administradores." />
    );
  }

  let categories: CategoryOption[];
  try {
    const data = await apiFetch<{ data: CategoryOption[]; total: number; page: number; limit: number }>(
      '/product-categories?limit=100',
    );
    categories = data.data;
  } catch {
    return <ErrorState message="No se pudieron cargar las categorías." />;
  }

  return <CategoriesPageClient categories={categories} />;
}
