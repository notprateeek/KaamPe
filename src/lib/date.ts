/**
 * Today's date as YYYY-MM-DD in the device's local timezone.
 * Never use `new Date().toISOString()` for this: it is UTC, so in IST it
 * returns yesterday's date until 05:30 in the morning.
 */
export function todayLocalISODate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
