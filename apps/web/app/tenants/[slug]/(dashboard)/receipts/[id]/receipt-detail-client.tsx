'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReceiptResponse } from '@repo/types';
import { Button } from '@/components/ui/button';
import { ReceiptStatusBadge } from '../receipt-status-badge';
import { ReceiptPaymentTypeBadge } from '../receipt-payment-type-badge';
import { ReceiptStatusTransitionDrawer } from '../receipt-status-transition-drawer';
import { formatDate, formatAmount, isTerminalStatus } from '../receipt-utils';

interface ReceiptDetailClientProps {
  receipt: ReceiptResponse;
}

const SECTION_LABEL =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const VALUE_CLASS = 'text-foreground font-medium text-sm';

export function ReceiptDetailClient({ receipt }: ReceiptDetailClientProps) {
  const router = useRouter();
  const [transitionDrawerOpen, setTransitionDrawerOpen] = useState(false);
  const canTransition = !isTerminalStatus(receipt.status);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/receipts"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver a recibos
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className={SECTION_LABEL}>Folio</p>
          <h1 className="text-2xl font-bold text-on-surface font-headline font-mono mt-1">
            {receipt.folio}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ReceiptStatusBadge status={receipt.status} />
          {canTransition && (
            <Button
              variant="outline"
              onClick={() => setTransitionDrawerOpen(true)}
            >
              Cambiar estado
            </Button>
          )}
        </div>
      </div>

      {/* Receipt Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 rounded-xl border p-6">
        <div className="space-y-1">
          <p className={SECTION_LABEL}>Fecha</p>
          <p className={VALUE_CLASS}>{formatDate(receipt.date)}</p>
        </div>

        <div className="space-y-1">
          <p className={SECTION_LABEL}>Monto</p>
          <p className="text-foreground font-bold text-lg">
            {formatAmount(receipt.amount)}
          </p>
        </div>

        <div className="space-y-1">
          <p className={SECTION_LABEL}>Tipo de pago</p>
          <ReceiptPaymentTypeBadge paymentType={receipt.paymentType} />
        </div>

        {receipt.notes && (
          <div className="space-y-1 col-span-full">
            <p className={SECTION_LABEL}>Notas</p>
            <p className={VALUE_CLASS}>{receipt.notes}</p>
          </div>
        )}

        <div className="space-y-1">
          <p className={SECTION_LABEL}>Creado</p>
          <p className={VALUE_CLASS}>{formatDate(receipt.createdAt)}</p>
        </div>

        <div className="space-y-1">
          <p className={SECTION_LABEL}>Actualizado</p>
          <p className={VALUE_CLASS}>{formatDate(receipt.updatedAt)}</p>
        </div>
      </div>

      {/* Patient link */}
      <div className="rounded-xl border p-6 space-y-2">
        <p className={SECTION_LABEL}>Paciente</p>
        <Link
          href={`/patients/${receipt.patientId}`}
          className="text-primary hover:underline decoration-2 underline-offset-2 font-medium text-sm"
        >
          Ver expediente del paciente
        </Link>
      </div>

      <ReceiptStatusTransitionDrawer
        open={transitionDrawerOpen}
        onClose={() => setTransitionDrawerOpen(false)}
        onSuccess={() => {
          setTransitionDrawerOpen(false);
          router.refresh();
        }}
        receiptId={receipt.id}
        currentStatus={receipt.status}
      />
    </div>
  );
}
