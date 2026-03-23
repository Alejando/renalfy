'use client';

import { useState, useTransition } from 'react';
import type { ReceiptStatus } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateReceiptStatusAction } from '../../../../actions/receipts';
import {
  VALID_TRANSITIONS,
  RECEIPT_STATUS_LABELS,
} from './receipt-constants';

interface TransitionButtonConfig {
  toStatus: ReceiptStatus;
  label: string;
  variant: 'gradient' | 'destructive' | 'outline';
}

const TRANSITION_BUTTON_CONFIG: Record<ReceiptStatus, TransitionButtonConfig> = {
  ACTIVE: { toStatus: 'ACTIVE', label: '', variant: 'outline' },
  FINISHED: { toStatus: 'FINISHED', label: 'Finalizar', variant: 'gradient' },
  SETTLED: { toStatus: 'SETTLED', label: 'Liquidar', variant: 'gradient' },
  CANCELLED: { toStatus: 'CANCELLED', label: 'Cancelar recibo', variant: 'destructive' },
};

interface ReceiptStatusTransitionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receiptId: string;
  currentStatus: ReceiptStatus;
}

export function ReceiptStatusTransitionDrawer({
  open,
  onClose,
  onSuccess,
  receiptId,
  currentStatus,
}: ReceiptStatusTransitionDrawerProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validNextStatuses = VALID_TRANSITIONS[currentStatus] ?? [];
  const isTerminal = validNextStatuses.length === 0;

  const handleTransition = (toStatus: ReceiptStatus) => {
    setError(null);
    const formData = new FormData();
    formData.append('status', toStatus);
    if (notes) {
      formData.append('notes', notes);
    }
    startTransition(async () => {
      const result = await updateReceiptStatusAction(receiptId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNotes('');
      onSuccess();
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-8 py-6 bg-muted">
          <SheetTitle className="font-headline font-bold text-xl">
            Cambiar estado del recibo
          </SheetTitle>
          <SheetDescription>
            Estado actual:{' '}
            <span className="font-medium">
              {RECEIPT_STATUS_LABELS[currentStatus] ?? currentStatus}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          {isTerminal ? (
            <p className="text-muted-foreground text-sm">
              No se pueden realizar más cambios en este recibo. El estado{' '}
              <span className="font-medium">
                {RECEIPT_STATUS_LABELS[currentStatus] ?? currentStatus}
              </span>{' '}
              es terminal.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label
                  htmlFor="transition-notes"
                  className="block text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold"
                >
                  Notas (opcional)
                </Label>
                <Textarea
                  id="transition-notes"
                  rows={3}
                  placeholder="Comentarios sobre este cambio de estado..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {validNextStatuses.map((nextStatus) => {
                  const config = TRANSITION_BUTTON_CONFIG[nextStatus];
                  return (
                    <Button
                      key={nextStatus}
                      variant={config.variant}
                      className="w-full"
                      disabled={isPending}
                      onClick={() => handleTransition(nextStatus)}
                    >
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            </>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
            disabled={isPending}
          >
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
