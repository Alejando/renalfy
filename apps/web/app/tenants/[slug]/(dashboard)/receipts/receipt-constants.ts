import type { PaymentType, ReceiptStatus } from '@repo/types';

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  ACTIVE: 'Activo',
  FINISHED: 'Finalizado',
  SETTLED: 'Liquidado',
  CANCELLED: 'Cancelado',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  CASH: 'Efectivo',
  CREDIT: 'Crédito',
  BENEFIT: 'Beneficio',
  INSURANCE: 'Seguro',
  TRANSFER: 'Transferencia',
};

export const RECEIPT_STATUS_COLORS: Record<ReceiptStatus, string> = {
  ACTIVE: '#3b82f6',
  FINISHED: '#eab308',
  SETTLED: '#22c55e',
  CANCELLED: '#ef4444',
};

export const PAYMENT_TYPE_COLORS: Record<PaymentType, string> = {
  CASH: '#16a34a',
  CREDIT: '#ea580c',
  BENEFIT: '#a855f7',
  INSURANCE: '#0ea5e9',
  TRANSFER: '#6b7280',
};

/** Valid next states for each current status. Empty array means terminal state. */
export const VALID_TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]> = {
  ACTIVE: ['FINISHED', 'CANCELLED'],
  FINISHED: ['SETTLED'],
  SETTLED: [],
  CANCELLED: [],
};

export const PAYMENT_TYPES: PaymentType[] = [
  'CASH',
  'CREDIT',
  'BENEFIT',
  'INSURANCE',
  'TRANSFER',
];

export const RECEIPT_STATUSES: ReceiptStatus[] = [
  'ACTIVE',
  'FINISHED',
  'SETTLED',
  'CANCELLED',
];
