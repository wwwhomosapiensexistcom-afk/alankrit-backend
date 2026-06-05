export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
