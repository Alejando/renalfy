import type { ReceiptStatus } from '@repo/types';
import {
  RECEIPT_STATUS_LABELS,
  RECEIPT_STATUS_COLORS,
} from './receipt-constants';

interface ReceiptStatusBadgeProps {
  status: ReceiptStatus;
  className?: string;
}

export function ReceiptStatusBadge({ status, className = '' }: ReceiptStatusBadgeProps) {
  const label = RECEIPT_STATUS_LABELS[status] ?? status;
  const color = RECEIPT_STATUS_COLORS[status] ?? '#6b7280';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}
