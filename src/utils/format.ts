/**
 * Format a number as US currency.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with comma separators.
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a price per unit (e.g., "$3.95/gallon")
 */
export function formatPrice(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted}/${unit}`;
}

/**
 * Format a date string (ISO) to a readable format.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format R² as a quality label.
 */
export function rSquaredLabel(r2: number): { text: string; color: string } {
  if (r2 >= 0.85) return { text: 'Good fit', color: 'text-primary-600' };
  if (r2 >= 0.65) return { text: 'Fair fit', color: 'text-accent-600' };
  return { text: 'Poor fit', color: 'text-danger-600' };
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
