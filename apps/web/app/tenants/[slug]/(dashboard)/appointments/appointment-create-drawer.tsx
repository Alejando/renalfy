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
import { AppointmentForm } from './appointment-form';

interface PatientOption {
  id: string;
  name: string;
}

interface AppointmentCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  locations: LocationResponse[];
  serviceTypes: ServiceTypeResponse[];
  patients: PatientOption[];
  userLocationId: string | null;
  userRole: UserRole;
}

export function AppointmentCreateDrawer({
  open,
  onClose,
  locations,
  serviceTypes,
  patients,
  userLocationId,
  userRole,
}: AppointmentCreateDrawerProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onClose();
    router.refresh();
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
          <SheetTitle className="font-headline font-bold text-xl">Nueva cita</SheetTitle>
          <SheetDescription>
            Programa una nueva cita para un paciente
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <AppointmentForm
            onSuccess={handleSuccess}
            onClose={onClose}
            locations={locations}
            serviceTypes={serviceTypes}
            patients={patients}
            userLocationId={userLocationId}
            userRole={userRole}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
