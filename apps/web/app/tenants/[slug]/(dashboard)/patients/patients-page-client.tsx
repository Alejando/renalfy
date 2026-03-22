'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LocationResponse, PaginatedPatientsResponse, UserRole } from '@repo/types';
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
import { PatientDrawer } from './patient-drawer';
import { deletePatientAction } from '../../../../actions/patients';
import { EmptyState } from '../../../../components/empty-state';

interface PatientsPageClientProps {
  patients: PaginatedPatientsResponse;
  userRole: UserRole;
  userLocationId: string | null;
  locations: LocationResponse[];
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

const CAN_DELETE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

export function PatientsPageClient({
  patients,
  userRole,
  userLocationId,
  locations,
}: PatientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PaginatedPatientsResponse['data'][0] | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [isPending, startTransition] = useTransition();

  const canDelete = CAN_DELETE_ROLES.includes(userRole);
  const hasMultiplePages = patients.total > patients.limit;

  const openCreate = () => {
    setSelectedPatient(null);
    setDrawerOpen(true);
  };

  const openEdit = (patient: PaginatedPatientsResponse['data'][0]) => {
    setSelectedPatient(patient);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedPatient(null);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchValue) {
      params.set('search', searchValue);
    }
    params.set('page', '1');
    const include = searchParams.get('include');
    if (include) {
      params.set('include', include);
    }
    router.push(`?${params.toString()}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    startTransition(async () => {
      await deletePatientAction(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Pacientes</h1>
          <p className="text-secondary text-sm mt-1">
            Gestiona el padrón de pacientes de tu clínica
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm transition-all active:scale-[0.98] hover:opacity-95 shadow-md shadow-primary/10"
          style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
        >
          + Nuevo paciente
        </button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Buscar por nombre..."
          className="flex-1 bg-surface-container-highest border-none rounded-md px-4 py-2.5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          aria-label="Buscar"
          className="px-4 py-2.5 rounded-md bg-surface-container text-secondary font-semibold text-sm hover:bg-surface-container-high transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Table or empty state */}
      {patients.data.length === 0 ? (
        <EmptyState
          title="Sin pacientes aún"
          description="Crea el primer registro de paciente para comenzar."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 rounded-md text-on-primary font-semibold text-sm shadow-md shadow-primary/10"
              style={{ background: 'linear-gradient(135deg, #00647c 0%, #008fa3 100%)' }}
            >
              + Nuevo paciente
            </button>
          }
        />
      ) : (
        <>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                    Nombre
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold hidden md:table-cell">
                    Sucursal
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold hidden lg:table-cell">
                    Fecha de nacimiento
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold hidden lg:table-cell">
                    Teléfono
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                    Estado
                  </th>
                  <th className="text-right px-6 py-4 text-[10px] font-label uppercase tracking-widest text-secondary font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.data.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-on-surface font-medium">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-primary hover:underline decoration-2 underline-offset-2"
                      >
                        {patient.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-secondary text-sm hidden md:table-cell">
                      {patient.locationName}
                    </td>
                    <td className="px-6 py-4 text-secondary text-sm hidden lg:table-cell">
                      {patient.birthDate
                        ? new Date(patient.birthDate).toLocaleDateString('es-MX')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-secondary text-sm hidden lg:table-cell">
                      {patient.phone ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-label ${STATUS_CLASSES[patient.status] ?? ''}`}
                      >
                        {STATUS_LABELS[patient.status] ?? patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(patient)}
                          disabled={patient.status === 'DELETED'}
                          aria-label="Editar"
                          className="text-sm text-primary font-semibold hover:underline decoration-2 underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                        >
                          Editar
                        </button>
                        {canDelete && patient.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(patient.id)}
                            disabled={isPending}
                            className="text-sm text-error font-semibold hover:underline decoration-2 underline-offset-2 disabled:opacity-50"
                          >
                            Dar de baja
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {hasMultiplePages && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                Página {patients.page} de {Math.ceil(patients.total / patients.limit)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(patients.page - 1)}
                  disabled={patients.page <= 1}
                  className="px-4 py-2 rounded-md bg-surface-container text-secondary font-semibold text-sm hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(patients.page + 1)}
                  disabled={patients.page * patients.limit >= patients.total}
                  className="px-4 py-2 rounded-md bg-surface-container text-secondary font-semibold text-sm hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* AlertDialog for delete confirmation */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
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
        onClose={closeDrawer}
        onSuccess={() => {
          closeDrawer();
          router.refresh();
        }}
        patient={selectedPatient ?? undefined}
        locations={locations}
        userRole={userRole}
        userLocationId={userLocationId}
      />
    </div>
  );
}
