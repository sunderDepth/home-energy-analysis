import { useAppState, useAppDispatch } from '../../state/app-context.tsx';
import { FUEL_DATA } from '../../types/fuel-reference.ts';
import { FuelSourceCard } from './FuelSourceCard.tsx';
import { Button } from '../ui/Button.tsx';
import { Section } from '../layout/Section.tsx';
import { generateId } from '../../utils/format.ts';
import type { FuelSource } from '../../types/index.ts';

export function FuelSourceManager() {
  const { fuelSources } = useAppState();
  const dispatch = useAppDispatch();

  const addFuelSource = () => {
    const defaultFuel = FUEL_DATA[0];
    const newSource: FuelSource = {
      id: generateId(),
      fuel_type: defaultFuel.key,
      label: defaultFuel.name,
      input_mode: defaultFuel.input_mode,
      purpose: 'heating',
      bills: [],
    };
    dispatch({ type: 'ADD_FUEL_SOURCE', payload: newSource });
  };

  return (
    <Section
      title="Energy Sources"
      subtitle="Add your fuel sources and enter your bills or delivery records."
    >
      <div className="space-y-4">
        {fuelSources.map(fs => (
          <FuelSourceCard key={fs.id} fuelSource={fs} />
        ))}

        <Button variant="secondary" onClick={addFuelSource} className="w-full sm:w-auto">
          + Add Fuel Source
        </Button>
      </div>
    </Section>
  );
}
