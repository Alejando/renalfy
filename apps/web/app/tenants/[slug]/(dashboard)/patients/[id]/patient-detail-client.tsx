'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { PatientResponse, PaginatedAppointmentsResponse, UserRole } from '@repo/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@repo/ui';
import { PatientDrawer } from '../patient-drawer';
import { deletePatientAction } from '../../../../../actions/patients';
import { AppointmentStatusBadge } from '../../appointments/appointment-status-badge';

interface PatientDetailClientProps {
  patient: PatientResponse;
  appointments: PaginatedAppointmentsResponse;
  userRole: UserRole;
  userLocationId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  DELETED: 'Dado de baja',
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
  PRIVACY_NOTICE: 'Aviso de privacidad',
  TREATMENT: 'Tratamiento de datos',
  DATA_SHARING: 'Compartición de datos',
};

const CAN_DELETE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

const APPOINTMENT_STATUS_ORDER: Record<string, number> = {
  IN_PROGRESS: 0,
  SCHEDULED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  NO_SHOW: 4,
};

function getStatusVariant(status: string): 'success' | 'neutral' | 'danger' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'DELETED') return 'danger';
  return 'neutral';
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
      style={{ width: 56, height: 56, background: 'var(--rf-primary-soft)', fontSize: 18 }}
    >
      {getInitials(name)}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function PatientDetailClient({
  patient,
  appointments,
  userRole,
  userLocationId,
}: PatientDetailClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canDelete = CAN_DELETE_ROLES.includes(userRole);

  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    startTransition(async () => {
      await deletePatientAction(patient.id);
      router.push('/patients');
    });
  };

  const sortedAppointments = [...appointments.data].sort((a, b) => {
    const orderA = APPOINTMENT_STATUS_ORDER[a.status] ?? 99;
    const orderB = APPOINTMENT_STATUS_ORDER[b.status] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/patients" />}>
              Pacientes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{patient.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PatientAvatar name={patient.name} />
          <div>
            <h1 className="text-2xl font-bold text-rf-ink font-headline leading-tight">
              {patient.name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant={getStatusVariant(patient.status)}>
                {STATUS_LABELS[patient.status] ?? patient.status}
              </Badge>
              <span className="text-rf-ink-muted text-sm">{patient.locationName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Editar
          </Button>
          {canDelete && patient.status === 'ACTIVE' && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
            >
              Dar de baja
            </Button>
          )}
        </div>
      </div>

      {/* Citas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-headline font-semibold">Citas</CardTitle>
            {appointments.total > 0 && (
              <span
                className="text-[12px] text-rf-ink-faint font-semibold"
                style={{ fontFamily: 'var(--rf-font-mono)' }}
              >
                {appointments.total} en total
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedAppointments.length === 0 ? (
            <p className="text-rf-ink-soft text-sm">Sin citas registradas.</p>
          ) : (
            <div className="space-y-2">
              {sortedAppointments.map((appt) => {
                const isActive = appt.status === 'IN_PROGRESS';
                return (
                  <Link
                    key={appt.id}
                    href={`/appointments/${appt.id}`}
                    className="flex items-center gap-3 rounded-rf p-3 transition-rf hover:bg-rf-surface-sunk group"
                    style={{
                      background: isActive ? 'var(--rf-primary-softer)' : undefined,
                      border: isActive ? '1px solid var(--rf-primary-soft)' : '1px solid var(--rf-line)',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AppointmentStatusBadge status={appt.status} />
                        {appt.serviceTypeName && (
                          <span className="text-rf-ink-soft text-xs">{appt.serviceTypeName}</span>
                        )}
                      </div>
                      <p
                        className="text-rf-ink-faint mt-0.5"
                        style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 11 }}
                      >
                        {formatDate(appt.scheduledAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-rf-ink-faint flex-shrink-0 group-hover:text-rf-ink transition-rf" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline font-semibold">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailField label="Teléfono" value={patient.phone} />
          <DetailField label="Celular" value={patient.mobile} />
          <DetailField label="Sucursal" value={patient.locationName} />
          <DetailField
            label="Fecha de nacimiento"
            value={
              patient.birthDate
                ? new Date(patient.birthDate).toLocaleDateString('es-MX')
                : null
            }
          />
          <div className="md:col-span-2">
            <DetailField label="Dirección" value={patient.address} />
          </div>
          <div className="md:col-span-2">
            <DetailField label="Notas" value={patient.notes} />
          </div>
        </CardContent>
      </Card>

      {/* Consentimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline font-semibold">Consentimiento</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.consent ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DetailField
                label="Tipo"
                value={CONSENT_TYPE_LABELS[patient.consent.type] ?? patient.consent.type}
              />
              <DetailField label="Versión" value={patient.consent.version} />
              <DetailField
                label="Fecha de firma"
                value={new Date(patient.consent.signedAt).toLocaleDateString('es-MX')}
              />
            </div>
          ) : (
            <p className="text-rf-ink-muted text-sm">Sin consentimiento activo</p>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog de baja */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja al paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambiará el estado del paciente a inactivo. Puedes reactivarlo más
              adelante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending}>
              Dar de baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PatientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false);
          router.refresh();
        }}
        patient={patient}
        userRole={userRole}
        userLocationId={userLocationId}
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
      <p className="text-[10px] font-label uppercase tracking-widest text-rf-ink-soft font-semibold">
        {label}
      </p>
      <p className="text-rf-ink text-sm">{value ?? '—'}</p>
    </div>
  );
}
