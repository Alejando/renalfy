'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PaginatedStockResponse, LocationResponse, LocationStockResponse, UserRole } from '@repo/types';
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
import { AdjustQuantityDrawer } from './adjust-quantity-drawer';

interface StockPageClientProps {
  stock: PaginatedStockResponse;
  locations: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'w-full bg-input border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

const CAN_ADJUST_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

export function StockPageClient({
  stock,
  locations,
  userRole,
  userLocationId,
}: StockPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [selectedStockEntry, setSelectedStockEntry] = useState<LocationStockResponse | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwnerAdmin = CAN_ADJUST_ROLES.includes(userRole);
  const canAdjust = isOwnerAdmin;

  const selectedLocationId = searchParams.get('locationId') ?? '';
  const onlyLowStock = searchParams.get('onlyLowStock') === 'true';

  const hasMultiplePages = stock.total > stock.limit;

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

  const handleLocationFilter = (value: string) => {
    updateParams({ locationId: value || undefined });
  };

  const handleLowStockToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (onlyLowStock) {
      params.delete('onlyLowStock');
    } else {
      params.set('onlyLowStock', 'true');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleAdjust = (entry: LocationStockResponse) => {
    setSelectedStockEntry(entry);
    setAdjustDrawerOpen(true);
  };

  const handleAdjustSuccess = () => {
    setAdjustDrawerOpen(false);
    router.refresh();
  };

  const locationName = userLocationId
    ? locations.find((l) => l.id === userLocationId)?.name ?? 'Tu sucursal'
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">
            Stock por Sucursal
          </h1>
          <p className="text-secondary text-sm mt-1">
            {isOwnerAdmin
              ? 'Consulta y ajusta el stock de todas las sucursales'
              : `Stock de ${locationName ?? 'tu sucursal'}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder="Buscar por producto..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        {isOwnerAdmin && (
          <select
            aria-label="Filtrar por sucursal"
            className={`${SELECT_CLASS} max-w-[200px]`}
            value={selectedLocationId}
            onChange={(e) => handleLocationFilter(e.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant={onlyLowStock ? 'gradient' : 'outline'}
          size="sm"
          onClick={handleLowStockToggle}
        >
          {onlyLowStock ? 'Mostrando stock bajo' : 'Solo stock bajo'}
        </Button>
      </div>

      {/* Table or empty state */}
      {stock.data.length === 0 ? (
        <EmptyState
          title="Sin stock registrado"
          description={
            searchValue || selectedLocationId || onlyLowStock
              ? 'No se encontraron registros con los filtros actuales.'
              : 'No hay productos con stock configurado aún.'
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Producto</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Sucursal
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Cantidad</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Nivel de Alerta
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Estado
                  </TableHead>
                  {canAdjust && (
                    <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                      Acciones
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-foreground font-medium text-sm">
                      {entry.productName}
                      {entry.productBrand && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({entry.productBrand})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {entry.locationName ?? entry.locationId}
                    </TableCell>
                    <TableCell className="text-foreground font-semibold text-sm">
                      {entry.isBelowAlert ? (
                        <span className="text-[#825100]">{entry.quantity}</span>
                      ) : (
                        entry.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {entry.effectiveAlertLevel > 0
                        ? entry.effectiveAlertLevel.toString()
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {entry.isBelowAlert ? (
                        <Badge variant="status-warning">Stock Bajo</Badge>
                      ) : (
                        <Badge variant="status-active">OK</Badge>
                      )}
                    </TableCell>
                    {canAdjust && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAdjust(entry)}
                          >
                            Ajustar
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {hasMultiplePages && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                Página {stock.page} de {Math.ceil(stock.total / stock.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(stock.page - 1)}
                  disabled={stock.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(stock.page + 1)}
                  disabled={stock.page * stock.limit >= stock.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AdjustQuantityDrawer
        open={adjustDrawerOpen}
        stockEntry={selectedStockEntry}
        onClose={() => setAdjustDrawerOpen(false)}
        onSuccess={handleAdjustSuccess}
      />
    </div>
  );
}
