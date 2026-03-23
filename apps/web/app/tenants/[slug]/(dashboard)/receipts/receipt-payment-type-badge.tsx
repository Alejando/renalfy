import type { PaymentType } from '@repo/types';
import {
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPE_COLORS,
} from './receipt-constants';

interface ReceiptPaymentTypeBadgeProps {
  paymentType: PaymentType;
  className?: string;
}

export function ReceiptPaymentTypeBadge({
  paymentType,
  className = '',
}: ReceiptPaymentTypeBadgeProps) {
  const label = PAYMENT_TYPE_LABELS[paymentType] ?? paymentType;
  const color = PAYMENT_TYPE_COLORS[paymentType] ?? '#6b7280';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}
