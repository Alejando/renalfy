import type { AppointmentStatus } from '@repo/types';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
  NO_SHOW: '#6b7280',
};

/** Valid next states for each current status. Empty array means terminal state. */
export const APPOINTMENT_VALID_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const APPOINTMENT_TRANSITION_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'Iniciar sesión',
  COMPLETED: 'Completar',
  CANCELLED: 'Cancelar cita',
  NO_SHOW: 'No se presentó',
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];
