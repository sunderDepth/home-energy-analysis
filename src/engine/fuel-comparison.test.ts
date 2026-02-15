import { describe, it, expect } from 'vitest';
import { compareFuelCosts, calculateHeatDemandBtu } from './fuel-comparison.ts';
import { FUEL_DATA } from '../types/fuel-reference.ts';

describe('compareFuelCosts', () => {
  const demandBtu = 50_000_000; // 50 million BTU

  it('returns an entry for each fuel type', () => {
    const result = compareFuelCosts(demandBtu, null);
    expect(result).toHaveLength(FUEL_DATA.length);
  });

  it('sorts by annual cost ascending (cheapest first)', () => {
    const result = compareFuelCosts(demandBtu, null);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].annual_cost).toBeGreaterThanOrEqual(result[i - 1].annual_cost);
    }
  });

  it('marks the current fuel with is_current', () => {
    const result = compareFuelCosts(demandBtu, 'oil_2');
    const oilEntry = result.find(e => e.fuel.key === 'oil_2');
    const gasEntry = result.find(e => e.fuel.key === 'natural_gas');
    expect(oilEntry!.is_current).toBe(true);
    expect(gasEntry!.is_current).toBe(false);
  });

  it('marks nothing as current when currentFuelKey is null', () => {
    const result = compareFuelCosts(demandBtu, null);
    expect(result.every(e => !e.is_current)).toBe(true);
  });

  it('applies price overrides', () => {
    const defaultResult = compareFuelCosts(demandBtu, null);
    const overrideResult = compareFuelCosts(demandBtu, null, { oil_2: 10.00 });

    const defaultOil = defaultResult.find(e => e.fuel.key === 'oil_2')!;
    const overrideOil = overrideResult.find(e => e.fuel.key === 'oil_2')!;

    expect(overrideOil.price_per_unit).toBe(10.00);
    expect(overrideOil.annual_cost).toBeGreaterThan(defaultOil.annual_cost);
    // Quantity needed should be the same (price doesn't affect quantity)
    expect(overrideOil.quantity_needed).toBeCloseTo(defaultOil.quantity_needed);
  });

  it('computes plausible quantities', () => {
    const result = compareFuelCosts(demandBtu, null);
    for (const entry of result) {
      expect(entry.quantity_needed).toBeGreaterThan(0);
      expect(entry.annual_cost).toBeGreaterThan(0);
    }
  });
});

describe('calculateHeatDemandBtu', () => {
  const oilRef = FUEL_DATA.find(f => f.key === 'oil_2')!;

  it('calculates BTU from annual load and fuel reference', () => {
    const btu = calculateHeatDemandBtu(500, oilRef); // 500 gallons
    // 500 * 138500 * 0.83
    expect(btu).toBeCloseTo(500 * 138_500 * 0.83);
  });

  it('uses custom efficiency when provided', () => {
    const btu = calculateHeatDemandBtu(500, oilRef, 0.90);
    expect(btu).toBeCloseTo(500 * 138_500 * 0.90);
  });
});
