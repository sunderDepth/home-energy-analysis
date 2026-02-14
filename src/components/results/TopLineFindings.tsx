import { formatCurrency, formatNumber } from '../../utils/format.ts';
import type { RegressionResult, FuelComparisonEntry } from '../../types/index.ts';

interface TopLineFindingsProps {
  regression: RegressionResult;
  pricePerUnit: number;
  fuelUnit: string;
  fuelName: string;
  comparison: FuelComparisonEntry[];
}

export function TopLineFindings({
  regression,
  pricePerUnit,
  fuelUnit,
  fuelName,
  comparison,
}: TopLineFindingsProps) {
  const dailyBase = regression.beta0;
  const dailyBaseCost = dailyBase * pricePerUnit;
  const heatingPerHdd = regression.beta1;
  const annualHeatingUnits = regression.annual_heating_load;
  const annualHeatingCost = annualHeatingUnits * pricePerUnit;
  const annualTotal = regression.annual_total;
  const annualTotalCost = annualTotal * pricePerUnit;

  // Find cheapest alternative
  const currentEntry = comparison.find(c => c.is_current);
  const alternatives = comparison.filter(c => !c.is_current && c.annual_cost > 0);
  const cheapest = alternatives.length > 0
    ? alternatives.reduce((a, b) => a.annual_cost < b.annual_cost ? a : b)
    : null;

  const savings = currentEntry && cheapest
    ? currentEntry.annual_cost - cheapest.annual_cost
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-card border-l-4 border-primary-500 p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-sand-900">Key Findings</h3>

      {/* Tier 1: Daily base usage */}
      <div>
        <p className="text-sand-700 text-sm leading-relaxed">
          Your home uses approximately{' '}
          <span className="text-lg font-semibold text-sand-900">
            {formatNumber(dailyBase, 2)} {fuelUnit}
          </span>{' '}
          of {fuelName.toLowerCase()} per day for non-heating purposes (hot water, cooking, etc.),
          costing about{' '}
          <span className="font-semibold text-sand-900">
            {formatCurrency(dailyBaseCost)}/day
          </span>.
        </p>
      </div>

      {/* Tier 2: Heating sensitivity */}
      {heatingPerHdd > 0 && (
        <div>
          <p className="text-sand-700 text-sm leading-relaxed">
            For every degree the temperature drops below your heating threshold, you use an
            additional{' '}
            <span className="text-lg font-semibold text-sand-900">
              {formatNumber(heatingPerHdd, 3)} {fuelUnit}
            </span>{' '}
            per day for heating. Last year, that added up to roughly{' '}
            <span className="font-semibold text-sand-900">
              {formatNumber(annualHeatingUnits, 0)} {fuelUnit}
            </span>{' '}
            and{' '}
            <span className="font-semibold text-sand-900">
              {formatCurrency(annualHeatingCost)}
            </span>{' '}
            in heating costs.
          </p>
        </div>
      )}

      {/* Tier 3: Bottom line */}
      <div className="pt-2 border-t border-sand-100">
        <p className="text-sand-700 text-sm leading-relaxed">
          Your estimated annual {fuelName.toLowerCase()} bill is{' '}
          <span className="text-xl font-bold text-sand-900">
            {formatCurrency(annualTotalCost)}
          </span>{' '}
          ({formatNumber(annualTotal, 0)} {fuelUnit}/year).
          {cheapest && savings > 0 && (
            <>
              {' '}The cheapest alternative would be{' '}
              <span className="font-semibold text-primary-700">
                {cheapest.fuel.name}
              </span>{' '}
              at{' '}
              <span className="font-semibold text-primary-700">
                {formatCurrency(cheapest.annual_cost)}/year
              </span>
              {' '}&mdash; a potential savings of{' '}
              <span className="font-semibold text-primary-700">
                {formatCurrency(savings)}
              </span>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
