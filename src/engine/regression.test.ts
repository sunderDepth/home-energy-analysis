import { describe, it, expect } from 'vitest';
import {
  convertDeliveriesToIntervals,
  pairBillsWithDegreeDays,
  runRegression,
  quickEstimate,
} from './regression.ts';
import type { BillRecord, DailyDegreeDay } from '../types/index.ts';

function makeBill(overrides: Partial<BillRecord> & { id: string }): BillRecord {
  return {
    start_date: '',
    end_date: '',
    quantity: 0,
    unit: 'gallons',
    ...overrides,
  };
}

function makeDD(date: string, hdd: number, cdd: number = 0): DailyDegreeDay {
  return { date, hdd, cdd, mean_temp: 65 - hdd + cdd };
}

describe('convertDeliveriesToIntervals', () => {
  it('converts 4 deliveries into 3 intervals', () => {
    const deliveries: BillRecord[] = [
      makeBill({ id: 'a', end_date: '2025-01-15', start_date: '2025-01-15', quantity: 100, unit: 'gal' }),
      makeBill({ id: 'b', end_date: '2025-03-01', start_date: '2025-03-01', quantity: 95, unit: 'gal' }),
      makeBill({ id: 'c', end_date: '2025-04-20', start_date: '2025-04-20', quantity: 110, unit: 'gal' }),
      makeBill({ id: 'd', end_date: '2025-06-15', start_date: '2025-06-15', quantity: 80, unit: 'gal' }),
    ];
    const intervals = convertDeliveriesToIntervals(deliveries);
    expect(intervals).toHaveLength(3);

    // First interval: Jan 15 – Mar 1, quantity = 95 (second delivery's quantity)
    expect(intervals[0].start_date).toBe('2025-01-15');
    expect(intervals[0].end_date).toBe('2025-03-01');
    expect(intervals[0].quantity).toBe(95);

    // Second interval: Mar 1 – Apr 20, quantity = 110
    expect(intervals[1].start_date).toBe('2025-03-01');
    expect(intervals[1].end_date).toBe('2025-04-20');
    expect(intervals[1].quantity).toBe(110);
  });

  it('returns empty for fewer than 2 deliveries', () => {
    const single = [makeBill({ id: 'a', end_date: '2025-01-15', quantity: 100, unit: 'gal' })];
    expect(convertDeliveriesToIntervals(single)).toEqual([]);
  });

  it('returns empty when all quantities are 0', () => {
    const deliveries = [
      makeBill({ id: 'a', end_date: '2025-01-15', quantity: 0, unit: 'gal' }),
      makeBill({ id: 'b', end_date: '2025-03-01', quantity: 0, unit: 'gal' }),
    ];
    expect(convertDeliveriesToIntervals(deliveries)).toEqual([]);
  });

  it('sorts deliveries chronologically regardless of input order', () => {
    const deliveries = [
      makeBill({ id: 'c', end_date: '2025-04-20', start_date: '2025-04-20', quantity: 110, unit: 'gal' }),
      makeBill({ id: 'a', end_date: '2025-01-15', start_date: '2025-01-15', quantity: 100, unit: 'gal' }),
      makeBill({ id: 'b', end_date: '2025-03-01', start_date: '2025-03-01', quantity: 95, unit: 'gal' }),
    ];
    const intervals = convertDeliveriesToIntervals(deliveries);
    expect(intervals).toHaveLength(2);
    expect(intervals[0].start_date).toBe('2025-01-15');
    expect(intervals[0].end_date).toBe('2025-03-01');
  });
});

