'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  PurchaseOrderResponse,
  PaginatedPurchaseOrdersResponse,
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
import { PurchaseOrderStatusBadge } from './purchase-order-status-badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  fetchSuppliersForSelectAction,
  fetchLocationsForSelectAction,
  createPurchaseOrderAction,
} from '@/app/actions/purchase-orders';

interface PurchaseOrdersPageClientProps {
  orders: PaginatedPurchaseOrdersResponse;
  userRole: UserRole;
  userLocationId: string | null;
  suppliers: Array<{ id: string; name: string }>;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function PurchaseOrdersPageClient({
  orders,
  userRole,
  userLocationId,
  suppliers,
}: PurchaseOrdersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [supplierFilter, setSupplierFilter] = useState(
    typeof searchParams.get('supplierId') === 'string'
      ? searchParams.get('supplierId')!
      : 'all',
  );
  const [statusFilter, setStatusFilter] = useState(
    typeof searchParams.get('status') === 'string'
      ? searchParams.get('status')!
      : 'all',
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';
  const hasMultiplePages = orders.total > orders.limit;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSuppliers, setDialogSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(userLocationId ?? '');

  const openNewOrderDialog = async () => {
    setDialogLoading(true);
    setDialogError(null);
    setDialogOpen(true);
    try {
      const [suppliersData, locationsData] = await Promise.all([
        fetchSuppliersForSelectAction(),
        fetchLocationsForSelectAction(),
      ]);
      setDialogSuppliers(suppliersData);
      setLocations(locationsData);
    } catch {
      setDialogError('No se pudieron cargar los datos');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set('search', value);
      else params.delete('search');
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }, 300);
  };

  const handleSupplierFilterChange = (value: string) => {
    setSupplierFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== 'all') params.set('supplierId', value);
    else params.delete('supplierId');
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== 'all') params.set('status', value);
    else params.delete('status');
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleViewOrder = (order: PurchaseOrderResponse) => {
    router.push(`/inventory/purchase-orders/${order.id}`);
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDialogError(null);
    const formData = new FormData(e.currentTarget);
    formData.append('supplierId', selectedSupplier);
    formData.append('locationId', selectedLocation);

    const result = await createPurchaseOrderAction(null, formData);
    if (result?.error) {
      setDialogError(result.error);
      return;
    }
    if (result?.orderId) {
      setDialogOpen(false);
      router.push(`/inventory/purchase-orders/${result.orderId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">
            Órdenes de Compra
          </h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona las órdenes de compra a proveedores
          </p>
        </div>
        {canManage && (
          <Button
            variant="gradient"
            onClick={openNewOrderDialog}
            disabled={dialogLoading}
          >
            {dialogLoading ? 'Cargando…' : '+ Nueva Orden'}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder="Buscar por proveedor..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={supplierFilter}
          onChange={(e) => handleSupplierFilterChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm w-48"
        >
          <option value="all">Todos los proveedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm w-40"
        >
          <option value="all">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="SENT">Enviada</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="RECEIVED">Recibida</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      {orders.data.length === 0 ? (
        <EmptyState
          title="Sin órdenes de compra aún"
          description="Crea la primera orden de compra para comenzar."
          action={
            canManage ? (
              <Button variant="gradient" onClick={openNewOrderDialog}>
                + Nueva Orden
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
                    Sucursal
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Fecha
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Total
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-foreground font-medium">
                      {order.supplierName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {order.locationName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {new Date(order.date).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      ${Number(order.total).toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <PurchaseOrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          Ver
                        </Button>
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
                Página {orders.page} de{' '}
                {Math.ceil(orders.total / orders.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(orders.page - 1)}
                  disabled={orders.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(orders.page + 1)}
                  disabled={orders.page * orders.limit >= orders.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
          <SheetHeader className="px-8 py-6 bg-muted">
            <SheetTitle className="font-headline font-bold text-xl">
              Nueva Orden de Compra
            </SheetTitle>
            <SheetDescription>
              Crea una nueva orden de compra a un proveedor
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {dialogError && (
              <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-destructive text-sm font-medium">{dialogError}</p>
              </div>
            )}
            <form onSubmit={handleCreateOrder} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="new-order-supplier"
                  className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold"
                >
                  Proveedor <span className="text-destructive">*</span>
                </label>
                <select
                  id="new-order-supplier"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  required
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona un proveedor</option>
                  {dialogSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="new-order-location"
                  className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold"
                >
                  Sucursal <span className="text-destructive">*</span>
                </label>
                <select
                  id="new-order-location"
                  name="locationId"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  required
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona una sucursal</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="gradient" className="flex-1">
                  Crear Orden
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}