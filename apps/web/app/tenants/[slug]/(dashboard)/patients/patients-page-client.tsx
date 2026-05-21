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
import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyState,
  PageHeader,
  SearchInput,
  Pagination,
} from '@repo/ui';
import { PatientDrawer } from './patient-drawer';
import { deletePatientAction } from '../../../../actions/patients';

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

const TABLE_HEAD_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-rf-ink-muted font-semibold';

const CAN_DELETE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

function getStatusVariant(status: string): 'success' | 'neutral' | 'danger' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'DELETED') return 'danger';
  return 'neutral';
}

export function PatientsPageClient({
  patients,
  userRole,
  userLocationId,
  locations,
}: PatientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<
    PaginatedPatientsResponse['data'][0] | null
  >(null);
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
      <PageHeader
        title="Pacientes"
        description="Gestiona el padrón de pacientes de tu clínica"
        action={
          <Button variant="gradient" onClick={openCreate}>
            + Nuevo paciente
          </Button>
        }
      />

      <SearchInput
        value={searchValue}
        onChange={setSearchValue}
        onSearch={handleSearch}
        placeholder="Buscar por nombre..."
      />

      {patients.data.length === 0 ? (
        <EmptyState
          title="Sin pacientes aún"
          description="Crea el primer registro de paciente para comenzar."
          action={
            <Button variant="gradient" onClick={openCreate}>
              + Nuevo paciente
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TABLE_HEAD_CLASS}>Nombre</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden md:table-cell`}>
                    Sucursal
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Fecha de nacimiento
                  </TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} hidden lg:table-cell`}>
                    Teléfono
                  </TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Estado</TableHead>
                  <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.data.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="text-foreground font-medium">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-primary hover:underline decoration-2 underline-offset-2"
                      >
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {patient.locationName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {patient.birthDate
                        ? new Date(patient.birthDate).toLocaleDateString('es-MX')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {patient.phone ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(patient.status)}>
                        {STATUS_LABELS[patient.status] ?? patient.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(patient)}
                          disabled={patient.status === 'DELETED'}
                          aria-label="Editar"
                        >
                          Editar
                        </Button>
                        {canDelete && patient.status === 'ACTIVE' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTargetId(patient.id)}
                            disabled={isPending}
                          >
                            Dar de baja
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasMultiplePages && (
            <Pagination
              page={patients.page}
              total={patients.total}
              limit={patients.limit}
              onPageChange={goToPage}
            />
          )}
        </>
      )}

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
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
