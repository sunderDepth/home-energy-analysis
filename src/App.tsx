import { useState } from 'react';
import { useAppState, useAppDispatch } from './state/app-context.tsx';
import { useDegreeDays, useAllRegressions, useFuelComparison } from './state/hooks.ts';
import { getFuelByKey } from './types/fuel-reference.ts';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { Section } from './components/layout/Section.tsx';
import { LocationInput } from './components/location/LocationInput.tsx';
import { FuelSourceManager } from './components/fuel/FuelSourceManager.tsx';
import { QuickEstimatePanel } from './components/results/QuickEstimatePanel.tsx';
import { SummaryCards } from './components/results/SummaryCards.tsx';
import { TopLineFindings } from './components/results/TopLineFindings.tsx';
import { FuelComparisonChart } from './components/results/FuelComparisonChart.tsx';
import { EnergyProfileChart } from './components/results/EnergyProfileChart.tsx';
import { SavingsSummary } from './components/results/SavingsSummary.tsx';
import { DeliveryForecastPanel } from './components/forecast/DeliveryForecastPanel.tsx';
import { DiagnosticsPanel } from './components/advanced/DiagnosticsPanel.tsx';
import { ExportImportPanel } from './components/io/ExportImportPanel.tsx';
import { Button } from './components/ui/Button.tsx';
import { Toggle } from './components/ui/Toggle.tsx';

