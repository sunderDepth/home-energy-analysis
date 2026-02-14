import type { FuelComparisonEntry, FuelReference, FuelTypeKey } from '../types/index.ts';
import { FUEL_DATA } from '../types/fuel-reference.ts';

export interface FuelPriceOverrides {
  [key: string]: number;
}

/**
 * Compare annual heating costs across all fuel types.
 *
 * @param annualHeatDemandBtu - Total annual heating demand in BTU (delivered heat)
 * @param currentFuelKey - The user's current fuel type key
 * @param priceOverrides - User-provided fuel prices (overrides defaults)
 * @param efficiencyOverrides - User-provided efficiency overrides
 */
export function compareFuelCosts(
  annualHeatDemandBtu: number,
  currentFuelKey: FuelTypeKey | null,
  priceOverrides: FuelPriceOverrides = {},
  efficiencyOverrides: Record<string, number> = {},
): FuelComparisonEntry[] {
  return FUEL_DATA.map(fuel => {
    const price = priceOverrides[fuel.key] ?? fuel.default_price;
    const efficiency = efficiencyOverrides[fuel.key] ?? fuel.typical_system_efficiency;
    const quantityNeeded = annualHeatDemandBtu / (fuel.btu_per_unit * efficiency);
    const annualCost = quantityNeeded * price;

    return {
      fuel,
      quantity_needed: quantityNeeded,
      annual_cost: annualCost,
      price_per_unit: price,
      is_current: fuel.key === currentFuelKey,
    };
  }).sort((a, b) => a.annual_cost - b.annual_cost);
}

/**
 * Calculate the annual heat demand in BTU from regression results.
 * This is the delivered heat (after efficiency), used for fuel comparison.
 */
export function calculateHeatDemandBtu(
  annualHeatingLoad: number,
  fuelRef: FuelReference,
  efficiency?: number,
): number {
  const eff = efficiency ?? fuelRef.typical_system_efficiency;
  return annualHeatingLoad * fuelRef.btu_per_unit * eff;
}
