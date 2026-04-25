'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ProductResponse, PaginatedProductsResponse, UserRole } from '@repo/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../../../../../components/empty-state';
import { ProductDrawer } from './product-drawer';
import { deleteProductAction } from '../../../../../actions/products';

interface ProductsPageClientProps {
  products: PaginatedProductsResponse;
  categories: Array<{ id: string; name: string }>;
  userRole: UserRole;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const CAN_MANAGE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  CONSUMABLE: 'Insumo',
};

export function ProductsPageClient({
  products,
  categories,
  userRole,
}: ProductsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canManage = CAN_MANAGE_ROLES.includes(userRole);

  const selectedCategoryId = searchParams.get('categoryId') ?? '';
  const selectedProductType = searchParams.get('productType') ?? '';

  const hasMultiplePages = products.total > products.limit;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value || undefined });
    }, 300);
  };

  const handleCategoryChange = (value: string) => {
    updateParams({ categoryId: value || undefined });
  };

  const handleProductTypeChange = (value: string) => {
    updateParams({ productType: value || undefined });
  };

  const handleSortChange = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get('sortBy');
    const order = params.get('sortOrder') ?? 'asc';
    if (current === field) {
      params.set('sortOrder', order === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'asc');
    }
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleEdit = (product: ProductResponse) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (product: ProductResponse) => {
    setDeleteError(null);
    const confirmed = window.confirm(
      `¿Eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    const result = await deleteProductAction(product.id);
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }
    router.refresh();
  };

  const handleProductClick = (product: ProductResponse) => {
    router.push(`/inventory/products/${product.id}`);
  };

  const sortBy = searchParams.get('sortBy') ?? 'name';
  const sortOrder = searchParams.get('sortOrder') ?? 'asc';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Productos</h1>
          <p className="text-secondary text-sm mt-1">
            Catálogo de productos y materiales de la clínica
          </p>
        </div>
        {canManage && (
          <Button variant="gradient" onClick={handleNewProduct}>
            + Nuevo Producto
          </Button>
        )}
      </div>

      {/* Error message */}
      {deleteError && (
        <div className="p-3 bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm font-medium">{deleteError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder="Buscar producto..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <select
          aria-label="Filtrar por categoría"
          className={`${SELECT_CLASS} max-w-[200px]`}
          value={selectedCategoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por tipo"
          className={`${SELECT_CLASS} max-w-[160px]`}
          value={selectedProductType}
          onChange={(e) => handleProductTypeChange(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="SALE">Venta</option>
          <option value="CONSUMABLE">Insumo</option>
        </select>
      </div>

      {/* Table or empty state */}
      {products.data.length === 0 ? (
        <EmptyState
          title="Sin productos aún"
          description={
            searchValue || selectedCategoryId || selectedProductType
              ? 'No se encontraron productos con los filtros actuales.'
              : 'Crea el primer producto para comenzar.'
          }
          action={
            canManage && !searchValue && !selectedCategoryId && !selectedProductType ? (
              <Button variant="gradient" onClick={handleNewProduct}>
                + Nuevo Producto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>
                    <button
                      className="hover:text-primary transition-colors"
                      onClick={() => handleSortChange('name')}
                    >
                      Nombre{sortBy === 'name' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Tipo
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Marca
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Categoría
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>
                    <button
                      className="hover:text-primary transition-colors"
                      onClick={() => handleSortChange('purchasePrice')}
                    >
                      P. Compra{sortBy === 'purchasePrice' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>
                    <button
                      className="hover:text-primary transition-colors"
                      onClick={() => handleSortChange('salePrice')}
                    >
                      P. Venta{sortBy === 'salePrice' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-foreground font-medium">
                      <button
                        className="hover:text-primary transition-colors text-left"
                        onClick={() => handleProductClick(product)}
                      >
                        {product.name}
                      </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={product.productType === 'SALE' ? 'status-active' : 'outline'}>
                        {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {product.brand ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {product.categoryName ? (
                        <Badge variant="outline" className="text-xs">
                          {product.categoryName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      ${product.purchasePrice}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      ${product.salePrice}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(product);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(product);
                              }}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                        {!canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProductClick(product)}
                          >
                            Ver detalle
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {hasMultiplePages && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                Página {products.page} de{' '}
                {Math.ceil(products.total / products.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(products.page - 1)}
                  disabled={products.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(products.page + 1)}
                  disabled={products.page * products.limit >= products.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductDrawer
        open={drawerOpen}
        product={selectedProduct}
        categories={categories}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
