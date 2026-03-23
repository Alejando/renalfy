'use client';

import { useState, useTransition } from 'react';
import type { AppointmentStatus } from '@repo/types';
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
import { updateAppointmentStatusAction } from '../../../../actions/appointments';
import {
  APPOINTMENT_VALID_TRANSITIONS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TRANSITION_LABELS,
} from './appointment-constants';

interface TransitionButtonConfig {
  toStatus: AppointmentStatus;
  label: string;
  variant: 'gradient' | 'destructive' | 'outline';
}

const TRANSITION_BUTTON_CONFIG: Record<AppointmentStatus, TransitionButtonConfig> = {
  SCHEDULED: { toStatus: 'SCHEDULED', label: 'Programada', variant: 'outline' },
  IN_PROGRESS: {
    toStatus: 'IN_PROGRESS',
    label: APPOINTMENT_TRANSITION_LABELS['IN_PROGRESS'],
    variant: 'gradient',
  },
  COMPLETED: {
    toStatus: 'COMPLETED',
    label: APPOINTMENT_TRANSITION_LABELS['COMPLETED'],
    variant: 'gradient',
  },
  CANCELLED: {
    toStatus: 'CANCELLED',
    label: APPOINTMENT_TRANSITION_LABELS['CANCELLED'],
    variant: 'destructive',
  },
  NO_SHOW: {
    toStatus: 'NO_SHOW',
    label: APPOINTMENT_TRANSITION_LABELS['NO_SHOW'],
    variant: 'destructive',
  },
};

interface AppointmentStatusTransitionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentId: string;
  currentStatus: AppointmentStatus;
}

export function AppointmentStatusTransitionDrawer({
  open,
  onClose,
  onSuccess,
  appointmentId,
  currentStatus,
}: AppointmentStatusTransitionDrawerProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validNextStatuses = APPOINTMENT_VALID_TRANSITIONS[currentStatus] ?? [];
  const isTerminal = validNextStatuses.length === 0;

  const handleTransition = (toStatus: AppointmentStatus) => {
    setError(null);
    const formData = new FormData();
    formData.append('status', toStatus);
    if (notes) {
      formData.append('notes', notes);
    }
    startTransition(async () => {
      const result = await updateAppointmentStatusAction(appointmentId, formData);
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
            Cambiar estado de la cita
          </SheetTitle>
          <SheetDescription>
            Estado actual:{' '}
            <span className="font-medium">
              {APPOINTMENT_STATUS_LABELS[currentStatus] ?? currentStatus}
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
              No se pueden realizar más cambios en esta cita. El estado{' '}
              <span className="font-medium">
                {APPOINTMENT_STATUS_LABELS[currentStatus] ?? currentStatus}
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
