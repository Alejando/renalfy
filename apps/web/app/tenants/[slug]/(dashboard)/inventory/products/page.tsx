import type { PaginatedProductsResponse } from '@repo/types';
import { apiFetch } from '../../../../../../lib/api';
import { getSessionUser } from '../../../../../../lib/session';
import { ProductsPageClient } from './products-page-client';
import { ErrorState } from '../../../../../components/error-state';

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface CategoryOption {
  id: string;
  name: string;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = typeof params['page'] === 'string' ? Number(params['page']) : 1;
  const search = typeof params['search'] === 'string' ? params['search'] : undefined;
  const categoryId = typeof params['categoryId'] === 'string' ? params['categoryId'] : undefined;
  const productType = typeof params['productType'] === 'string' ? params['productType'] : undefined;
  const sortBy = typeof params['sortBy'] === 'string' ? params['sortBy'] : 'name';
  const sortOrder = typeof params['sortOrder'] === 'string' ? params['sortOrder'] : 'asc';

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  let productsData: PaginatedProductsResponse;
  let categories: CategoryOption[] = [];
  try {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', '20');
    if (search) query.set('search', search);
    if (categoryId) query.set('categoryId', categoryId);
    if (productType) query.set('productType', productType);
    if (sortBy) query.set('sortBy', sortBy);
    if (sortOrder) query.set('sortOrder', sortOrder);
    [productsData, categories] = await Promise.all([
      apiFetch<PaginatedProductsResponse>(`/products?${query.toString()}`),
      apiFetch<CategoryOption[]>('/products/categories'),
    ]);
  } catch {
    return <ErrorState message="No se pudieron cargar los productos." />;
  }

  return (
    <ProductsPageClient
      products={productsData}
      categories={categories}
      userRole={sessionUser.role}
    />
  );
}
