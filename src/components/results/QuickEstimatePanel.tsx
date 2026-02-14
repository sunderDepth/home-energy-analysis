import { useMemo } from 'react';
import { useAppState, useAppDispatch } from '../../state/app-context.tsx';
import { useAnnualDegreeDays } from '../../state/hooks.ts';
import { FUEL_DATA, getFuelByKey } from '../../types/fuel-reference.ts';
import { compareFuelCosts } from '../../engine/fuel-comparison.ts';
import { Card, CardBody } from '../ui/Card.tsx';
import { Select } from '../ui/Select.tsx';
import { Input } from '../ui/Input.tsx';
import { FuelComparisonChart } from './FuelComparisonChart.tsx';
import { SavingsSummary } from './SavingsSummary.tsx';
import { formatNumber } from '../../utils/format.ts';
import type { FuelTypeKey } from '../../types/index.ts';

export function QuickEstimatePanel() {
  const { quickEstimate, fuelPriceOverrides } = useAppState();
  const dispatch = useAppDispatch();
  const { annual_hdd } = useAnnualDegreeDays();

  const fuelOptions = FUEL_DATA.map(f => ({ value: f.key, label: f.name }));

  const comparison = useMemo(() => {
    if (!quickEstimate) return [];

    const fuelRef = getFuelByKey(quickEstimate.fuel_type);
    if (!fuelRef) return [];

    let annualQuantity = quickEstimate.annual_quantity;
    if (!annualQuantity && quickEstimate.annual_cost) {
      const price = fuelPriceOverrides[quickEstimate.fuel_type] ?? fuelRef.default_price;
      annualQuantity = quickEstimate.annual_cost / price;
    }
    if (!annualQuantity) return [];

    // Estimate heat demand from annual quantity
    const heatDemandBtu = annualQuantity * fuelRef.btu_per_unit * fuelRef.typical_system_efficiency;

    return compareFuelCosts(
      heatDemandBtu,
      quickEstimate.fuel_type,
      fuelPriceOverrides,
    );
  }, [quickEstimate, fuelPriceOverrides]);

  const setEstimate = (changes: Partial<typeof quickEstimate>) => {
    const current = quickEstimate ?? { fuel_type: 'oil_2' as FuelTypeKey };
    dispatch({
      type: 'SET_QUICK_ESTIMATE',
      payload: { ...current, ...changes } as typeof quickEstimate,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <p className="text-sm text-sand-600 mb-3">
            Don't have your bills handy? Enter a rough annual estimate to see how fuel costs compare in your area.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Current Fuel"
              options={fuelOptions}
              value={quickEstimate?.fuel_type ?? 'oil_2'}
              onChange={e => setEstimate({ fuel_type: e.target.value as FuelTypeKey })}
            />
            <Input
              label="Annual Cost ($)"
              type="number"
              step="1"
              min="0"
              placeholder="e.g., 3000"
              value={quickEstimate?.annual_cost ?? ''}
              onChange={e => setEstimate({ annual_cost: parseFloat(e.target.value) || undefined, annual_quantity: undefined })}
            />
            <Input
              label={`OR Annual Quantity (${getFuelByKey(quickEstimate?.fuel_type ?? 'oil_2')?.unit_plural ?? 'units'})`}
              type="number"
              step="any"
              min="0"
              placeholder="e.g., 800"
              value={quickEstimate?.annual_quantity ?? ''}
              onChange={e => setEstimate({ annual_quantity: parseFloat(e.target.value) || undefined, annual_cost: undefined })}
            />
          </div>
          {annual_hdd > 0 && (
            <p className="text-xs text-sand-400 mt-2">
              Your area averages {formatNumber(annual_hdd, 0)} heating degree days/year.
            </p>
          )}
        </CardBody>
      </Card>

      {comparison.length > 0 && (
        <>
          <FuelComparisonChart data={comparison} />
          <SavingsSummary comparisons={comparison} />
        </>
      )}
    </div>
  );
}
