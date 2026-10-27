'use client';

import type { TemplateField } from '@repo/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AppointmentMeasurementForm } from './appointment-measurement-form';

interface AppointmentMeasurementDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentId: string;
  templateFields: TemplateField[];
}

export function AppointmentMeasurementDrawer({
  open,
  onClose,
  onSuccess,
  appointmentId,
  templateFields,
}: AppointmentMeasurementDrawerProps) {
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
        <SheetHeader
          className="px-8 py-6"
          style={{
            background: 'var(--rf-surface-sunk)',
            borderBottom: '1px solid var(--rf-line)',
          }}
        >
          <SheetTitle
            className="font-extrabold text-xl text-rf-ink"
            style={{ fontFamily: 'var(--rf-font-sans)' }}
          >
            Registrar medición
          </SheetTitle>
          <SheetDescription className="text-rf-ink-soft text-sm">
            Agrega los datos clínicos de esta sesión
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <AppointmentMeasurementForm
            appointmentId={appointmentId}
            templateFields={templateFields}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