describe('pairBillsWithDegreeDays', () => {
  const daily: DailyDegreeDay[] = [];
  // Generate 90 days of data: Jan 1 – Mar 31
  for (let i = 0; i < 90; i++) {
    const d = new Date('2025-01-01');
    d.setDate(d.getDate() + i);
    daily.push(makeDD(d.toISOString().slice(0, 10), 20, 0));
  }

  it('pairs bills with correct HDD totals', () => {
    const bills = [
      makeBill({ id: 'a', start_date: '2025-01-01', end_date: '2025-02-01', quantity: 50 }),
    ];
    const result = pairBillsWithDegreeDays(bills, daily);
    expect(result).toHaveLength(1);
    expect(result[0].hdd).toBe(31 * 20); // 31 days × 20 HDD each
    expect(result[0].days).toBe(31);
    expect(result[0].energy).toBe(50);
  });

  it('filters out bills with 0-day spans', () => {
    const bills = [
      makeBill({ id: 'a', start_date: '2025-01-15', end_date: '2025-01-15', quantity: 50 }),
    ];
    const result = pairBillsWithDegreeDays(bills, daily);
    expect(result).toHaveLength(0);
  });

  it('filters out bills with 0 quantity', () => {
    const bills = [
      makeBill({ id: 'a', start_date: '2025-01-01', end_date: '2025-02-01', quantity: 0 }),
    ];
    const result = pairBillsWithDegreeDays(bills, daily);
    expect(result).toHaveLength(0);
  });
});

describe('runRegression', () => {
  // Build synthetic data: energy = 2 * days + 0.5 * HDD
  // Use varying HDD to get a solvable system
  const daily: DailyDegreeDay[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date('2025-01-01');
    d.setDate(d.getDate() + i);
    const month = d.getMonth();
    // Winter months (Nov–Mar) have HDD, summer has 0
    const hdd = (month >= 10 || month <= 2) ? 25 : 0;
    daily.push(makeDD(d.toISOString().slice(0, 10), hdd, 0));
  }

  function makeSyntheticBills(): BillRecord[] {
    const bills: BillRecord[] = [];
    // Create monthly bills
    for (let m = 0; m < 12; m++) {
      const start = new Date(2025, m, 1);
      const end = new Date(2025, m + 1, 1);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86400000);

      // Calculate expected energy: 2 * days + 0.5 * HDD
      let hddTotal = 0;
      for (const dd of daily) {
        if (dd.date >= startStr && dd.date < endStr) hddTotal += dd.hdd;
      }
      const energy = 2 * daysInMonth + 0.5 * hddTotal;

      bills.push(makeBill({
        id: `m${m}`,
        start_date: startStr,
        end_date: endStr,
        quantity: energy,
      }));
    }
    return bills;
  }

  it('produces a regression result for heating-only', () => {
    const bills = makeSyntheticBills();
    const result = runRegression(bills, daily, 'heating');
    expect(result).not.toBeNull();
    expect(result!.beta0).toBeCloseTo(2, 0); // daily base ≈ 2
    expect(result!.beta1).toBeCloseTo(0.5, 0); // heating sensitivity ≈ 0.5
    expect(result!.r_squared).toBeGreaterThan(0.9);
  });

  it('returns null with fewer than 3 bills', () => {
    const bills = [
      makeBill({ id: 'a', start_date: '2025-01-01', end_date: '2025-02-01', quantity: 50 }),
      makeBill({ id: 'b', start_date: '2025-02-01', end_date: '2025-03-01', quantity: 40 }),
    ];
    expect(runRegression(bills, daily, 'heating')).toBeNull();
  });

  it('returns null when daily data is empty', () => {
    const bills = makeSyntheticBills();
    expect(runRegression(bills, [], 'heating')).toBeNull();
  });

  it('computes annual totals', () => {
    const bills = makeSyntheticBills();
    const result = runRegression(bills, daily, 'heating')!;
    expect(result.annual_base_load).toBeGreaterThan(0);
    expect(result.annual_heating_load).toBeGreaterThan(0);
    expect(result.annual_total).toBeCloseTo(result.annual_base_load + result.annual_heating_load);
  });
});

describe('quickEstimate', () => {
  it('uses 20% base for heating-only', () => {
    const result = quickEstimate(1000, 5000, 500, 'heating');
    expect(result.base_load).toBe(200);
    expect(result.climate_load).toBe(800);
  });

  it('uses 30% base for dual purpose', () => {
    const result = quickEstimate(1000, 5000, 500, 'both');
    expect(result.base_load).toBe(300);
    expect(result.climate_load).toBe(700);
  });

  it('uses 30% base for "all" purpose', () => {
    const result = quickEstimate(1000, 5000, 500, 'all');
    expect(result.base_load).toBe(300);
    expect(result.climate_load).toBe(700);
  });
});
