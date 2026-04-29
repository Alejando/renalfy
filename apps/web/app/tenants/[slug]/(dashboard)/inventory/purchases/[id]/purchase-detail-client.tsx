'use client';

import type { PurchaseDetailResponse } from '@repo/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PurchaseDetailClientProps {
  purchase: PurchaseDetailResponse;
}

export function PurchaseDetailClient({ purchase }: PurchaseDetailClientProps) {
  const router = useRouter();

  const totalPrice = purchase.items.reduce((sum, item) => {
    return sum + parseFloat(item.subtotal || '0');
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Volver
        </Button>
        <h1 className="text-2xl font-bold">Detalle de Compra</h1>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Orden de Compra</p>
          <p className="text-lg font-bold">{purchase.purchaseOrderId}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Proveedor</p>
          <p className="text-lg">{purchase.supplierName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Sucursal</p>
          <p className="text-lg">{purchase.locationName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Fecha</p>
          <p className="text-lg">
            {new Date(purchase.date).toLocaleDateString('es-MX')}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Ordenado</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Unidades/Empaque</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Impuesto</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product.name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.quantityReceived}</TableCell>
                <TableCell className="text-right">{item.unitsPerPackage}</TableCell>
                <TableCell className="text-right">${item.unitPrice}</TableCell>
                <TableCell className="text-right">${item.tax}</TableCell>
                <TableCell className="text-right font-semibold">
                  ${item.subtotal}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs rounded-lg border p-4">
          <div className="flex justify-between">
            <span>Monto Total:</span>
            <span className="font-bold">${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
