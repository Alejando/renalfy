'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { PaginatedInventoryMovementsResponse } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/app/components/empty-state';
import { MovementTypeBadge } from './movement-type-badge';

export function MovementsPageClient({
  movements,
}: {
  movements: PaginatedInventoryMovementsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
  const [typeFilter, setTypeFilter] = useState(
    searchParams.get('type') ?? 'all'
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '');
  const [referenceSearch, setReferenceSearch] = useState(
    searchParams.get('reference') ?? ''
  );

  const isAnyFilterActive =
    typeFilter !== 'all' || dateFrom !== '' || dateTo !== '' || referenceSearch !== '';

  const handleFilterChange = (params: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams();
    newParams.set('page', '1');

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      }
    });

    router.push(`?${newParams.toString()}`);
  };

  const handleClearFilters = () => {
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setReferenceSearch('');
    router.push('?page=1');
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setTypeFilter(newType);
    handleFilterChange({
      type: newType === 'all' ? undefined : newType,
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateFrom = e.target.value;
    setDateFrom(newDateFrom);
    handleFilterChange({
      type: typeFilter === 'all' ? undefined : typeFilter,
      dateFrom: newDateFrom || undefined,
      dateTo: dateTo || undefined,
      reference: referenceSearch || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateTo = e.target.value;
    setDateTo(newDateTo);
    handleFilterChange({
      type: typeFilter === 'all' ? undefined : typeFilter,
      dateFrom: dateFrom || undefined,
      dateTo: newDateTo || undefined,
      reference: referenceSearch || undefined,
    });
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReference = e.target.value;
    setReferenceSearch(newReference);
    handleFilterChange({
      type: typeFilter === 'all' ? undefined : typeFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      reference: newReference || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">
          Movimientos de Inventario
        </h1>
        <p className="text-secondary text-sm mt-1">
          Historial de entradas y salidas de inventario
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4 p-4 bg-surface rounded-lg border border-outline">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Type Filter */}
          <div className="space-y-2">
            <label htmlFor="typeFilter" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="typeFilter"
              aria-label="Filtrar por tipo de movimiento"
              value={typeFilter}
              onChange={handleTypeChange}
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface"
            >
              <option value="all">Todos los tipos</option>
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <label htmlFor="dateFrom" className="text-sm font-medium">
              Fecha desde
            </label>
            <input
              id="dateFrom"
              type="date"
              aria-label="Fecha desde"
              value={dateFrom}
              onChange={handleDateFromChange}
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <label htmlFor="dateTo" className="text-sm font-medium">
              Fecha hasta
            </label>
            <input
              id="dateTo"
              type="date"
              aria-label="Fecha hasta"
              value={dateTo}
              onChange={handleDateToChange}
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface"
            />
          </div>

          {/* Reference Search */}
          <div className="space-y-2">
            <label htmlFor="reference" className="text-sm font-medium">
              Referencia
            </label>
            <Input
              id="reference"
              placeholder="Buscar por referencia..."
              value={referenceSearch}
              onChange={handleReferenceChange}
              aria-label="Buscar por referencia"
              className="w-full"
            />
          </div>

          {/* Clear Filters Button */}
          {isAnyFilterActive && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table or Empty State */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Lista de movimientos"
      >
        {movements.data.length === 0 ? (
          <EmptyState
            title="Sin movimientos encontrados"
            description="No hay movimientos de inventario que coincidan con los filtros."
          />
        ) : (
          <div className="border border-outline rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.data.map((movement) => (
                  <TableRow
                    key={movement.id}
                    onClick={() =>
                      router.push(`/inventory/movements/${movement.id}`)
                    }
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <MovementTypeBadge type={movement.type} />
                    </TableCell>
                    <TableCell>
                      {new Date(movement.date).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>{movement.reference ?? '—'}</TableCell>
                    <TableCell>{movement.itemCount}</TableCell>
                    <TableCell>
                      {movement.createdBy?.name ?? movement.userId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {movements.total > movements.limit && (
        <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-outline">
          <p className="text-sm text-secondary">
            Página {movements.page} de {Math.ceil(movements.total / movements.limit)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={movements.page <= 1}
              onClick={() => {
                const params = new URLSearchParams();
                params.set('page', String(movements.page - 1));
                if (typeFilter !== 'all') params.set('type', typeFilter);
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);
                if (referenceSearch) params.set('reference', referenceSearch);
                router.push(`?${params.toString()}`);
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={movements.page * movements.limit >= movements.total}
              onClick={() => {
                const params = new URLSearchParams();
                params.set('page', String(movements.page + 1));
                if (typeFilter !== 'all') params.set('type', typeFilter);
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);
                if (referenceSearch) params.set('reference', referenceSearch);
                router.push(`?${params.toString()}`);
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
