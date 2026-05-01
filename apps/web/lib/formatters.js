/**
 * Format a number as currency (MXN)
 * @param {number} value - The value to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date string
 * @param {string | Date} dateString - The date to format
 * @returns {string} - Formatted date string (DD/MM/YYYY)
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
