/**
 * Shared formatting helpers so every page renders money, dates and counts the same way.
 *
 * Amount convention in this app: expenses are stored as positive numbers,
 * income as negative numbers. Use `signedFromStored` to flip that into a
 * human-facing sign (income up, expenses down).
 */

const CURRENCY = 'USD';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyWholeFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** "$1,234.56" — always two decimals. */
export function formatMoney(value: number, opts?: { cents?: boolean }): string {
  const safe = Number.isFinite(value) ? value : 0;
  return opts?.cents === false ? moneyWholeFormatter.format(safe) : moneyFormatter.format(safe);
}

/** "+$1,234.56" / "−$1,234.56" — explicit sign, uses a real minus glyph. */
export function formatSignedMoney(value: number, opts?: { cents?: boolean }): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = formatMoney(Math.abs(safe), opts);
  if (safe > 0) return `+${abs}`;
  if (safe < 0) return `−${abs}`;
  return abs;
}

/** "$1.2K" / "$3.4M" for axis ticks and dense tiles. */
export function formatCompactMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (Math.abs(safe) < 1000) return moneyWholeFormatter.format(safe);
  return compactFormatter.format(safe);
}

/** Flip the stored sign (expenses +, income −) into a display sign (income +, expenses −). */
export function signedFromStored(storedAmount: number): number {
  return -storedAmount;
}

export function isExpense(storedAmount: number): boolean {
  return storedAmount > 0;
}

/** Parse a `YYYY-MM-DD` string as a local date (avoids the UTC off-by-one). */
export function parseDateOnly(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

/** "Sep 28, 2026" */
export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof value === 'string' ? parseDateOnly(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Sep 28" */
export function formatShortDate(value: string | Date): string {
  return formatDate(value, { month: 'short', day: 'numeric' });
}

/** "Sep 28, 2026, 3:42 PM" */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "3 days ago", "just now", "in 2 hours" */
export function formatRelative(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return 'just now';
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), 'day');
  return formatDate(d);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** Pluralize with a count: plural(3, 'transaction') → "3 transactions" */
export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${formatCount(count)} ${word}`;
}

/** Sentence-case a snake_case / lowercase token: "reverse_failed" → "Reverse failed" */
export function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Two-letter initials from an email or name. */
export function initials(value: string | null | undefined): string {
  if (!value) return 'U';
  const base = value.includes('@') ? value.split('@')[0] : value;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}
