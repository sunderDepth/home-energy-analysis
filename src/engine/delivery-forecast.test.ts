import { describe, it, expect } from 'vitest';
import { projectDelivery, reconstructTankHistory } from './delivery-forecast.ts';
import type { DailyDegreeDay, DailyTemp } from '../types/index.ts';

function makeDD(date: string, hdd: number): DailyDegreeDay {
  return { date, hdd, cdd: 0, mean_temp: 65 - hdd };
}

function makeTemp(date: string, max: number, min: number): DailyTemp {
  return { date, temp_max_f: max, temp_min_f: min };
}

describe('projectDelivery', () => {
  // 1 year of historical data with constant 20 HDD/day
  const historicalDaily: DailyDegreeDay[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date('2024-01-01');
    d.setDate(d.getDate() + i);
    historicalDaily.push(makeDD(d.toISOString().slice(0, 10), 20));
  }

  // 16-day forecast with 15 HDD/day
  const forecastTemps: DailyTemp[] = [];
  const today = new Date();
  for (let i = 0; i < 16; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    forecastTemps.push(makeTemp(d.toISOString().slice(0, 10), 50, 40)); // mean=45, HDD=20
  }

  it('produces points that decrease over time', () => {
    const result = projectDelivery(
      200, // current level
      275, // tank capacity
      50,  // threshold
      1,   // beta0: 1 gal/day base
      0.1, // beta1: 0.1 gal/HDD
      historicalDaily,
      forecastTemps,
      65,
      60,  // max 60 days
    );
    expect(result.points.length).toBeGreaterThan(0);
    // Level should decrease
    expect(result.points[result.points.length - 1].level).toBeLessThan(200);
  });

  it('estimates a delivery date when level drops below threshold', () => {
    const result = projectDelivery(
      100, // low starting level
      275,
      50,
      2,   // high consumption
      0.1,
      historicalDaily,
      forecastTemps,
      65,
      120,
    );
    expect(result.estimated_delivery_date).not.toBeNull();
    expect(result.days_until_delivery).not.toBeNull();
    expect(result.days_until_delivery!).toBeGreaterThan(0);
  });

  it('returns null delivery date when tank has plenty of fuel', () => {
    const result = projectDelivery(
      275, // full tank
      275,
      50,
      0.1, // very low consumption
      0.01,
      historicalDaily,
      forecastTemps,
      65,
      30,  // only project 30 days
    );
    // With such low consumption and full tank, shouldn't hit threshold in 30 days
    // 0.1 + 0.01*20 = 0.3 gal/day * 30 = 9 gal consumed. 275-9 = 266 >> 50
    expect(result.estimated_delivery_date).toBeNull();
  });

  it('all points are marked as projected', () => {
    const result = projectDelivery(200, 275, 50, 1, 0.1, historicalDaily, forecastTemps);
    for (const p of result.points) {
      expect(p.is_projected).toBe(true);
    }
  });
});

describe('reconstructTankHistory', () => {
  const daily: DailyDegreeDay[] = [];
  for (let i = 0; i < 120; i++) {
    const d = new Date('2025-01-01');
    d.setDate(d.getDate() + i);
    daily.push(makeDD(d.toISOString().slice(0, 10), 20));
  }

  it('returns empty for fewer than 2 deliveries', () => {
    const result = reconstructTankHistory(
      [{ date: '2025-01-15', quantity: 100 }],
      275, 1, 0.1, daily,
    );
    expect(result).toEqual([]);
  });

  it('returns points for 2+ deliveries', () => {
    const result = reconstructTankHistory(
      [
        { date: '2025-01-15', quantity: 150 },
        { date: '2025-03-01', quantity: 130 },
      ],
      275, 1, 0.1, daily,
    );
    expect(result.length).toBeGreaterThan(2);
    // First point should be at first delivery date
    expect(result[0].date).toBe('2025-01-15');
    expect(result[0].is_projected).toBe(false);
  });

  it('level never goes below 0', () => {
    const result = reconstructTankHistory(
      [
        { date: '2025-01-15', quantity: 150 },
        { date: '2025-03-15', quantity: 200 },
      ],
      275, 1, 0.1, daily,
    );
    for (const p of result) {
      expect(p.level).toBeGreaterThanOrEqual(0);
    }
  });
});
