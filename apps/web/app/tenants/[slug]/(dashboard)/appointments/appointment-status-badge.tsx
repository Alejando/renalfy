import type { AppointmentStatus } from '@repo/types';
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from './appointment-constants';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({
  status,
  className = '',
}: AppointmentStatusBadgeProps) {
  const label = APPOINTMENT_STATUS_LABELS[status] ?? status;
  const color = APPOINTMENT_STATUS_COLORS[status] ?? '#6b7280';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}
