import type { DailyTemp } from '../types/index.ts';

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

/**
 * Fetch historical daily temperatures from Open-Meteo Archive API.
 */
export async function fetchHistoricalWeather(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<DailyTemp[]> {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Weather API error: ${response.status} ${text}`);
  }

  const data: OpenMeteoResponse = await response.json();
  return parseDailyTemps(data.daily);
}

/**
 * Fetch 16-day weather forecast from Open-Meteo Forecast API.
 */
export async function fetchForecast(
  lat: number,
  lon: number,
): Promise<DailyTemp[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Forecast API error: ${response.status} ${text}`);
  }

  const data: OpenMeteoResponse = await response.json();
  return parseDailyTemps(data.daily);
}

function parseDailyTemps(daily: OpenMeteoDaily): DailyTemp[] {
  return daily.time.map((date, i) => ({
    date,
    temp_max_f: daily.temperature_2m_max[i],
    temp_min_f: daily.temperature_2m_min[i],
  }));
}

/**
 * Build the start date for historical weather fetch.
 * Goes back `years` years from today.
 */
export function getHistoricalDateRange(years: number = 3): { startDate: string; endDate: string } {
  const end = new Date();
  // Open-Meteo historical data has a ~5 day lag
  end.setDate(end.getDate() - 5);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - years);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
