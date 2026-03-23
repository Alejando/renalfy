import type { PlanStatus } from '@repo/types';

const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  EXHAUSTED: 'Agotado',
};

const PLAN_STATUS_CLASSES: Record<PlanStatus, string> = {
  ACTIVE: 'bg-teal-100 text-teal-800',
  INACTIVE: 'bg-slate-100 text-slate-600',
  EXHAUSTED: 'bg-amber-50 text-amber-700',
};

interface PlanStatusBadgeProps {
  status: PlanStatus;
  className?: string;
}

export function PlanStatusBadge({ status, className = '' }: PlanStatusBadgeProps) {
  const label = PLAN_STATUS_LABELS[status] ?? status;
  const colorClasses = PLAN_STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
}
