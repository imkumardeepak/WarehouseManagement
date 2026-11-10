import { format, parseISO, isValid } from "date-fns";

/** Format a number as Indian Rupees. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Format a number using the Indian numbering system. */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Compact number formatting (e.g. 1.2K, 3.4L). */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return formatNumber(value);
}

/** Format an ISO date string into Indian date format dd MMM yyyy. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return isValid(d) ? format(d, "dd MMM yyyy") : "—";
}

/** Format date with time. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return isValid(d) ? format(d, "dd MMM yyyy, hh:mm a") : "—";
}

/** Format for <input type="date"> value. */
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

/** Today as ISO string. */
export function todayISO(): string {
  return new Date().toISOString();
}

/** Days until a date (negative if past). */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  const diff = d.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
