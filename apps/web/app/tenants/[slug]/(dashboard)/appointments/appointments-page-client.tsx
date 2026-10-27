'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, Calendar, X } from 'lucide-react';
import type {
  LocationResponse,
  PaginatedAppointmentsResponse,
  ServiceTypeResponse,
  UserRole,
} from '@repo/types';
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
import { AppointmentCreateDrawer } from './appointment-create-drawer';
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
} from './appointment-constants';
import type { AppointmentStatus } from '@repo/types';

interface PatientOption {
  id: string;
  name: string;
}

interface AppointmentsPageClientProps {
  appointments: PaginatedAppointmentsResponse;
  userRole: UserRole;
  userLocationId: string | null;
  locations: LocationResponse[];
  serviceTypes: ServiceTypeResponse[];
  patients: PatientOption[];
}

const STATUS_BADGE_VARIANT: Record<AppointmentStatus, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'neutral',
};

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

function formatScheduledAt(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function AppointmentsPageClient({
  appointments,
  userRole,
  userLocationId,
  locations,
  serviceTypes,
  patients,
}: AppointmentsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const currentStatus = searchParams.get('status') ?? '';
  const currentDate = searchParams.get('date') ?? '';

  const scheduledCount = appointments.data.filter((a) => a.status === 'SCHEDULED').length;
  const inProgressCount = appointments.data.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = appointments.data.filter((a) => a.status === 'COMPLETED').length;

  const statusOptions = APPOINTMENT_STATUSES.map((s) => ({
    value: s,
    label: APPOINTMENT_STATUS_LABELS[s],
  }));

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[28px] font-extrabold tracking-tight text-rf-ink"
            style={{ fontFamily: 'var(--rf-font-sans)', letterSpacing: '-0.03em' }}
          >
            Citas
          </h1>
          <p className="text-[13px] text-rf-ink-soft mt-1 font-medium">
            {appointments.total > 0 ? (
              <>
                {scheduledCount > 0 && (
                  <span>
                    <span className="text-rf-ink-muted font-semibold">{scheduledCount}</span> programadas
                  </span>
                )}
                {inProgressCount > 0 && (
                  <span>
                    {scheduledCount > 0 && ' · '}
                    <span className="text-rf-ink-muted font-semibold">{inProgressCount}</span> en curso
                  </span>
                )}
                {completedCount > 0 && (
                  <span>
                    {(scheduledCount > 0 || inProgressCount > 0) && ' · '}
                    <span className="text-rf-ink-muted font-semibold">{completedCount}</span> completadas
                  </span>
                )}
                {scheduledCount === 0 && inProgressCount === 0 && completedCount === 0 && (
                  <span>{appointments.total} cita{appointments.total !== 1 ? 's' : ''}</span>
                )}
              </>
            ) : (
              'Ninguna cita registrada aún'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button variant="primary" size="sm" onClick={() => setDrawerOpen(true)} style={{ height: 40 }}>
            <Plus className="h-[14px] w-[14px]" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <ChipSelect
          value={currentStatus}
          onChange={(v) => updateFilter('status', v)}
          label="Todos los estados"
          options={statusOptions}
        />

        {/* Date filter — button triggers native picker via showPicker() */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker()}
            className={[
              'inline-flex items-center gap-1.5 rounded-rf-pill px-3.5 h-9 text-sm font-semibold border select-none cursor-pointer transition-rf',
              currentDate
                ? 'bg-rf-ink text-white border-rf-ink'
                : 'bg-rf-surface text-rf-ink-muted border-rf-line-strong hover:border-rf-primary/40 hover:text-rf-ink',
            ].join(' ')}
            aria-label="Filtrar por fecha"
          >
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{currentDate || 'Fecha'}</span>
            {!currentDate && <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />}
          </button>
          {currentDate && (
            <button
              type="button"
              onClick={() => updateFilter('date', '')}
              aria-label="Limpiar fecha"
              className="inline-flex items-center justify-center h-6 w-6 rounded-full text-rf-ink-soft hover:bg-rf-surface-sunk hover:text-rf-ink transition-rf"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            ref={dateInputRef}
            type="date"
            value={currentDate}
            onChange={(e) => updateFilter('date', e.target.value)}
            className="sr-only"
            aria-label="Fecha"
            tabIndex={-1}
          />
        </div>

        <div className="flex-1" />

        {appointments.total > 0 && (
          <span
            className="text-[12px] text-rf-ink-faint font-semibold"
            style={{ fontFamily: 'var(--rf-font-mono)' }}
          >
            {Math.min((appointments.page - 1) * appointments.limit + 1, appointments.total)}–
            {Math.min(appointments.page * appointments.limit, appointments.total)} de {appointments.total}
          </span>
        )}
      </div>

      {/* ── Table / Empty ───────────────────────────── */}
      {appointments.data.length === 0 ? (
        <EmptyState
          title="Sin citas"
          description={
            currentStatus || currentDate
              ? 'No hay citas que coincidan con los filtros aplicados.'
              : 'Programa la primera cita para comenzar.'
          }
          action={
            !currentStatus && !currentDate ? (
              <Button variant="primary" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                Nueva cita
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
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha programada</TableHead>
                  <TableHead className="hidden lg:table-cell">Servicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[52px] pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.data.map((appointment) => {
                  const patientName = appointment.patientName;
                  const serviceTypeName = appointment.serviceTypeName ?? '—';

                  return (
                    <TableRow key={appointment.id}>
                      {/* Paciente: avatar + nombre + ID */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PatientAvatar name={patientName} />
                          <div>
                            <p className="font-bold text-rf-ink leading-tight" style={{ fontSize: 14 }}>
                              {patientName}
                            </p>
                            <span
                              className="text-rf-ink-faint"
                              style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 11, fontWeight: 600 }}
                            >
                              {appointment.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <span
                          className="text-rf-ink-muted"
                          style={{ fontFamily: 'var(--rf-font-mono)', fontSize: 12 }}
                        >
                          {formatScheduledAt(appointment.scheduledAt)}
                        </span>
                      </TableCell>

                      <TableCell className="text-rf-ink-muted text-[13px] hidden lg:table-cell">
                        {serviceTypeName}
                      </TableCell>

                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
                          {APPOINTMENT_STATUS_LABELS[appointment.status]}
                        </Badge>
                      </TableCell>

                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end">
                          <Link
                            href={`/appointments/${appointment.id}`}
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
            page={appointments.page}
            total={appointments.total}
            limit={appointments.limit}
            onPageChange={goToPage}
          />
        </>
      )}

      <AppointmentCreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locations={locations}
        serviceTypes={serviceTypes}
        patients={patients}
        userLocationId={userLocationId}
        userRole={userRole}
      />
    </div>
  );
}
