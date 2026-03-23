'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  AppointmentResponse,
  ClinicalTemplateResponse,
  AppointmentStatus,
} from '@repo/types';
import { Button } from '@/components/ui/button';
import { AppointmentStatusBadge } from '../appointment-status-badge';
import { AppointmentStatusTransitionDrawer } from '../appointment-status-transition-drawer';
import { AppointmentMeasurementList } from '../appointment-measurement-list';
import { AppointmentMeasurementForm } from '../appointment-measurement-form';
import { APPOINTMENT_VALID_TRANSITIONS } from '../appointment-constants';

interface AppointmentDetailClientProps {
  appointment: AppointmentResponse;
  clinicalTemplate: ClinicalTemplateResponse | null;
}

const SECTION_LABEL =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

const VALUE_CLASS = 'text-foreground font-medium text-sm';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

const ACTIVE_STATUSES: AppointmentStatus[] = ['SCHEDULED', 'IN_PROGRESS'];

function isActiveStatus(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

function isTerminalStatus(status: AppointmentStatus): boolean {
  return APPOINTMENT_VALID_TRANSITIONS[status].length === 0;
}

export function AppointmentDetailClient({
  appointment,
  clinicalTemplate,
}: AppointmentDetailClientProps) {
  const router = useRouter();
  const [transitionDrawerOpen, setTransitionDrawerOpen] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const canTransition = !isTerminalStatus(appointment.status);
  const canAddMeasurement = isActiveStatus(appointment.status);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/appointments"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver a citas
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className={SECTION_LABEL}>Cita</p>
          <h1 className="text-2xl font-bold text-on-surface font-headline mt-1">
            {formatDateTime(appointment.scheduledAt)}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AppointmentStatusBadge status={appointment.status} />
          {canTransition && (
            <Button
              variant="outline"
              onClick={() => setTransitionDrawerOpen(true)}
            >
              Cambiar estado
            </Button>
          )}
          {appointment.status === 'COMPLETED' && !appointment.receiptId && (
            <Link href={`/receipts?appointmentId=${appointment.id}`}>
              <Button variant="gradient">Crear recibo</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Appointment Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 rounded-xl border p-6">
        <div className="space-y-1">
          <p className={SECTION_LABEL}>Fecha programada</p>
          <p className={VALUE_CLASS}>{formatDateTime(appointment.scheduledAt)}</p>
        </div>

        {appointment.startedAt && (
          <div className="space-y-1">
            <p className={SECTION_LABEL}>Inicio</p>
            <p className={VALUE_CLASS}>{formatDateTime(appointment.startedAt)}</p>
          </div>
        )}

        {appointment.endedAt && (
          <div className="space-y-1">
            <p className={SECTION_LABEL}>Fin</p>
            <p className={VALUE_CLASS}>{formatDateTime(appointment.endedAt)}</p>
          </div>
        )}

        {appointment.notes && (
          <div className="space-y-1 col-span-full">
            <p className={SECTION_LABEL}>Notas</p>
            <p className={VALUE_CLASS}>{appointment.notes}</p>
          </div>
        )}

        <div className="space-y-1">
          <p className={SECTION_LABEL}>Creado</p>
          <p className={VALUE_CLASS}>{formatDateTime(appointment.createdAt)}</p>
        </div>
      </div>

      {/* Patient card */}
      <div className="rounded-xl border p-6 space-y-2">
        <p className={SECTION_LABEL}>Paciente</p>
        <Link
          href={`/patients/${appointment.patientId}`}
          className="text-primary hover:underline decoration-2 underline-offset-2 font-medium text-sm"
        >
          Ver expediente del paciente
        </Link>
      </div>

      {/* Service type card */}
      {appointment.serviceTypeId && (
        <div className="rounded-xl border p-6 space-y-2">
          <p className={SECTION_LABEL}>Tipo de servicio</p>
          <p className={VALUE_CLASS}>{appointment.serviceTypeId}</p>
        </div>
      )}

      {/* Measurements list */}
      <AppointmentMeasurementList measurements={appointment.measurements} />

      {/* New measurement form */}
      {canAddMeasurement && (
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className={SECTION_LABEL}>Nueva medición</p>
            {!showMeasurementForm && (
              <Button
                variant="outline"
                onClick={() => setShowMeasurementForm(true)}
              >
                + Registrar medición
              </Button>
            )}
          </div>
          {showMeasurementForm && (
            <AppointmentMeasurementForm
              appointmentId={appointment.id}
              templateFields={clinicalTemplate?.fields ?? []}
              onSuccess={() => {
                setShowMeasurementForm(false);
                router.refresh();
              }}
              onClose={() => setShowMeasurementForm(false)}
            />
          )}
        </div>
      )}

      <AppointmentStatusTransitionDrawer
        open={transitionDrawerOpen}
        onClose={() => setTransitionDrawerOpen(false)}
        onSuccess={() => {
          setTransitionDrawerOpen(false);
          router.refresh();
        }}
        appointmentId={appointment.id}
        currentStatus={appointment.status}
      />
    </div>
  );
}
