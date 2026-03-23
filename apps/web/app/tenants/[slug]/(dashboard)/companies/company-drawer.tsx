'use client';

import { useRouter } from 'next/navigation';
import type { CompanyResponse } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CompanyForm } from './company-form';

interface CompanyDrawerProps {
  open: boolean;
  company: CompanyResponse | null;
  onClose: () => void;
}

export function CompanyDrawer({ open, company, onClose }: CompanyDrawerProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onClose();
    router.refresh();
  };

  const isEditMode = company !== null;

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
            {isEditMode ? 'Editar Empresa' : 'Nueva Empresa'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Actualiza los datos de la empresa'
              : 'Registra una nueva empresa en el sistema'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <CompanyForm
            onSuccess={handleSuccess}
            onClose={onClose}
            company={company}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
