import { apiFetch } from '../../../../../../../lib/api';
import { getSessionUser } from '../../../../../../../lib/session';
import type { ProductResponse, PaginatedStockResponse, LocationResponse } from '@repo/types';
import { ProductDetailClient } from './product-detail-client';
import { ErrorState } from '../../../../../../components/error-state';

interface ProductDetailPageProps {
  params: Promise<{ id: string; slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  const isOwnerAdmin = ['OWNER', 'ADMIN'].includes(sessionUser.role);

  let product: ProductResponse;
  let stockData: PaginatedStockResponse;
  let locations: LocationResponse[] = [];

  try {
    product = await apiFetch<ProductResponse>(`/products/${id}`);

    const stockQuery = new URLSearchParams();
    stockQuery.set('limit', '100');
    stockQuery.set('search', product.name);

    if (isOwnerAdmin) {
      [stockData, locations] = await Promise.all([
        apiFetch<PaginatedStockResponse>(`/stock?${stockQuery.toString()}`),
        apiFetch<LocationResponse[]>('/locations'),
      ]);
    } else {
      stockData = await apiFetch<PaginatedStockResponse>(
        `/stock?${stockQuery.toString()}`,
      );
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message.includes('404')) {
      return <ErrorState message="Producto no encontrado." />;
    }
    return <ErrorState message="No se pudo cargar el producto." />;
  }

  return (
    <ProductDetailClient
      product={product}
      stockEntries={stockData.data}
      locations={locations}
      userRole={sessionUser.role}
      userLocationId={sessionUser.locationId}
    />
  );
}