type AnalysisMode = 'quick' | 'detailed';

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const daily = useDegreeDays();
  const regressions = useAllRegressions();
  const comparison = useFuelComparison();
  const [showExportImport, setShowExportImport] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('detailed');

  const hasLocation = !!state.location && !!state.weatherData;
  const hasBillData = state.fuelSources.some(fs => fs.bills.length >= 3);
  const hasRegressions = regressions.size > 0;
  const hasRunAnalysis = state.analysisVersion >= 0;
  const isStale = hasRunAnalysis && state.dataVersion > state.analysisVersion;
  const canRunAnalysis = hasLocation && hasBillData && hasRegressions;

  // Get the first regression for summary display
  const firstFuelSource = state.fuelSources[0];
  const firstRegression = firstFuelSource ? regressions.get(firstFuelSource.id) : undefined;
  const firstFuelRef = firstFuelSource ? getFuelByKey(firstFuelSource.fuel_type) : undefined;

  // Delivery forecast candidates: delivery fuels with tank config and enough data
  const forecastCandidates = state.fuelSources.filter(fs =>
    fs.input_mode === 'delivery' &&
    fs.tank_capacity &&
    fs.current_tank_level != null &&
    regressions.has(fs.id)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSaveLoad={() => setShowExportImport(true)} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 w-full pb-8">
        {/* Step 1: Location */}
        <Section title="Location" subtitle="Enter your zip code to fetch local weather data.">
          <LocationInput />
        </Section>

        {/* Step 2: Analysis mode toggle (only after location) */}
        {hasLocation && (
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setAnalysisMode('quick')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  analysisMode === 'quick'
                    ? 'bg-primary-600 text-white'
                    : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                }`}
              >
                Quick Estimate
              </button>
              <button
                onClick={() => setAnalysisMode('detailed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  analysisMode === 'detailed'
                    ? 'bg-primary-600 text-white'
                    : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                }`}
              >
                Detailed Analysis
              </button>
            </div>

            <Toggle
              label="Advanced Mode"
              checked={state.advancedMode}
              onChange={v => dispatch({ type: 'SET_ADVANCED_MODE', payload: v })}
              description="Show efficiency overrides, diagnostics, and degree-day config."
            />
          </div>
        )}

        {/* Quick Estimate mode */}
        {hasLocation && analysisMode === 'quick' && (
          <Section title="Quick Estimate" subtitle="Get a rough fuel cost comparison without entering individual bills.">
            <QuickEstimatePanel />
          </Section>
        )}

        {/* Detailed Analysis mode */}
        {hasLocation && analysisMode === 'detailed' && (
          <>
            {/* Step 3: Fuel sources and bills */}
            <FuelSourceManager />

            {/* Step 4: Run Analysis button */}
            {canRunAnalysis && !hasRunAnalysis && (
              <div className="mt-8 text-center">
                <Button
                  size="lg"
                  onClick={() => dispatch({ type: 'RUN_ANALYSIS' })}
                >
                  Run Analysis
                </Button>
                <p className="text-sm text-sand-500 mt-2">
                  Crunch the numbers and see your energy breakdown.
                </p>
              </div>
            )}

            {/* Step 5: Results (only shown after running analysis) */}
            {hasRunAnalysis && hasRegressions && firstRegression && firstFuelRef && (
              <>
                {/* Staleness banner */}
                {isStale && (
                  <div className="mt-8 flex items-center gap-3 bg-accent-50 border border-accent-200 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-accent-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-accent-800 flex-1">
                      Your data has changed since the last analysis.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => dispatch({ type: 'RUN_ANALYSIS' })}
                    >
                      Re-run Analysis
                    </Button>
                  </div>
                )}

                <Section title="Analysis Results">
                  <div className={`space-y-4 ${isStale ? 'opacity-70' : ''}`}>
                    <TopLineFindings
                      regression={firstRegression}
                      pricePerUnit={
                        state.fuelPriceOverrides[firstFuelSource.fuel_type] ??
                        firstFuelRef.default_price
                      }
                      fuelUnit={firstFuelRef.unit_plural}
                      fuelName={firstFuelRef.name}
                      comparison={comparison}
                    />

                    <SummaryCards
                      regression={firstRegression}
                      pricePerUnit={
                        state.fuelPriceOverrides[firstFuelSource.fuel_type] ??
                        firstFuelRef.default_price
                      }
                      fuelUnit={firstFuelRef.unit_plural}
                    />

                    {comparison.length > 0 && (
                      <>
                        <FuelComparisonChart data={comparison} />
                        <SavingsSummary comparisons={comparison} />
                      </>
                    )}

                    <EnergyProfileChart
                      regression={firstRegression}
                      purpose={firstFuelSource.purpose}
                      fuelUnit={firstFuelRef.unit_plural}
                    />
                  </div>
                </Section>

                {/* Delivery Forecast */}
                {forecastCandidates.length > 0 && (
                  <Section title="Delivery Forecast">
                    <div className={`space-y-4 ${isStale ? 'opacity-70' : ''}`}>
                      {forecastCandidates.map(fs => (
                        <DeliveryForecastPanel key={fs.id} fuelSource={fs} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Advanced diagnostics */}
                {state.advancedMode && (
                  <Section
                    title="Diagnostics"
                    subtitle="Regression details and degree-day breakdown."
                    collapsible
                    defaultOpen={false}
                  >
                    {Array.from(regressions.entries()).map(([fsId, reg]) => {
                      const fs = state.fuelSources.find(f => f.id === fsId);
                      const fRef = fs ? getFuelByKey(fs.fuel_type) : undefined;
                      if (!fs || !fRef) return null;
                      return (
                        <div key={fsId} className="mb-6">
                          {regressions.size > 1 && (
                            <h4 className="text-sm font-semibold text-sand-700 mb-3">{fs.label}</h4>
                          )}
                          <DiagnosticsPanel
                            regression={reg}
                            purpose={fs.purpose}
                            fuelUnit={fRef.unit_plural}
                            daily={daily}
                          />
                        </div>
                      );
                    })}
                  </Section>
                )}
              </>
            )}

            {/* Nudge when there's data but not enough for regression */}
            {!hasRegressions && state.fuelSources.length > 0 && !hasRunAnalysis && (
              <Section title="Analysis Results">
                <div className="text-center py-8 text-sand-500">
                  <p className="text-sm">
                    {hasBillData
                      ? 'Add bill data and click "Run Analysis" to see your energy breakdown.'
                      : 'Enter at least 3 bill records to run the energy analysis.'}
                  </p>
                </div>
              </Section>
            )}
          </>
        )}

        {/* Initial state: before location */}
        {!hasLocation && !state.weatherLoading && (
          <div className="mt-12 text-center text-sand-500">
            <p className="text-lg font-medium text-sand-700">Analyze your home's energy usage</p>
            <p className="text-sm mt-2 max-w-md mx-auto">
              Enter your zip code above to get started. We'll fetch local weather data and help you understand
              your energy costs, compare fuel options, and forecast deliveries.
            </p>
          </div>
        )}
      </main>

      <Footer />

      {showExportImport && (
        <ExportImportPanel onClose={() => setShowExportImport(false)} />
      )}
    </div>
  );
}

export default App;
