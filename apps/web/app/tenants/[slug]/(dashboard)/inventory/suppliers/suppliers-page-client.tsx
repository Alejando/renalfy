'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  SupplierResponse,
  PaginatedSuppliersResponse,
  UserRole,
} from '@repo/types';
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
import { EmptyState } from '@/app/components/empty-state';
import { SupplierDrawer } from './supplier-drawer';
import { deleteSupplierAction } from '@/app/actions/suppliers';

interface SuppliersPageClientProps {
  suppliers: PaginatedSuppliersResponse;
  userRole: UserRole;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function SuppliersPageClient({
  suppliers,
  userRole,
}: SuppliersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierResponse | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [filterValue, setFilterValue] = useState(
    searchParams.get('includeInactive') === 'true' ? 'all' : 'active',
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  const hasMultiplePages = suppliers.total > suppliers.limit;

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }, 300);
  };

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.set('includeInactive', 'true');
    } else {
      params.delete('includeInactive');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleEdit = (supplier: SupplierResponse) => {
    setSelectedSupplier(supplier);
    setDrawerOpen(true);
  };

  const handleNewSupplier = () => {
    setSelectedSupplier(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (supplier: SupplierResponse) => {
    const confirmed = window.confirm(
      `¿Eliminar el proveedor "${supplier.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await deleteSupplierAction(supplier.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Proveedores</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona los proveedores de tu clínica
          </p>
        </div>
        {canManage && (
          <Button variant="gradient" onClick={handleNewSupplier}>
            + Nuevo Proveedor
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder="Buscar proveedor..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterValue}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm w-40"
        >
          <option value="active">Activos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {suppliers.data.length === 0 ? (
        <EmptyState
          title="Sin proveedores aún"
          description="Crea el primer proveedor para comenzar."
          action={
            canManage ? (
              <Button variant="gradient" onClick={handleNewSupplier}>
                + Nuevo Proveedor
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
                  <TableHead className={TABLE_HEAD_CLASS}>Proveedor</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Siglas
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Contacto
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Teléfono
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Estado
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.data.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="text-foreground font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {supplier.initials ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {supplier.contact ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {supplier.phone ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          supplier.status === 'ACTIVE'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {supplier.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                        >
                          Editar
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(supplier)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasMultiplePages && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                Página {suppliers.page} de{' '}
                {Math.ceil(suppliers.total / suppliers.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(suppliers.page - 1)}
                  disabled={suppliers.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(suppliers.page + 1)}
                  disabled={suppliers.page * suppliers.limit >= suppliers.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <SupplierDrawer
        open={drawerOpen}
        supplier={selectedSupplier}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}