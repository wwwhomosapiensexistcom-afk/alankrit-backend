export function rupeesToPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

export function paiseToRupees(amountInPaise: number): number {
  return amountInPaise / 100;
}

export function generateOrderNumber(date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD-${yyyy}${mm}${dd}-${random}`;
}

/**
 * Convert a Date (stored in UTC) to an ISO string representing Indian Standard Time.
 * This does not add an explicit +05:30 offset, but shifts the time so the value
 * corresponds to IST when interpreted as UTC.
 */
export function toISTISOString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);
  return istDate.toISOString();
}
