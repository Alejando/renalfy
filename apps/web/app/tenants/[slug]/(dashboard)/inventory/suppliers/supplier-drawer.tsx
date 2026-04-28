'use client';

import { useRouter } from 'next/navigation';
import type { SupplierResponse } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { SupplierForm } from './supplier-form';

interface SupplierDrawerProps {
  open: boolean;
  supplier: SupplierResponse | null;
  onClose: () => void;
}

export function SupplierDrawer({ open, supplier, onClose }: SupplierDrawerProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onClose();
    router.refresh();
  };

  const isEditMode = supplier !== null;

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
            {isEditMode ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Actualiza los datos del proveedor'
              : 'Registra un nuevo proveedor en el sistema'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <SupplierForm
            onSuccess={handleSuccess}
            onClose={onClose}
            supplier={supplier}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}