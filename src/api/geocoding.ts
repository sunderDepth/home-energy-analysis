import type { LocationData } from '../types/index.ts';

interface GeocodingResult {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string; // state
    postcodes?: string[];
  }>;
}

/**
 * Resolve a US zip code to lat/lon using Open-Meteo geocoding API.
 */
export async function resolveZipCode(zip: string): Promise<LocationData> {
  // Clean the zip code
  const cleanZip = zip.trim().replace(/\D/g, '').slice(0, 5);
  if (cleanZip.length !== 5) {
    throw new Error('Please enter a valid 5-digit US zip code.');
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cleanZip}&count=5&language=en&format=json&country_code=US`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to look up location. Please try again.');
  }

  const data: GeocodingResult = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No location found for zip code ${cleanZip}. Please check and try again.`);
  }

  // Find the best match — prefer one that has the zip in postcodes
  const match = data.results.find(r =>
    r.postcodes?.includes(cleanZip)
  ) ?? data.results[0];

  const name = match.admin1
    ? `${match.name}, ${match.admin1}`
    : match.name;

  return {
    zip_code: cleanZip,
    lat: match.latitude,
    lon: match.longitude,
    name,
  };
}
