import { describe, it, expect } from 'vitest';
import { validateImport } from './ImportValidator.tsx';

describe('validateImport', () => {
  function validSession() {
    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      location: { zip_code: '04101', lat: 43.66, lon: -70.26, name: 'Portland, Maine' },
      degree_day_config: {
        heating_base_temp_f: 65,
        cooling_base_temp_f: 65,
        years_of_history: 3,
      },
      fuel_sources: [
        {
          id: 'fs1',
          fuel_type: 'oil_2',
          label: 'Heating Oil',
          input_mode: 'delivery',
          bills: [
            { id: 'b1', start_date: '2025-01-15', end_date: '2025-01-15', quantity: 150, unit: 'gallons' },
            { id: 'b2', start_date: '2025-03-01', end_date: '2025-03-01', quantity: 120, unit: 'gallons' },
          ],
          purpose: 'heating',
        },
      ],
    };
  }

  it('accepts a valid session', () => {
    const result = validateImport(validSession());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-object input', () => {
    expect(validateImport(null).valid).toBe(false);
    expect(validateImport('string').valid).toBe(false);
    expect(validateImport(42).valid).toBe(false);
  });

  it('warns when version is missing', () => {
    const data = validSession();
    delete (data as Record<string, unknown>).version;
    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('version'))).toBe(true);
  });

  it('errors when fuel_sources is missing', () => {
    const data = validSession();
    delete (data as Record<string, unknown>).fuel_sources;
    const result = validateImport(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('fuel source'))).toBe(true);
  });

  it('errors when a fuel source has no fuel_type', () => {
    const data = validSession();
    delete (data.fuel_sources[0] as Record<string, unknown>).fuel_type;
    const result = validateImport(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('fuel type'))).toBe(true);
  });

  it('auto-generates IDs for fuel sources missing them', () => {
    const data = validSession();
    delete (data.fuel_sources[0] as Record<string, unknown>).id;
    const result = validateImport(data);
    expect(result.valid).toBe(true);
    // The function mutates the data to add the ID
    expect(data.fuel_sources[0].id).toBeTruthy();
  });

  it('auto-generates IDs for bills missing them', () => {
    const data = validSession();
    delete (data.fuel_sources[0].bills[0] as Record<string, unknown>).id;
    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(data.fuel_sources[0].bills[0].id).toBeTruthy();
  });

  it('warns about stale exports (> 30 days old)', () => {
    const data = validSession();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);
    data.exported_at = oldDate.toISOString();
    const result = validateImport(data);
    expect(result.warnings.some(w => w.includes('days ago'))).toBe(true);
  });

  it('provides default degree_day_config when missing', () => {
    const data = validSession();
    delete (data as Record<string, unknown>).degree_day_config;
    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('degree-day'))).toBe(true);
    expect((data as Record<string, unknown>).degree_day_config).toBeTruthy();
  });

  it('does not warn about date order for delivery-mode fuels', () => {
    const data = validSession();
    // Delivery-mode bills with same start/end dates in reverse order
    data.fuel_sources[0].bills = [
      { id: 'b2', start_date: '2025-03-01', end_date: '2025-03-01', quantity: 120, unit: 'gallons' },
      { id: 'b1', start_date: '2025-01-15', end_date: '2025-01-15', quantity: 150, unit: 'gallons' },
    ];
    const result = validateImport(data);
    expect(result.warnings.every(w => !w.includes('out of order'))).toBe(true);
  });
});
