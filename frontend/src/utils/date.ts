/**
 * Parse a UTC datetime string from the API into a local Date.
 * The backend returns ISO strings without timezone suffix (e.g. "2026-03-05T20:36:55.579351").
 * Without the Z, JS treats these as local time. Appending Z ensures correct UTC→local conversion.
 */
export function utcToLocal(iso: string): Date {
  return new Date(iso.endsWith("Z") ? iso : iso + "Z");
}

export function formatDateTime(iso: string): string {
  return utcToLocal(iso).toLocaleString();
}

export function formatDate(iso: string): string {
  return utcToLocal(iso).toLocaleDateString();
}
