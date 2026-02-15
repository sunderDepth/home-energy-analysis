import { describe, it, expect } from 'vitest';
import {
  calculateDailyDegreeDays,
  aggregateDegreeDays,
  daysBetween,
  annualDegreeDays,
  historicalDailyAverageHDD,
} from './degree-days.ts';
import type { DailyTemp, DailyDegreeDay } from '../types/index.ts';

function makeTemp(date: string, max: number, min: number): DailyTemp {
  return { date, temp_max_f: max, temp_min_f: min };
}

function makeDD(date: string, hdd: number, cdd: number): DailyDegreeDay {
  return { date, hdd, cdd, mean_temp: 65 - hdd + cdd };
}

describe('calculateDailyDegreeDays', () => {
  it('calculates HDD/CDD with default 65°F base', () => {
    const temps = [makeTemp('2025-01-15', 40, 20)]; // mean = 30
    const result = calculateDailyDegreeDays(temps);
    expect(result).toHaveLength(1);
    expect(result[0].hdd).toBe(35); // 65 - 30
    expect(result[0].cdd).toBe(0);
    expect(result[0].mean_temp).toBe(30);
  });

  it('calculates CDD for hot days', () => {
    const temps = [makeTemp('2025-07-15', 100, 80)]; // mean = 90
    const result = calculateDailyDegreeDays(temps);
    expect(result[0].hdd).toBe(0);
    expect(result[0].cdd).toBe(25); // 90 - 65
  });

  it('returns 0 HDD and 0 CDD when temp equals base', () => {
    const temps = [makeTemp('2025-04-15', 75, 55)]; // mean = 65
    const result = calculateDailyDegreeDays(temps);
    expect(result[0].hdd).toBe(0);
    expect(result[0].cdd).toBe(0);
  });

  it('respects custom base temperatures', () => {
    const temps = [makeTemp('2025-01-15', 70, 60)]; // mean = 65
    const result = calculateDailyDegreeDays(temps, 70, 60);
    expect(result[0].hdd).toBe(5); // 70 - 65
    expect(result[0].cdd).toBe(5); // 65 - 60
  });

  it('handles empty input', () => {
    expect(calculateDailyDegreeDays([])).toEqual([]);
  });
});

describe('aggregateDegreeDays', () => {
  const daily: DailyDegreeDay[] = [
    makeDD('2025-01-01', 30, 0),
    makeDD('2025-01-02', 25, 0),
    makeDD('2025-01-03', 20, 0),
    makeDD('2025-01-04', 15, 0),
  ];

  it('sums HDD/CDD over a date range (exclusive end)', () => {
    const result = aggregateDegreeDays(daily, '2025-01-01', '2025-01-03');
    expect(result.hdd).toBe(55); // 30 + 25
    expect(result.days).toBe(2);
  });

  it('returns zeros for a range with no matching dates', () => {
    const result = aggregateDegreeDays(daily, '2025-02-01', '2025-02-05');
    expect(result.hdd).toBe(0);
    expect(result.cdd).toBe(0);
    expect(result.days).toBe(0);
  });

  it('handles single-day range', () => {
    const result = aggregateDegreeDays(daily, '2025-01-02', '2025-01-03');
    expect(result.hdd).toBe(25);
    expect(result.days).toBe(1);
  });
});

describe('daysBetween', () => {
  it('returns 0 for same day', () => {
    expect(daysBetween('2025-01-01', '2025-01-01')).toBe(0);
  });

  it('counts days correctly', () => {
    expect(daysBetween('2025-01-01', '2025-01-10')).toBe(9);
  });

  it('handles month boundaries', () => {
    expect(daysBetween('2025-01-30', '2025-02-02')).toBe(3);
  });
});

describe('annualDegreeDays', () => {
  it('returns zeros for empty data', () => {
    expect(annualDegreeDays([])).toEqual({ annual_hdd: 0, annual_cdd: 0 });
  });

  it('averages across years', () => {
    // 365 days of data with 10 HDD each = 3650 total, 1 year → 3650/year
    const daily = Array.from({ length: 365 }, (_, i) => {
      const d = new Date('2025-01-01');
      d.setDate(d.getDate() + i);
      return makeDD(d.toISOString().slice(0, 10), 10, 0);
    });
    const result = annualDegreeDays(daily);
    // 365 / 365.25 ≈ 0.9993 years, so annual ≈ 3650 / 0.9993 ≈ 3652
    expect(result.annual_hdd).toBeCloseTo(3650 / (365 / 365.25), 0);
  });
});

describe('historicalDailyAverageHDD', () => {
  it('groups by MM-DD and calculates mean/std', () => {
    const daily: DailyDegreeDay[] = [
      makeDD('2023-01-15', 30, 0),
      makeDD('2024-01-15', 40, 0),
      makeDD('2025-01-15', 35, 0),
    ];
    const result = historicalDailyAverageHDD(daily);
    expect(result.has('01-15')).toBe(true);
    const stats = result.get('01-15')!;
    expect(stats.mean).toBeCloseTo(35); // (30+40+35)/3
    expect(stats.std).toBeGreaterThan(0);
  });

  it('returns empty map for empty input', () => {
    expect(historicalDailyAverageHDD([])).toEqual(new Map());
  });
});
