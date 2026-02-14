import { useState, useEffect, type FormEvent } from 'react';
import { useAppState } from '../../state/app-context.tsx';
import { useLocationResolver } from '../../state/hooks.ts';
import { Card, CardBody } from '../ui/Card.tsx';
import { Input } from '../ui/Input.tsx';
import { Button } from '../ui/Button.tsx';

export function LocationInput() {
  const { location, weatherLoading, weatherError, weatherData } = useAppState();
  const resolveLocation = useLocationResolver();
  const [zip, setZip] = useState(location?.zip_code ?? '');

  // Sync zip input when location changes externally (e.g., after import)
  useEffect(() => {
    if (location?.zip_code && location.zip_code !== zip) {
      setZip(location.zip_code);
    }
  }, [location?.zip_code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (zip.trim()) {
      resolveLocation(zip);
    }
  };

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-0">
            <Input
              label="Your Zip Code"
              type="text"
              placeholder="e.g., 04101"
              value={zip}
              onChange={e => setZip(e.target.value)}
              maxLength={5}
              helpText="We'll use this to fetch your local weather data."
            />
          </div>
          <Button type="submit" disabled={weatherLoading || !zip.trim()}>
            {weatherLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Fetching weather...
              </span>
            ) : location ? 'Update Location' : 'Get Started'}
          </Button>
        </form>

        {weatherError && (
          <p className="mt-3 text-sm text-danger-600">{weatherError}</p>
        )}

        {location && weatherData && (
          <div className="mt-3 text-sm text-sand-600">
            <span className="font-medium text-sand-800">{location.name}</span>
            <span className="mx-2 text-sand-300">|</span>
            {weatherData.daily_temps.length.toLocaleString()} days of weather data loaded
          </div>
        )}

        {location && !weatherData && !weatherLoading && (
          <div className="mt-3 text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded px-3 py-2">
            Location restored ({location.name}) but weather data needs to be re-fetched.
            Click "{location ? 'Update Location' : 'Get Started'}" above to load weather data.
          </div>
        )}
      </CardBody>
    </Card>
  );
}
