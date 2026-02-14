import { useState } from 'react';
import { useAppState, useAppDispatch } from '../../state/app-context.tsx';
import { FUEL_DATA, getFuelByKey } from '../../types/fuel-reference.ts';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { Select } from '../ui/Select.tsx';
import { Input } from '../ui/Input.tsx';
import { Button } from '../ui/Button.tsx';
import { BillEntryTable } from './BillEntryTable.tsx';
import type { FuelSource, FuelTypeKey, FuelPurpose } from '../../types/index.ts';

interface FuelSourceCardProps {
  fuelSource: FuelSource;
}

export function FuelSourceCard({ fuelSource }: FuelSourceCardProps) {
  const { advancedMode } = useAppState();
  const dispatch = useAppDispatch();
  const [showTankConfig, setShowTankConfig] = useState(false);

  const fuelRef = getFuelByKey(fuelSource.fuel_type);

  const update = (changes: Partial<FuelSource>) => {
    dispatch({
      type: 'UPDATE_FUEL_SOURCE',
      payload: { ...fuelSource, ...changes },
    });
  };

  const handleFuelTypeChange = (key: string) => {
    const fuel = getFuelByKey(key);
    if (fuel) {
      update({
        fuel_type: key as FuelTypeKey,
        label: fuel.name,
        input_mode: fuel.input_mode,
      });
    }
  };

  const remove = () => {
    dispatch({ type: 'REMOVE_FUEL_SOURCE', payload: fuelSource.id });
  };

  const fuelOptions = FUEL_DATA.map(f => ({ value: f.key, label: f.name }));
  const purposeOptions = [
    { value: 'heating', label: 'Heating' },
    { value: 'cooling', label: 'Cooling' },
    { value: 'both', label: 'Heating & Cooling' },
    { value: 'all', label: 'All (heating, cooling, & base)' },
  ];

  const isDeliveryFuel = fuelSource.input_mode === 'delivery';

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Select
            options={fuelOptions}
            value={fuelSource.fuel_type}
            onChange={e => handleFuelTypeChange(e.target.value)}
            className="sm:w-56"
          />
          <Input
            placeholder="Label (e.g., Main boiler)"
            value={fuelSource.label}
            onChange={e => update({ label: e.target.value })}
            className="sm:w-48"
          />
          <Select
            options={purposeOptions}
            value={fuelSource.purpose}
            onChange={e => update({ purpose: e.target.value as FuelPurpose })}
            className="sm:w-44"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={remove} className="text-danger-600 hover:text-danger-700 self-end sm:self-center">
          Remove
        </Button>
      </CardHeader>

      <CardBody>
        {/* Advanced settings */}
        {advancedMode && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-sand-100">
            <Input
              label="System Efficiency"
              type="number"
              step="0.01"
              min="0.1"
              max="5"
              value={fuelSource.system_efficiency ?? fuelRef?.typical_system_efficiency ?? ''}
              onChange={e => update({ system_efficiency: parseFloat(e.target.value) || undefined })}
              helpText={`Default: ${fuelRef?.typical_system_efficiency}`}
            />
            {isDeliveryFuel && (
              <>
                <Input
                  label={`Tank Capacity (${fuelRef?.unit_plural})`}
                  type="number"
                  min="0"
                  value={fuelSource.tank_capacity ?? ''}
                  onChange={e => update({ tank_capacity: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 275"
                />
                <Input
                  label={`Current Level (${fuelRef?.unit_plural})`}
                  type="number"
                  min="0"
                  value={fuelSource.current_tank_level ?? ''}
                  onChange={e => update({ current_tank_level: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 150"
                />
              </>
            )}
          </div>
        )}

        {/* Bill entry table */}
        <BillEntryTable fuelSource={fuelSource} />

        {/* Quick tank config for delivery fuels (even outside advanced mode) */}
        {isDeliveryFuel && !advancedMode && fuelSource.bills.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-sand-100">
            {!showTankConfig ? (
              <button
                onClick={() => setShowTankConfig(true)}
                className="text-sm text-primary-600 hover:underline cursor-pointer"
              >
                Set up delivery forecasting →
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label={`Tank Capacity (${fuelRef?.unit_plural})`}
                  type="number"
                  min="0"
                  value={fuelSource.tank_capacity ?? ''}
                  onChange={e => update({ tank_capacity: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 275"
                />
                <Input
                  label={`Current Level (${fuelRef?.unit_plural})`}
                  type="number"
                  min="0"
                  value={fuelSource.current_tank_level ?? ''}
                  onChange={e => update({ current_tank_level: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 150"
                />
                <Input
                  label="Reorder at (gallons)"
                  type="number"
                  min="0"
                  value={fuelSource.delivery_threshold ?? ''}
                  onChange={e => update({ delivery_threshold: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 50"
                />
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
