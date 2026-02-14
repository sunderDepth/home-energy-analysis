import { Card, CardBody } from '../ui/Card.tsx';
import { formatCurrency } from '../../utils/format.ts';
import type { FuelComparisonEntry } from '../../types/index.ts';

interface SavingsSummaryProps {
  comparisons: FuelComparisonEntry[];
}

export function SavingsSummary({ comparisons }: SavingsSummaryProps) {
  const current = comparisons.find(c => c.is_current);
  const cheapest = comparisons[0]; // already sorted by cost

  if (!current || !cheapest || cheapest.is_current) return null;

  const savings = current.annual_cost - cheapest.annual_cost;
  if (savings <= 0) return null;

  return (
    <Card>
      <CardBody className="bg-primary-50 rounded-xl">
        <p className="text-sm text-primary-800">
          <span className="font-semibold">Potential savings: </span>
          Switching from {current.fuel.name} to {cheapest.fuel.name} could save approximately{' '}
          <span className="font-bold">{formatCurrency(savings)}/year</span>.
        </p>
        <p className="text-xs text-primary-600 mt-1">
          This comparison is based on fuel costs only and does not include equipment or installation costs.
        </p>
      </CardBody>
    </Card>
  );
}
