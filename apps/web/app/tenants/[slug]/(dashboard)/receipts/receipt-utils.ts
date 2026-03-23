import type { ReceiptStatus } from '@repo/types';

/**
 * Formats a date as a locale string in es-MX.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a monetary amount as MXN currency.
 */
export function formatAmount(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
}

/**
 * Returns true when the receipt status is terminal (no further transitions allowed).
 */
export function isTerminalStatus(status: ReceiptStatus): boolean {
  return status === 'SETTLED' || status === 'CANCELLED';
}
