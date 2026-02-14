import type { DailyTemp, DailyDegreeDay, AggregatedDegreeDays } from '../types/index.ts';

/**
 * Calculate daily HDD and CDD from daily temperature data.
 */
export function calculateDailyDegreeDays(
  temps: DailyTemp[],
  heatingBaseTemp: number = 65,
  coolingBaseTemp: number = 65,
): DailyDegreeDay[] {
  return temps.map(t => {
    const meanTemp = (t.temp_max_f + t.temp_min_f) / 2;
    return {
      date: t.date,
      hdd: Math.max(0, heatingBaseTemp - meanTemp),
      cdd: Math.max(0, meanTemp - coolingBaseTemp),
      mean_temp: meanTemp,
    };
  });
}

/**
 * Aggregate HDD/CDD over a date range [startDate, endDate).
 * Dates are ISO strings (YYYY-MM-DD).
 */
export function aggregateDegreeDays(
  daily: DailyDegreeDay[],
  startDate: string,
  endDate: string,
): AggregatedDegreeDays {
  let hdd = 0;
  let cdd = 0;
  let days = 0;

  for (const d of daily) {
    if (d.date >= startDate && d.date < endDate) {
      hdd += d.hdd;
      cdd += d.cdd;
      days++;
    }
  }

  return { hdd, cdd, days };
}

/**
 * Calculate the number of days between two ISO date strings.
 */
export function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Get annual HDD/CDD totals from daily data.
 */
export function annualDegreeDays(daily: DailyDegreeDay[]): { annual_hdd: number; annual_cdd: number } {
  if (daily.length === 0) return { annual_hdd: 0, annual_cdd: 0 };

  let totalHdd = 0;
  let totalCdd = 0;
  for (const d of daily) {
    totalHdd += d.hdd;
    totalCdd += d.cdd;
  }

  const years = daily.length / 365.25;
  return {
    annual_hdd: totalHdd / years,
    annual_cdd: totalCdd / years,
  };
}

/**
 * Get historical average HDD for each day-of-year (1-366).
 * Used for delivery forecast beyond the 16-day weather forecast.
 */
export function historicalDailyAverageHDD(
  daily: DailyDegreeDay[],
): Map<string, { mean: number; std: number }> {
  // Group by month-day (MM-DD)
  const groups = new Map<string, number[]>();
  for (const d of daily) {
    const mmdd = d.date.slice(5); // "MM-DD"
    const arr = groups.get(mmdd) ?? [];
    arr.push(d.hdd);
    groups.set(mmdd, arr);
  }

  const result = new Map<string, { mean: number; std: number }>();
  for (const [mmdd, values] of groups) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
    result.set(mmdd, { mean: avg, std: Math.sqrt(variance) });
  }

  return result;
}
