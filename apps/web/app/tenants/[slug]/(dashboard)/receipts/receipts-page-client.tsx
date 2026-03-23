'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  LocationResponse,
  PaginatedReceiptsResponse,
  ServiceTypeResponse,
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
import { EmptyState } from '../../../../components/empty-state';
import { ReceiptStatusBadge } from './receipt-status-badge';
import { ReceiptPaymentTypeBadge } from './receipt-payment-type-badge';
import { ReceiptCreateDrawer } from './receipt-create-drawer';
import {
  RECEIPT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  RECEIPT_STATUSES,
  PAYMENT_TYPES,
} from './receipt-constants';
import { formatDate, formatAmount } from './receipt-utils';

interface PatientOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
  status: string;
}

interface ReceiptsPageClientProps {
  receipts: PaginatedReceiptsResponse;
  userRole: UserRole;
  userLocationId: string | null;
  locations: LocationResponse[];
  serviceTypes?: ServiceTypeResponse[];
  patients?: PatientOption[];
  plans?: PlanOption[];
}

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const SELECT_CLASS =
  'bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all appearance-none';

export function ReceiptsPageClient({
  receipts,
  userRole,
  userLocationId,
  locations,
  serviceTypes = [],
  patients = [],
  plans = [],
}: ReceiptsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentStatus = searchParams.get('status') ?? '';
  const currentPaymentType = searchParams.get('paymentType') ?? '';
  const currentDate = searchParams.get('date') ?? '';

  const hasMultiplePages = receipts.total > receipts.limit;

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Recibos</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona los recibos de pago de tu clínica
          </p>
        </div>
        <Button variant="gradient" onClick={() => setDrawerOpen(true)}>
          + Nuevo recibo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap"
          >
            Estado
          </label>
          <select
            id="filter-status"
            aria-label="Estado"
            className={SELECT_CLASS}
            value={currentStatus}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">Todos</option>
            {RECEIPT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RECEIPT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-payment-type"
            className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap"
          >
            Pago
          </label>
          <select
            id="filter-payment-type"
            className={SELECT_CLASS}
            value={currentPaymentType}
            onChange={(e) => updateFilter('paymentType', e.target.value)}
          >
            <option value="">Todos</option>
            {PAYMENT_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {PAYMENT_TYPE_LABELS[pt]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-date"
            className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold"
          >
            Fecha
          </label>
          <input
            id="filter-date"
            type="date"
            className={SELECT_CLASS}
            value={currentDate}
            onChange={(e) => updateFilter('date', e.target.value)}
          />
        </div>
      </div>

      {/* Table or empty state */}
      {receipts.data.length === 0 ? (
        <EmptyState
          title="Sin recibos aún"
          description="Crea el primer recibo para comenzar."
          action={
            <Button variant="gradient" onClick={() => setDrawerOpen(true)}>
              + Nuevo recibo
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Folio</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Fecha
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Monto
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Pago</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.data.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="text-foreground font-medium font-mono">
                      <Link
                        href={`/receipts/${receipt.id}`}
                        className="text-primary hover:underline decoration-2 underline-offset-2"
                      >
                        {receipt.folio}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {formatDate(receipt.date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {formatAmount(receipt.amount)}
                    </TableCell>
                    <TableCell>
                      <ReceiptPaymentTypeBadge paymentType={receipt.paymentType} />
                    </TableCell>
                    <TableCell>
                      <ReceiptStatusBadge status={receipt.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/receipts/${receipt.id}`}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          Ver detalle
                        </Link>
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
                Página {receipts.page} de {Math.ceil(receipts.total / receipts.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(receipts.page - 1)}
                  disabled={receipts.page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(receipts.page + 1)}
                  disabled={receipts.page * receipts.limit >= receipts.total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ReceiptCreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={locations}
        serviceTypes={serviceTypes}
        patients={patients}
        plans={plans}
        userLocationId={userLocationId}
        userRole={userRole}
      />
    </div>
  );
}
