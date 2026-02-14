import type { TankLevelPoint, DeliveryForecastResult, DailyDegreeDay, DailyTemp } from '../types/index.ts';
import { calculateDailyDegreeDays, historicalDailyAverageHDD } from './degree-days.ts';

/**
 * Project tank level going forward to determine when a delivery is needed.
 *
 * @param currentLevel - Current tank level in native units (e.g., gallons)
 * @param tankCapacity - Full tank capacity
 * @param threshold - Level at which to schedule delivery (default 25% of capacity)
 * @param beta0 - Daily base consumption rate (from regression)
 * @param beta1 - Heating sensitivity (consumption per HDD)
 * @param historicalDaily - Historical daily degree day data (for averages beyond forecast)
 * @param forecastTemps - 16-day weather forecast temps
 * @param heatingBaseTemp - Base temperature for HDD calculation
 * @param maxDays - Maximum days to project forward
 */
export function projectDelivery(
  currentLevel: number,
  tankCapacity: number,
  threshold: number | undefined,
  beta0: number,
  beta1: number,
  historicalDaily: DailyDegreeDay[],
  forecastTemps: DailyTemp[],
  heatingBaseTemp: number = 65,
  maxDays: number = 120,
): DeliveryForecastResult {
  const deliveryThreshold = threshold ?? tankCapacity * 0.25;
  const histAvg = historicalDailyAverageHDD(historicalDaily);

  // Calculate forecast degree days
  const forecastDD = calculateDailyDegreeDays(forecastTemps, heatingBaseTemp);
  const forecastMap = new Map<string, number>();
  for (const d of forecastDD) {
    forecastMap.set(d.date, d.hdd);
  }

  const points: TankLevelPoint[] = [];
  let level = currentLevel;
  let estimatedDeliveryDate: string | null = null;
  let daysUntilDelivery: number | null = null;

  const today = new Date();

  for (let i = 0; i < maxDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const mmdd = dateStr.slice(5);

    let expectedHDD: number;
    let hddStd = 0;

    // Use forecast for first 16 days, historical averages after
    if (forecastMap.has(dateStr)) {
      expectedHDD = forecastMap.get(dateStr)!;
    } else {
      const hist = histAvg.get(mmdd);
      expectedHDD = hist?.mean ?? 0;
      hddStd = hist?.std ?? 0;
    }

    const dailyConsumption = Math.max(0, beta0 + beta1 * expectedHDD);
    level -= dailyConsumption;

    // Calculate uncertainty band (only meaningful beyond forecast)
    let levelLow: number | undefined;
    let levelHigh: number | undefined;
    if (hddStd > 0) {
      const consumptionHigh = Math.max(0, beta0 + beta1 * (expectedHDD + hddStd));
      const consumptionLow = Math.max(0, beta0 + beta1 * Math.max(0, expectedHDD - hddStd));
      // Accumulate uncertainty
      const daysBeyondForecast = i - forecastDD.length;
      if (daysBeyondForecast > 0) {
        const uncertaintyFactor = Math.sqrt(daysBeyondForecast);
        levelLow = level - (consumptionHigh - dailyConsumption) * uncertaintyFactor;
        levelHigh = level + (dailyConsumption - consumptionLow) * uncertaintyFactor;
      }
    }

    points.push({
      date: dateStr,
      level: Math.max(0, level),
      level_low: levelLow !== undefined ? Math.max(0, levelLow) : undefined,
      level_high: levelHigh !== undefined ? Math.min(tankCapacity, levelHigh) : undefined,
      is_projected: true,
    });

    if (level <= deliveryThreshold && !estimatedDeliveryDate) {
      estimatedDeliveryDate = dateStr;
      daysUntilDelivery = i;
    }

    if (level <= 0) break;
  }

  return {
    points,
    estimated_delivery_date: estimatedDeliveryDate,
    days_until_delivery: daysUntilDelivery,
  };
}

/**
 * Reconstruct historical tank levels from delivery records.
 * Works backward from the most recent known state.
 */
export function reconstructTankHistory(
  deliveries: Array<{ date: string; quantity: number }>,
  tankCapacity: number,
  beta0: number,
  beta1: number,
  daily: DailyDegreeDay[],
): TankLevelPoint[] {
  if (deliveries.length < 2) return [];

  const sorted = [...deliveries].sort((a, b) => a.date.localeCompare(b.date));
  const points: TankLevelPoint[] = [];
  const dailyMap = new Map<string, number>();
  for (const d of daily) {
    dailyMap.set(d.date, d.hdd);
  }

  let level = tankCapacity; // Assume full after first delivery

  for (let i = 0; i < sorted.length; i++) {
    // After delivery, tank fills
    level = Math.min(tankCapacity, level + sorted[i].quantity);
    points.push({
      date: sorted[i].date,
      level,
      is_projected: false,
    });

    // Draw down until next delivery
    if (i < sorted.length - 1) {
      const nextDate = sorted[i + 1].date;
      const current = new Date(sorted[i].date);
      const end = new Date(nextDate);

      while (current < end) {
        current.setDate(current.getDate() + 1);
        const dateStr = current.toISOString().slice(0, 10);
        const hdd = dailyMap.get(dateStr) ?? 0;
        const consumption = Math.max(0, beta0 + beta1 * hdd);
        level = Math.max(0, level - consumption);

        if (current < end) {
          points.push({
            date: dateStr,
            level,
            is_projected: false,
          });
        }
      }
    }
  }

  return points;
}
