'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Plus, Search, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import type { LocationResponse, PaginatedPatientsResponse, UserRole } from '@repo/types';
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
  Pagination,
} from '@repo/ui';
import { PatientDrawer } from './patient-drawer';

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

const CAN_DELETE_ROLES: UserRole[] = ['OWNER', 'ADMIN'];

function getStatusVariant(status: string): 'info' | 'neutral' | 'danger' {
  if (status === 'ACTIVE') return 'info';
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
      className="flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold text-[13px] text-rf-primary-ink"
      style={{ width: 36, height: 36, background: 'var(--rf-primary-soft)' }}
    >
      {getInitials(name)}
    </div>
  );
}

function ChipSelect({
  value,
  onChange,
  label,
  icon: Icon,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  icon?: React.ElementType;
  options: { value: string; label: string }[];
}) {
  const isActive = value !== '';
  const activeLabel = options.find((o) => o.value === value)?.label ?? label;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
        aria-label={label}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div
        className={[
          'inline-flex items-center gap-1.5 rounded-rf-pill px-3.5 h-9 text-sm font-semibold select-none whitespace-nowrap border pointer-events-none',
          isActive
            ? 'bg-rf-ink text-white border-rf-ink'
            : 'bg-rf-surface text-rf-ink-muted border-rf-line-strong',
        ].join(' ')}
      >
        {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
        <span>{activeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      </div>
    </div>
  );
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
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const canFilterLocation = userLocationId === null;

  const currentLocationId = searchParams.get('locationId') ?? '';
  const currentStatus = searchParams.get('status') ?? '';

  const currentPageIds = patients.data.map((p) => p.id);
  const allSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const someSelected = currentPageIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) currentPageIds.forEach((id) => next.delete(id));
      else currentPageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildParams = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    const search = searchParams.get('search');
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    if (search) p.set('search', search);
    if (locationId) p.set('locationId', locationId);
    if (status) p.set('status', status);
    p.set('page', '1');
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    return p.toString();
  };

  const handleSearch = () => {
    router.push(`?${buildParams({ search: searchValue, page: '1' })}`);
  };

  const handleLocationFilter = (value: string) => {
    router.push(`?${buildParams({ locationId: value, page: '1' })}`);
  };

  const handleStatusFilter = (value: string) => {
    router.push(`?${buildParams({ status: value, page: '1' })}`);
  };

  const goToPage = (newPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', newPage.toString());
    router.push(`?${p.toString()}`);
  };

  const openCreate = () => setDrawerOpen(true);

  const activeCount = patients.data.filter((p) => p.status === 'ACTIVE').length;
  const inactiveCount = patients.data.filter((p) => p.status === 'INACTIVE').length;
  const deletedCount = patients.data.filter((p) => p.status === 'DELETED').length;

  const statusOptions = [
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'INACTIVE', label: 'Inactivo' },
    { value: 'DELETED', label: 'Dado de baja' },
  ];

  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[28px] font-extrabold tracking-tight text-rf-ink"
            style={{ fontFamily: 'var(--rf-font-sans)', letterSpacing: '-0.03em' }}
          >
            Pacientes
          </h1>
          <p className="text-[13px] text-rf-ink-soft mt-1 font-medium">
            {patients.total > 0 ? (
              <>
                {activeCount > 0 && (
                  <span>
                    <span className="text-rf-ink-muted font-semibold">{activeCount}</span> activos
                  </span>
                )}
                {inactiveCount > 0 && (
                  <span>
                    {activeCount > 0 && ' · '}
                    <span className="text-rf-ink-muted font-semibold">{inactiveCount}</span> inactivos
                  </span>
                )}
                {deletedCount > 0 && (
                  <span>
                    {(activeCount > 0 || inactiveCount > 0) && ' · '}
                    <span className="text-rf-ink-muted font-semibold">{deletedCount}</span> dados de baja
                  </span>
                )}
                {activeCount === 0 && inactiveCount === 0 && deletedCount === 0 && (
                  <span>{patients.total} paciente{patients.total !== 1 ? 's' : ''} registrado{patients.total !== 1 ? 's' : ''}</span>
                )}
              </>
            ) : (
              'Ningún paciente registrado aún'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button variant="secondary" size="sm" style={{ height: 40 }}>
            <Download className="h-[14px] w-[14px]" />
            Exportar CSV
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate} style={{ height: 40 }}>
            <Plus className="h-[14px] w-[14px]" />
            Nuevo paciente
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rf-ink-soft pointer-events-none"
          />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por nombre, teléfono…"
            className="w-full h-9 pl-10 pr-4 rounded-rf-pill border border-rf-line-strong bg-rf-surface text-[13px] text-rf-ink placeholder:text-rf-ink-faint focus:outline-none focus:border-rf-primary focus:ring-2 focus:ring-rf-primary/15 transition-rf"
          />
        </div>

        {/* Location chip-select */}
        {canFilterLocation && locations.length > 0 && (
          <ChipSelect
            value={currentLocationId}
            onChange={handleLocationFilter}
            label="Todas las sucursales"
            icon={MapPin}
            options={locationOptions}
          />
        )}

        {/* Status chip-select */}
        <ChipSelect
          value={currentStatus}
          onChange={handleStatusFilter}
          label="Todos los estados"
          options={statusOptions}
        />

        <div className="flex-1" />

        {/* Count */}
        {patients.total > 0 && (
          <span
            className="text-[12px] text-rf-ink-faint font-semibold"
            style={{ fontFamily: 'var(--rf-font-mono)' }}
          >
            {Math.min((patients.page - 1) * patients.limit + 1, patients.total)}–
            {Math.min(patients.page * patients.limit, patients.total)} de {patients.total}
          </span>
        )}
      </div>

      {/* ── Table / Empty ───────────────────────────── */}
      {patients.data.length === 0 ? (
        <EmptyState
          title="Sin pacientes"
          description={
            currentStatus || currentLocationId || searchValue
              ? 'No hay pacientes que coincidan con los filtros aplicados.'
              : 'Crea el primer registro de paciente para comenzar.'
          }
          action={
            !currentStatus && !currentLocationId && !searchValue ? (
              <Button variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nuevo paciente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            className="overflow-hidden overflow-x-auto"
            style={{
              background: 'var(--rf-surface)',
              borderRadius: 'var(--rf-radius-md)',
              border: '1px solid var(--rf-line)',
              boxShadow: 'var(--rf-shadow-xs)',
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-6 pr-0">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-rf-line-strong text-rf-primary focus:ring-rf-primary/20 cursor-pointer accent-rf-primary"
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha nacimiento</TableHead>
                  <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[60px] pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.data.map((patient) => {
                  const isSelected = selectedIds.has(patient.id);
                  return (
                    <TableRow
                      key={patient.id}
                      data-selected={isSelected}
                      className={isSelected ? 'bg-rf-primary-softer' : undefined}
                    >
                      <TableCell className="w-10 pl-6 pr-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(patient.id)}
                          className="h-4 w-4 rounded border-rf-line-strong text-rf-primary focus:ring-rf-primary/20 cursor-pointer accent-rf-primary"
                          aria-label={`Seleccionar ${patient.name}`}
                        />
                      </TableCell>

                      {/* Paciente: avatar + nombre + ID */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PatientAvatar name={patient.name} />
                          <div>
                            <Link
                              href={`/patients/${patient.id}`}
                              className="block font-bold text-rf-ink hover:text-rf-primary transition-rf leading-tight"
                              style={{ fontSize: 14 }}
                            >
                              {patient.name}
                            </Link>
                            <span
                              className="text-rf-ink-faint"
                              style={{
                                fontFamily: 'var(--rf-font-mono)',
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {patient.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-rf-ink-muted text-[13px] hidden md:table-cell">
                        {patient.locationName}
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <span
                          className="text-rf-ink-muted"
                          style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 12 }}
                        >
                          {patient.birthDate
                            ? new Date(patient.birthDate).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <span
                          className="text-rf-ink-muted"
                          style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 12 }}
                        >
                          {patient.phone ?? '—'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={getStatusVariant(patient.status)}>
                          {STATUS_LABELS[patient.status] ?? patient.status}
                        </Badge>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end">
                          <Link
                            href={`/patients/${patient.id}`}
                            aria-label="Ver detalle"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rf-ink-soft hover:bg-rf-surface-sunk hover:text-rf-ink transition-rf"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={patients.page}
            total={patients.total}
            limit={patients.limit}
            onPageChange={goToPage}
          />
        </>
      )}

      {/* ── Drawer ───────────────────────────────── */}
      <PatientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false);
          router.refresh();
        }}
        locations={locations}
        userRole={userRole}
        userLocationId={userLocationId}
      />
    </div>
  );
}
