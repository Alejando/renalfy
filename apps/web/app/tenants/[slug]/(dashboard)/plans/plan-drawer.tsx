'use client';

import { useRouter } from 'next/navigation';
import type { PlanResponse, LocationResponse, ServiceTypeResponse, UserRole } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { PlanForm } from './plan-form';

interface PatientOption {
  id: string;
  name: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface PlanDrawerProps {
  open: boolean;
  plan: PlanResponse | null;
  onClose: () => void;
  patients: PatientOption[];
  companies: CompanyOption[];
  serviceTypes: ServiceTypeResponse[];
  locations?: LocationResponse[];
  userRole: UserRole;
  userLocationId: string | null;
}

export function PlanDrawer({
  open,
  plan,
  onClose,
  patients,
  companies,
  serviceTypes,
  locations = [],
  userRole,
  userLocationId,
}: PlanDrawerProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onClose();
    router.refresh();
  };

  const isEditMode = plan !== null;

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
            {isEditMode ? 'Editar Plan' : 'Nuevo Plan'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Actualiza los datos del plan de tratamiento'
              : 'Registra un nuevo plan de tratamiento'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <PlanForm
            onSuccess={handleSuccess}
            onClose={onClose}
            plan={plan}
            patients={patients}
            companies={companies}
            serviceTypes={serviceTypes}
            locations={locations}
            userRole={userRole}
            userLocationId={userLocationId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
