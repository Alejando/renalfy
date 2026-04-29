'use client';

import { useRouter } from 'next/navigation';
import type { PaginatedPurchasesResponse } from '@repo/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/app/components/empty-state';

interface PurchasesPageClientProps {
  purchases: PaginatedPurchasesResponse;
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

export function PurchasesPageClient({
  purchases,
}: PurchasesPageClientProps) {
  const router = useRouter();
  const hasMultiplePages = purchases.total > purchases.limit;

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">
          Compras Recibidas
        </h1>
        <p className="text-secondary text-sm mt-1">
          Historial de compras procesadas por recepción de órdenes
        </p>
      </div>

      {purchases.data.length === 0 ? (
        <EmptyState
          title="Sin compras aún"
          description="Las compras se crean al recibir artículos de una orden."
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>
                    Proveedor
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Sucursal
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Fecha
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Monto
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.data.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-foreground font-medium">
                      {purchase.supplierName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {purchase.locationName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {new Date(purchase.date).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      ${Number(purchase.amount).toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" disabled>
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
                Página {purchases.page} de{' '}
                {Math.ceil(purchases.total / purchases.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(purchases.page - 1)}
                  disabled={purchases.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(purchases.page + 1)}
                  disabled={purchases.page * purchases.limit >= purchases.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
