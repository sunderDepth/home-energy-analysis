import type { BillRecord, BillWithDegreeDays, DailyDegreeDay, FuelPurpose, RegressionResult } from '../types/index.ts';
import { aggregateDegreeDays, annualDegreeDays } from './degree-days.ts';
import { dotProduct, solve2x2, solve3x3, rSquared } from './stats.ts';

/**
 * Convert delivery records into billing intervals.
 * Each consecutive pair of deliveries becomes one interval where:
 *   - start_date = previous delivery date
 *   - end_date = current delivery date
 *   - quantity = current delivery quantity (fuel consumed since previous delivery)
 * The first delivery has no prior reference and is dropped.
 */
export function convertDeliveriesToIntervals(deliveries: BillRecord[]): BillRecord[] {
  // Sort chronologically by delivery date
  const sorted = [...deliveries]
    .filter(d => (d.end_date || d.start_date) && d.quantity > 0)
    .sort((a, b) => {
      const dateA = a.end_date || a.start_date;
      const dateB = b.end_date || b.start_date;
      return dateA.localeCompare(dateB);
    });

  if (sorted.length < 2) return [];

  const intervals: BillRecord[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    intervals.push({
      id: curr.id,
      start_date: prev.end_date || prev.start_date,
      end_date: curr.end_date || curr.start_date,
      quantity: curr.quantity,
      unit: curr.unit,
      cost: curr.cost,
      price_per_unit: curr.price_per_unit,
    });
  }

  return intervals;
}

/**
 * Pair each bill with its degree-day totals from the daily data.
 */
export function pairBillsWithDegreeDays(
  bills: BillRecord[],
  daily: DailyDegreeDay[],
): BillWithDegreeDays[] {
  return bills
    .filter(b => b.start_date && b.end_date && b.quantity > 0)
    .map(bill => {
      const agg = aggregateDegreeDays(daily, bill.start_date, bill.end_date);
      return {
        bill,
        hdd: agg.hdd,
        cdd: agg.cdd,
        days: agg.days || Math.round(
          (new Date(bill.end_date).getTime() - new Date(bill.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
        ),
        energy: bill.quantity,
      };
    })
    .filter(b => b.days > 0);
}

/**
 * Run OLS regression on bill data against degree days.
 *
 * Model depends on purpose:
 *   heating:  energy = β₀ × days + β₁ × HDD
 *   cooling:  energy = β₀ × days + β₂ × CDD
 *   both/all: energy = β₀ × days + β₁ × HDD + β₂ × CDD
 */
export function runRegression(
  bills: BillRecord[],
  daily: DailyDegreeDay[],
  purpose: FuelPurpose,
): RegressionResult | null {
  const observations = pairBillsWithDegreeDays(bills, daily);

  if (observations.length < 3) return null;

  const y = observations.map(o => o.energy);
  const { annual_hdd, annual_cdd } = annualDegreeDays(daily);

  if (purpose === 'heating' || purpose === 'cooling') {
    // 2-variable regression: energy = β₀ × days + β₁ × dd
    const x0 = observations.map(o => o.days);
    const x1 = observations.map(o => purpose === 'heating' ? o.hdd : o.cdd);

    // Normal equations: X^T X β = X^T y
    const a00 = dotProduct(x0, x0);
    const a01 = dotProduct(x0, x1);
    const a10 = a01;
    const a11 = dotProduct(x1, x1);
    const b0 = dotProduct(x0, y);
    const b1 = dotProduct(x1, y);

    const solution = solve2x2(a00, a01, a10, a11, b0, b1);
    if (!solution) return null;

    let [beta0, beta1] = solution;

    // Clamp base load to non-negative
    if (beta0 < 0) beta0 = 0;

    const fitted = observations.map((_o, i) => beta0 * x0[i] + beta1 * x1[i]);
    const residuals = y.map((v, i) => v - fitted[i]);
    const r2 = rSquared(y, fitted);

    const annualBase = beta0 * 365;
    const annualClimate = purpose === 'heating'
      ? beta1 * annual_hdd
      : beta1 * annual_cdd;

    return {
      beta0,
      beta1,
      beta2: null,
      r_squared: r2,
      residuals,
      fitted_values: fitted,
      observations,
      annual_base_load: annualBase,
      annual_heating_load: purpose === 'heating' ? annualClimate : 0,
      annual_cooling_load: purpose === 'cooling' ? annualClimate : 0,
      annual_total: annualBase + annualClimate,
    };
  }

  // 3-variable: energy = β₀ × days + β₁ × HDD + β₂ × CDD
  const x0 = observations.map(o => o.days);
  const x1 = observations.map(o => o.hdd);
  const x2 = observations.map(o => o.cdd);

  const a = [
    [dotProduct(x0, x0), dotProduct(x0, x1), dotProduct(x0, x2)],
    [dotProduct(x1, x0), dotProduct(x1, x1), dotProduct(x1, x2)],
    [dotProduct(x2, x0), dotProduct(x2, x1), dotProduct(x2, x2)],
  ];
  const b = [dotProduct(x0, y), dotProduct(x1, y), dotProduct(x2, y)];

  const solution = solve3x3(a, b);
  if (!solution) return null;

  let [beta0, beta1, beta2] = solution;
  if (beta0 < 0) beta0 = 0;

  const fitted = observations.map((_o, i) =>
    beta0 * x0[i] + beta1 * x1[i] + beta2 * x2[i]
  );
  const residuals = y.map((v, i) => v - fitted[i]);
  const r2 = rSquared(y, fitted);

  return {
    beta0,
    beta1,
    beta2,
    r_squared: r2,
    residuals,
    fitted_values: fitted,
    observations,
    annual_base_load: beta0 * 365,
    annual_heating_load: beta1 * annual_hdd,
    annual_cooling_load: beta2 * annual_cdd,
    annual_total: beta0 * 365 + beta1 * annual_hdd + beta2 * annual_cdd,
  };
}

/**
 * Quick estimate: given annual quantity or cost and fuel reference data,
 * produce a rough regression-like result using annual degree days.
 */
export function quickEstimate(
  annualQuantity: number,
  _annualHdd: number,
  _annualCdd: number,
  purpose: FuelPurpose,
): { base_load: number; climate_load: number } {
  // Assume 20% base load for heating-only fuels, 30% for dual
  const baseFraction = purpose === 'both' || purpose === 'all' ? 0.30 : 0.20;
  return {
    base_load: annualQuantity * baseFraction,
    climate_load: annualQuantity * (1 - baseFraction),
  };
}
