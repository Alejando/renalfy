'use client';

import { useRouter } from 'next/navigation';
import type { LocationResponse, ServiceTypeResponse, UserRole } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ReceiptForm } from './receipt-form';

interface PlanOption {
  id: string;
  name: string;
  status: string;
}

interface PatientOption {
  id: string;
  name: string;
}

interface ReceiptCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (folio: string) => void;
  locations: LocationResponse[];
  serviceTypes: ServiceTypeResponse[];
  patients: PatientOption[];
  plans?: PlanOption[];
  userLocationId: string | null;
  userRole: UserRole;
}

export function ReceiptCreateDrawer({
  open,
  onClose,
  onCreated,
  locations,
  serviceTypes,
  patients,
  plans = [],
  userLocationId,
  userRole,
}: ReceiptCreateDrawerProps) {
  const router = useRouter();

  const handleSuccess = (folio: string) => {
    onClose();
    router.refresh();
    onCreated?.(folio);
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
          <SheetTitle className="font-headline font-bold text-xl">Nuevo recibo</SheetTitle>
          <SheetDescription>
            Registra un nuevo recibo de pago para un paciente
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <ReceiptForm
            onSuccess={handleSuccess}
            onClose={onClose}
            locations={locations}
            serviceTypes={serviceTypes}
            patients={patients}
            plans={plans}
            userLocationId={userLocationId}
            userRole={userRole}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
