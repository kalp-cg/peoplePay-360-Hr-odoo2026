/**
 * Formatting utilities for PeoplePay360
 * Ensures standard DD/MM/YYYY formatting throughout the application
 */

export function formatDateDMY(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatPeriodRange(startInput, endInput) {
  if (!startInput || !endInput) return '-';
  return `${formatDateDMY(startInput)} - ${formatDateDMY(endInput)}`;
}

export function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString()}`;
}
