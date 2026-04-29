'use client';

import type { PurchaseOrderDetailResponse } from '@repo/types';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ReceiveItemsForm } from './receive-items-form';

interface ReceiveItemsDialogProps {
  order: PurchaseOrderDetailResponse;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveItemsDialog({
  order,
  open,
  onClose,
  onSuccess,
}: ReceiveItemsDialogProps) {
  return (
    // Sheet closes on Escape via Radix Dialog primitive — no additional code needed
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Recibir Artículos</SheetTitle>
          <SheetDescription>{order.supplier.name}</SheetDescription>
        </SheetHeader>
        <ReceiveItemsForm order={order} onClose={onClose} onSuccess={onSuccess} />
      </SheetContent>
    </Sheet>
  );
}
