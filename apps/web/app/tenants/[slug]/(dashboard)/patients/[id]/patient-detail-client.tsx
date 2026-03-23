'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PatientResponse, UserRole } from '@repo/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PatientDrawer } from '../patient-drawer';
import { deletePatientAction } from '../../../../../actions/patients';

interface PatientDetailClientProps {
  patient: PatientResponse;
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

function getStatusVariant(
  status: string,
): 'status-active' | 'status-inactive' | 'status-error' {
  if (status === 'ACTIVE') return 'status-active';
  if (status === 'DELETED') return 'status-error';
  return 'status-inactive';
}

export function PatientDetailClient({
  patient,
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
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">{patient.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={getStatusVariant(patient.status)}>
              {STATUS_LABELS[patient.status] ?? patient.status}
            </Badge>
            <span className="text-secondary text-sm">{patient.locationName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Editar
          </Button>
          {canDelete && patient.status === 'ACTIVE' && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
            >
              Dar de baja
            </Button>
          )}
        </div>
      </div>

      {/* Details card */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
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

      {/* Consent card */}
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
            <p className="text-secondary text-sm">Sin consentimiento activo</p>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog for delete confirmation */}
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
      <p className="text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-foreground text-sm">{value ?? '—'}</p>
    </div>
  );
}
