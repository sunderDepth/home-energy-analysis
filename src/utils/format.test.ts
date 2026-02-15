import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPrice, formatDate, rSquaredLabel } from './format.ts';

describe('formatCurrency', () => {
  it('formats a positive number as USD', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('rounds to whole dollars', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('handles large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000');
  });
});

describe('formatNumber', () => {
  it('formats with default 0 decimals', () => {
    expect(formatNumber(1234.5)).toBe('1,235');
  });

  it('formats with specified decimals', () => {
    expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatPrice', () => {
  it('formats price with unit', () => {
    expect(formatPrice(3.95, 'gallon')).toBe('$3.95/gallon');
  });

  it('pads to 2 decimal places', () => {
    expect(formatPrice(3, 'therm')).toBe('$3.00/therm');
  });
});

describe('formatDate', () => {
  it('converts ISO date to readable format', () => {
    const result = formatDate('2025-02-14');
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/2025/);
  });
});

describe('rSquaredLabel', () => {
  it('returns Good fit for r² >= 0.85', () => {
    expect(rSquaredLabel(0.90).text).toBe('Good fit');
    expect(rSquaredLabel(0.85).text).toBe('Good fit');
  });

  it('returns Fair fit for 0.65 <= r² < 0.85', () => {
    expect(rSquaredLabel(0.75).text).toBe('Fair fit');
    expect(rSquaredLabel(0.65).text).toBe('Fair fit');
  });

  it('returns Poor fit for r² < 0.65', () => {
    expect(rSquaredLabel(0.50).text).toBe('Poor fit');
    expect(rSquaredLabel(0).text).toBe('Poor fit');
  });
});
