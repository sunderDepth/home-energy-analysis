import { useMemo, useCallback } from 'react';
import { useAppState, useAppDispatch } from './app-context.tsx';
import { calculateDailyDegreeDays, annualDegreeDays } from '../engine/degree-days.ts';
import { runRegression, convertDeliveriesToIntervals } from '../engine/regression.ts';
import { compareFuelCosts } from '../engine/fuel-comparison.ts';
import { getFuelByKey } from '../types/fuel-reference.ts';
import { fetchHistoricalWeather, fetchForecast, getHistoricalDateRange } from '../api/open-meteo.ts';
import { resolveZipCode } from '../api/geocoding.ts';
import { simpleHash } from '../utils/hash.ts';
import type { DailyDegreeDay, FuelSource, RegressionResult, FuelComparisonEntry } from '../types/index.ts';

/**
 * Hook to get daily degree days from weather data.
 */
export function useDegreeDays(): DailyDegreeDay[] {
  const { weatherData, degreeDayConfig } = useAppState();

  return useMemo(() => {
    if (!weatherData) return [];
    return calculateDailyDegreeDays(
      weatherData.daily_temps,
      degreeDayConfig.heating_base_temp_f,
      degreeDayConfig.cooling_base_temp_f,
    );
  }, [weatherData, degreeDayConfig.heating_base_temp_f, degreeDayConfig.cooling_base_temp_f]);
}

/**
 * Hook to get annual HDD/CDD totals.
 */
export function useAnnualDegreeDays() {
  const daily = useDegreeDays();
  return useMemo(() => annualDegreeDays(daily), [daily]);
}

/**
 * Hook to run regression for a specific fuel source.
 */
export function useRegression(fuelSource: FuelSource | null): RegressionResult | null {
  const daily = useDegreeDays();

  return useMemo(() => {
    if (!fuelSource || fuelSource.bills.length < 2 || daily.length === 0) return null;
    // For delivery fuels, convert consecutive deliveries into billing intervals
    const bills = fuelSource.input_mode === 'delivery'
      ? convertDeliveriesToIntervals(fuelSource.bills)
      : fuelSource.bills;
    if (bills.length < 3) return null;
    return runRegression(bills, daily, fuelSource.purpose);
  }, [fuelSource, daily]);
}

/**
 * Hook to get regression results for all fuel sources.
 */
export function useAllRegressions(): Map<string, RegressionResult> {
  const { fuelSources } = useAppState();
  const daily = useDegreeDays();

  return useMemo(() => {
    const results = new Map<string, RegressionResult>();
    if (daily.length === 0) return results;

    for (const fs of fuelSources) {
      // For delivery fuels, convert consecutive deliveries into billing intervals
      const bills = fs.input_mode === 'delivery'
        ? convertDeliveriesToIntervals(fs.bills)
        : fs.bills;
      if (bills.length >= 3) {
        const result = runRegression(bills, daily, fs.purpose);
        if (result) results.set(fs.id, result);
      }
    }
    return results;
  }, [fuelSources, daily]);
}

/**
 * Hook to get fuel cost comparison data.
 */
export function useFuelComparison(): FuelComparisonEntry[] {
  const { fuelSources, fuelPriceOverrides } = useAppState();
  const regressions = useAllRegressions();

  return useMemo(() => {
    // Calculate total annual heat demand in BTU across all fuel sources
    let totalHeatDemandBtu = 0;
    let currentFuelKey: string | null = null;

    for (const fs of fuelSources) {
      const regression = regressions.get(fs.id);
      if (!regression) continue;

      const fuelRef = getFuelByKey(fs.fuel_type);
      if (!fuelRef) continue;

      const heatingLoad = regression.annual_heating_load;
      if (heatingLoad > 0) {
        const efficiency = fs.system_efficiency ?? fuelRef.typical_system_efficiency;
        totalHeatDemandBtu += heatingLoad * fuelRef.btu_per_unit * efficiency;
      }

      if (!currentFuelKey) currentFuelKey = fs.fuel_type;
    }

    if (totalHeatDemandBtu === 0) return [];

    return compareFuelCosts(
      totalHeatDemandBtu,
      currentFuelKey as typeof fuelSources[0]['fuel_type'],
      fuelPriceOverrides,
    );
  }, [fuelSources, regressions, fuelPriceOverrides]);
}

/**
 * Hook to handle location resolution and weather data fetching.
 */
export function useLocationResolver() {
  const dispatch = useAppDispatch();
  const { degreeDayConfig } = useAppState();

  const resolve = useCallback(async (zip: string) => {
    dispatch({ type: 'SET_WEATHER_LOADING', payload: true });
    dispatch({ type: 'SET_WEATHER_ERROR', payload: null });

    try {
      const location = await resolveZipCode(zip);
      dispatch({ type: 'SET_LOCATION', payload: location });

      // Fetch weather data
      const { startDate, endDate } = getHistoricalDateRange(degreeDayConfig.years_of_history);
      const [historical, forecast] = await Promise.all([
        fetchHistoricalWeather(location.lat, location.lon, startDate, endDate),
        fetchForecast(location.lat, location.lon),
      ]);

      const hash = simpleHash(JSON.stringify(historical.slice(0, 10)));

      dispatch({
        type: 'SET_WEATHER_DATA',
        payload: {
          daily_temps: historical,
          forecast_temps: forecast,
          fetched_at: new Date().toISOString(),
          hash,
        },
      });
    } catch (err) {
      dispatch({
        type: 'SET_WEATHER_ERROR',
        payload: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  }, [dispatch, degreeDayConfig.years_of_history]);

  return resolve;
}
