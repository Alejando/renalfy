import type { PurchaseOrderStatus } from '@repo/types';

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus;
}

const STATUS_CONFIG: Record<
  PurchaseOrderStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Borrador',
    className: 'bg-gray-100 text-gray-700 border border-gray-300',
  },
  SENT: {
    label: 'Enviada',
    className: 'bg-amber-100 text-amber-800',
  },
  CONFIRMED: {
    label: 'Confirmada',
    className: 'bg-teal-100 text-teal-800',
  },
  RECEIVED: {
    label: 'Recibida',
    className: 'bg-green-100 text-green-800',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800',
  },
};

export function PurchaseOrderStatusBadge({ status }: PurchaseOrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}