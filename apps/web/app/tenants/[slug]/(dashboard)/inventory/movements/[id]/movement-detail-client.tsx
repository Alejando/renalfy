'use client';

import { useRouter } from 'next/navigation';
import type { InventoryMovementDetailResponse } from '@repo/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MovementTypeBadge } from '../movement-type-badge';

export function MovementDetailClient({
  movement,
}: {
  movement: InventoryMovementDetailResponse;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Volver
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface font-headline">
              Detalle de Movimiento
            </h1>
            <MovementTypeBadge type={movement.type} />
          </div>
        </div>
      </div>

      {/* Metadata Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface rounded-lg border border-outline">
        <div>
          <p className="text-sm text-secondary">Referencia</p>
          <p className="text-lg font-semibold text-on-surface">
            {movement.reference ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-sm text-secondary">Fecha</p>
          <p className="text-lg font-semibold text-on-surface">
            {new Date(movement.date).toLocaleDateString('es-MX')}
          </p>
        </div>
        <div>
          <p className="text-sm text-secondary">Registrado por</p>
          <p className="text-lg font-semibold text-on-surface">
            {movement.createdBy?.name ?? movement.userId}
          </p>
        </div>
      </div>

      {/* Notes (if present) */}
      {movement.notes && (
        <div className="p-4 bg-surface rounded-lg border border-outline">
          <p className="text-sm text-secondary">Notas</p>
          <p className="text-on-surface mt-1">{movement.notes}</p>
        </div>
      )}

      {/* Items Table */}
      <div className="border border-outline rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unitario</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Antes</TableHead>
              <TableHead className="text-right">Después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movement.items.map((item) => {
              const totalValue =
                item.quantity *
                (item.unitPrice ? Number(item.unitPrice) : 0);

              return (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${item.unitPrice ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    ${totalValue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.beforeStock ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.afterStock ?? '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
