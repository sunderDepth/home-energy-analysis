export function Footer() {
  return (
    <footer className="mt-12 py-6 border-t border-sand-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center text-sm text-sand-500 space-y-1">
          <p>
            Weather data from{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              Open-Meteo
            </a>
            . Fuel reference data from DOE/EIA.
          </p>
          <p>
            Your data never leaves your browser. No accounts, no tracking, no analytics.
          </p>
        </div>
      </div>
    </footer>
  );
}
