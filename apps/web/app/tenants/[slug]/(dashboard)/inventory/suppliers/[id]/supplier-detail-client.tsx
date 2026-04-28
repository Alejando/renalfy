'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SupplierResponse, UserRole } from '@repo/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AddSupplierProductDialog } from './add-supplier-product-dialog';
import {
  removeSupplierProductAction,
  type SupplierProductListItem,
} from '@/app/actions/suppliers';

interface SupplierDetailClientProps {
  supplier: SupplierResponse;
  supplierProducts: SupplierProductListItem[];
  allProducts: Array<{ id: string; name: string }>;
  userRole: UserRole;
}

const LABEL_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function SupplierDetailClient({
  supplier,
  supplierProducts,
  allProducts,
  userRole,
}: SupplierDetailClientProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  const existingProductIds = new Set(
    supplierProducts.map((sp) => sp.productId),
  );

  const handleRemoveProduct = async (productId: string, productName: string) => {
    const confirmed = window.confirm(
      `¿Eliminar "${productName}" del proveedor?`,
    );
    if (!confirmed) return;
    const result = await removeSupplierProductAction(supplier.id, productId);
    if (!result?.error) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            ← Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface font-headline">
              {supplier.name}
            </h1>
            <p className="text-secondary text-sm mt-1">
              {supplier.initials ? `${supplier.initials} — ` : ''}
              Detalle del Proveedor
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            supplier.status === 'ACTIVE'
              ? 'bg-teal-100 text-teal-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {supplier.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {supplier.contact && (
            <div>
              <p className={LABEL_CLASS}>Contacto</p>
              <p className="text-foreground font-medium mt-1">
                {supplier.contact}
              </p>
            </div>
          )}
          {supplier.phone && (
            <div>
              <p className={LABEL_CLASS}>Teléfono</p>
              <p className="text-foreground font-medium mt-1">
                {supplier.phone}
              </p>
            </div>
          )}
          {supplier.email && (
            <div>
              <p className={LABEL_CLASS}>Email</p>
              <p className="text-foreground font-medium mt-1">
                {supplier.email}
              </p>
            </div>
          )}
          {supplier.address && (
            <div>
              <p className={LABEL_CLASS}>Dirección</p>
              <p className="text-foreground font-medium mt-1">
                {supplier.address}
              </p>
            </div>
          )}
        </div>
        {supplier.notes && (
          <div className="pt-4 border-t">
            <p className={LABEL_CLASS}>Notas</p>
            <p className="text-foreground mt-1">{supplier.notes}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-on-surface font-headline">
            Productos del Proveedor
          </h2>
          <p className="text-secondary text-sm mt-1">
            {supplierProducts.length} producto
            {supplierProducts.length !== 1 ? 's' : ''} asociado
            {supplierProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button variant="gradient" onClick={() => setAddDialogOpen(true)}>
            + Agregar Producto
          </Button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={LABEL_CLASS}>Producto</TableHead>
              <TableHead className={`${LABEL_CLASS} text-right hidden md:table-cell`}>
                Precio
              </TableHead>
              <TableHead className={`${LABEL_CLASS} text-right hidden lg:table-cell`}>
                Lead Time
              </TableHead>
              {canManage && (
                <TableHead className={`${LABEL_CLASS} text-right`}>
                  Acciones
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplierProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 4 : 3}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin productos asociados
                </TableCell>
              </TableRow>
            ) : (
              supplierProducts.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell className="text-foreground font-medium">
                    <div>{sp.product.name}</div>
                    {sp.product.brand && (
                      <div className="text-xs text-muted-foreground">
                        {sp.product.brand}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    ${Number(sp.price).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground hidden lg:table-cell">
                    {sp.leadTimeDays != null ? `${sp.leadTimeDays} días` : '—'}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          handleRemoveProduct(sp.productId, sp.product.name)
                        }
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddSupplierProductDialog
        open={addDialogOpen}
        supplierId={supplier.id}
        existingProductIds={existingProductIds}
        allProducts={allProducts}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={() => {
          setAddDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}