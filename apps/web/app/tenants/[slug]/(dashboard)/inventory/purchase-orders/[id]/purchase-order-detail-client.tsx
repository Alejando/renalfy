'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  PurchaseOrderDetailResponse,
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { PurchaseOrderStatusBadge } from '../purchase-order-status-badge';
import { AddOrderItemDialog } from './add-order-item-dialog';
import { ReceiveItemsDialog } from './receive-items-dialog';
import {
  updatePurchaseOrderStatusAction,
  removeOrderItemAction,
} from '@/app/actions/purchase-orders';

interface PurchaseOrderDetailClientProps {
  order: PurchaseOrderDetailResponse;
  userRole: UserRole;
  userLocationId: string | null;
}

const LABEL_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function PurchaseOrderDetailClient({
  order,
  userRole,
}: PurchaseOrderDetailClientProps) {
  const router = useRouter();
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';
  const canReceive = userRole === 'MANAGER' || userRole === 'OWNER' || userRole === 'ADMIN';
  const isDraft = order.status === 'DRAFT';
  const isSent = order.status === 'SENT';
  const isConfirmed = order.status === 'CONFIRMED';

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleStatusUpdate = async (status: 'SENT' | 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(true);
    const result = await updatePurchaseOrderStatusAction(order.id, status);
    setActionLoading(false);
    if (!result?.error) {
      router.refresh();
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const confirmed = window.confirm('¿Eliminar este ítem de la orden?');
    if (!confirmed) return;
    const result = await removeOrderItemAction(order.id, itemId);
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
              Orden de Compra
            </h1>
            <p className="text-secondary text-sm mt-1">
              {order.supplier.name}
            </p>
          </div>
        </div>
        <PurchaseOrderStatusBadge status={order.status} />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className={LABEL_CLASS}>Proveedor</p>
            <p className="text-foreground font-medium mt-1">{order.supplier.name}</p>
          </div>
          <div>
            <p className={LABEL_CLASS}>Sucursal</p>
            <p className="text-foreground font-medium mt-1">{order.location.name}</p>
          </div>
          <div>
            <p className={LABEL_CLASS}>Fecha</p>
            <p className="text-foreground font-medium mt-1">
              {new Date(order.date).toLocaleDateString('es-MX')}
            </p>
          </div>
          <div>
            <p className={LABEL_CLASS}>Fecha Esperada</p>
            <p className="text-foreground font-medium mt-1">
              {order.expectedDate
                ? new Date(order.expectedDate).toLocaleDateString('es-MX')
                : '—'}
            </p>
          </div>
        </div>

        {order.notes && (
          <div>
            <p className={LABEL_CLASS}>Notas</p>
            <p className="text-foreground mt-1">{order.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className={LABEL_CLASS}>Total</p>
            <p className="text-2xl font-bold text-on-surface font-headline mt-1">
              ${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                {isDraft && (
                  <>
                    <Button
                      variant="gradient"
                      onClick={() => setAddItemDialogOpen(true)}
                    >
                      + Agregar Producto
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate('SENT')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Enviando…' : 'Enviar al Proveedor'}
                    </Button>
                  </>
                )}
                {isSent && (
                  <Button
                    variant="gradient"
                    onClick={() => handleStatusUpdate('CONFIRMED')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Confirmando…' : 'Confirmar Orden'}
                  </Button>
                )}
                {(isDraft || isSent) && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                )}
              </>
            )}
            {isConfirmed && canReceive && (
              <Button
                variant="gradient"
                onClick={() => setReceiveDialogOpen(true)}
              >
                Recibir Artículos
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={LABEL_CLASS}>Producto</TableHead>
              <TableHead className={`${LABEL_CLASS} text-right`}>Cantidad</TableHead>
              <TableHead className={`${LABEL_CLASS} text-right hidden md:table-cell`}>
                Precio Unitario
              </TableHead>
              <TableHead className={`${LABEL_CLASS} text-right hidden md:table-cell`}>
                Subtotal
              </TableHead>
              {(isDraft && canManage) && (
                <TableHead className={`${LABEL_CLASS} text-right`}>Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isDraft && canManage ? 5 : 4}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin ítems agregados
                </TableCell>
              </TableRow>
            ) : (
              order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-foreground font-medium">
                    <div>{item.product.name}</div>
                    {item.product.brand && (
                      <div className="text-xs text-muted-foreground">
                        {item.product.brand}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                    ${Number(item.unitPrice).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-medium hidden md:table-cell">
                    ${Number(item.subtotal).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  {isDraft && canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
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


      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Orden de Compra</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground">
            ¿Estás seguro de que deseas cancelar esta orden de compra? Esta acción no se
            puede deshacer.
          </p>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              No, mantener orden
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelando…' : 'Sí, cancelar orden'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddOrderItemDialog
        open={addItemDialogOpen}
        orderId={order.id}
        supplierId={order.supplierId}
        onClose={() => setAddItemDialogOpen(false)}
        onSuccess={() => {
          setAddItemDialogOpen(false);
          router.refresh();
        }}
      />

      <ReceiveItemsDialog
        order={order}
        open={receiveDialogOpen}
        onClose={() => setReceiveDialogOpen(false)}
        onSuccess={() => {
          setReceiveDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}