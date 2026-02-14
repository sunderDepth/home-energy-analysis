export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateImport(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['File does not contain valid JSON data.'], warnings };
  }

  const session = data as Record<string, unknown>;

  // Check version
  if (!session.version) {
    warnings.push('No version field found — file may be from an older version.');
  }

  // Check location
  if (session.location && typeof session.location === 'object') {
    const loc = session.location as Record<string, unknown>;
    if (!loc.lat || !loc.lon) {
      warnings.push('Location data is incomplete — you may need to re-enter your zip code.');
    }
  }

  // Check fuel sources
  if (!Array.isArray(session.fuel_sources)) {
    errors.push('No fuel source data found in file.');
    return { valid: errors.length === 0, errors, warnings };
  }

  for (let i = 0; i < session.fuel_sources.length; i++) {
    const fs = session.fuel_sources[i] as Record<string, unknown>;
    if (!fs.fuel_type) {
      errors.push(`Fuel source #${i + 1} is missing a fuel type.`);
    }
    if (!fs.id) {
      // Auto-fix: generate an ID
      (session.fuel_sources[i] as Record<string, unknown>).id = Math.random().toString(36).slice(2);
    }
    if (Array.isArray(fs.bills)) {
      const bills = fs.bills as Array<Record<string, unknown>>;
      // Validate bill dates are in order (only for billing-mode fuels, not deliveries)
      if (fs.input_mode !== 'delivery') {
        for (let j = 1; j < bills.length; j++) {
          const prev = bills[j - 1];
          const curr = bills[j];
          if (prev.end_date && curr.start_date && prev.end_date > curr.start_date) {
            warnings.push(`${fs.label || `Source #${i + 1}`}: some bill dates may be out of order.`);
            break;
          }
        }
      }
      // Ensure bills have IDs
      for (const bill of bills) {
        if (!bill.id) {
          bill.id = Math.random().toString(36).slice(2);
        }
      }
    }
  }

  // Check weather data staleness
  if (session.exported_at) {
    const exportDate = new Date(session.exported_at as string);
    const daysSinceExport = (Date.now() - exportDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceExport > 30) {
      warnings.push(`This analysis was exported ${Math.round(daysSinceExport)} days ago. You may want to refresh weather data.`);
    }
  }

  // Check degree day config
  if (!session.degree_day_config) {
    (session as Record<string, unknown>).degree_day_config = {
      heating_base_temp_f: 65,
      cooling_base_temp_f: 65,
      years_of_history: 3,
    };
    warnings.push('No degree-day configuration found — using defaults (65°F base temp).');
  }

  return { valid: errors.length === 0, errors, warnings };
}
