'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Plus } from 'lucide-react';
import type {
  AppointmentResponse,
  ClinicalTemplateResponse,
  AppointmentStatus,
} from '@repo/types';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@repo/ui';
import { AppointmentStatusBadge } from '../appointment-status-badge';
import { AppointmentStatusTransitionDrawer } from '../appointment-status-transition-drawer';
import { AppointmentMeasurementDrawer } from '../appointment-measurement-drawer';
import { AppointmentMeasurementList } from '../appointment-measurement-list';
import { APPOINTMENT_VALID_TRANSITIONS } from '../appointment-constants';

interface AppointmentDetailClientProps {
  appointment: AppointmentResponse;
  clinicalTemplate: ClinicalTemplateResponse | null;
}

const LABEL_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-rf-ink-soft font-semibold';
const VALUE_CLASS = 'text-rf-ink font-medium text-sm';

const ACTIVE_STATUSES: AppointmentStatus[] = ['SCHEDULED', 'IN_PROGRESS'];

function isActiveStatus(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

function isTerminalStatus(status: AppointmentStatus): boolean {
  return APPOINTMENT_VALID_TRANSITIONS[status].length === 0;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

function PatientAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold text-rf-primary-ink"
      style={{ width: 44, height: 44, background: 'var(--rf-primary-soft)', fontSize: 15 }}
    >
      {getInitials(name)}
    </div>
  );
}

export function AppointmentDetailClient({
  appointment,
  clinicalTemplate,
}: AppointmentDetailClientProps) {
  const router = useRouter();
  const [transitionDrawerOpen, setTransitionDrawerOpen] = useState(false);
  const [measurementDrawerOpen, setMeasurementDrawerOpen] = useState(false);
  const canTransition = !isTerminalStatus(appointment.status);
  const canAddMeasurement = isActiveStatus(appointment.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/appointments" />}>
              Citas
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{formatDateShort(appointment.scheduledAt)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PatientAvatar name={appointment.patientName} />
          <div>
            <h1 className="text-2xl font-bold text-rf-ink font-headline leading-tight">
              {appointment.patientName}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <AppointmentStatusBadge status={appointment.status} />
              {appointment.serviceTypeName && (
                <span className="text-rf-ink-muted text-sm">{appointment.serviceTypeName}</span>
              )}
              <span className="text-rf-ink-muted text-sm">{appointment.locationName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {canAddMeasurement && (
            <Button variant="secondary" onClick={() => setMeasurementDrawerOpen(true)}>
              <Plus className="h-4 w-4" />
              Medición
            </Button>
          )}
          {canTransition && (
            <Button variant="secondary" onClick={() => setTransitionDrawerOpen(true)}>
              <ArrowRightLeft className="h-4 w-4" />
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

      {/* Tiempos */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline font-semibold">Tiempos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <DetailField label="Programada" value={formatDateTime(appointment.scheduledAt)} />
          {appointment.startedAt && (
            <DetailField label="Inicio" value={formatDateTime(appointment.startedAt)} />
          )}
          {appointment.endedAt && (
            <DetailField label="Fin" value={formatDateTime(appointment.endedAt)} />
          )}
        </CardContent>
      </Card>

      {/* Paciente */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline font-semibold">Paciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className={VALUE_CLASS}>{appointment.patientName}</p>
          <Link
            href={`/patients/${appointment.patientId}`}
            className="text-rf-primary hover:underline decoration-2 underline-offset-2 font-medium text-sm"
          >
            Ver expediente del paciente →
          </Link>
        </CardContent>
      </Card>

      {/* Notas */}
      {appointment.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline font-semibold">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={VALUE_CLASS}>{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Mediciones */}
      <AppointmentMeasurementList measurements={appointment.measurements} />

      {/* Drawers */}
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

      <AppointmentMeasurementDrawer
        open={measurementDrawerOpen}
        onClose={() => setMeasurementDrawerOpen(false)}
        onSuccess={() => {
          setMeasurementDrawerOpen(false);
          router.refresh();
        }}
        appointmentId={appointment.id}
        templateFields={clinicalTemplate?.fields ?? []}
      />
    </div>
  );
}

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="space-y-1">
      <p className={LABEL_CLASS}>{label}</p>
      <p className={VALUE_CLASS}>{value ?? '—'}</p>
    </div>
  );
}
