/**
 * Centralized date utilities to avoid timezone issues
 * and inconsistent date handling across the application.
 */

/** Parse a YYYY-MM-DD string into a local Date (no timezone shift) */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/** Format a Date to YYYY-MM-DD string */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get today as YYYY-MM-DD */
export function todayString(): string {
  return toDateString(new Date());
}

/** Format date for display: "01/03" or "01/03/2026" */
export function formatDateBR(dateStr: string, includeYear = false): string {
  const date = parseLocalDate(dateStr);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
  if (includeYear) options.year = 'numeric';
  return date.toLocaleDateString('pt-BR', options);
}

/** Format date with weekday: "seg., 01/03" */
export function formatDateWithWeekday(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

/** Get month label: "Março 2026" */
export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Get short month label: "Mar" */
export function getShortMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
}

/** Days in a given month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Check if a date string falls in a given year/month */
export function isInMonth(dateStr: string, year: number, month: number): boolean {
  const date = parseLocalDate(dateStr);
  return date.getFullYear() === year && date.getMonth() === month;
}

/** Get the number of months between two dates */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** Add months to a date */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
