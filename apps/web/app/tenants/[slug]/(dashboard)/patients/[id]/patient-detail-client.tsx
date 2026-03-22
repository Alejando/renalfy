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

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-primary/10 text-primary',
  INACTIVE: 'bg-surface-container-high text-secondary',
  DELETED: 'bg-error-container/60 text-on-error-container',
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
  PRIVACY_NOTICE: 'Aviso de privacidad',
  TREATMENT: 'Tratamiento de datos',
  DATA_SHARING: 'Compartición de datos',
};

const CAN_DELETE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

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
      <nav className="flex items-center gap-2 text-sm text-secondary">
        <Link href="/patients" className="hover:text-primary transition-colors">
          Pacientes
        </Link>
        <span>›</span>
        <span className="text-on-surface font-medium">{patient.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">{patient.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-label ${STATUS_CLASSES[patient.status] ?? ''}`}
            >
              {STATUS_LABELS[patient.status] ?? patient.status}
            </span>
            <span className="text-secondary text-sm">{patient.locationName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2.5 rounded-md bg-surface-container text-secondary font-semibold text-sm hover:bg-surface-container-high transition-colors"
          >
            Editar
          </button>
          {canDelete && patient.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
              className="px-4 py-2.5 rounded-md bg-error-container text-on-error-container font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              Dar de baja
            </button>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* Consent section */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
        <h2 className="font-headline font-semibold text-on-surface mb-4">Consentimiento</h2>
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
      </div>

      {/* AlertDialog for delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja al paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambiará el estado del paciente a inactivo. Puedes reactivarlo más adelante.
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
      <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
        {label}
      </p>
      <p className="text-on-surface text-sm">{value ?? '—'}</p>
    </div>
  );
}
