import { Card, CardBody } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { formatCurrency, formatNumber, rSquaredLabel } from '../../utils/format.ts';
import type { RegressionResult } from '../../types/index.ts';

interface SummaryCardsProps {
  regression: RegressionResult;
  pricePerUnit: number;
  fuelUnit: string;
}

export function SummaryCards({ regression, pricePerUnit, fuelUnit }: SummaryCardsProps) {
  const annualCost = regression.annual_total * pricePerUnit;
  const basePercent = regression.annual_total > 0
    ? (regression.annual_base_load / regression.annual_total * 100)
    : 0;
  const climatePercent = 100 - basePercent;
  const quality = rSquaredLabel(regression.r_squared);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardBody>
          <p className="text-sm text-sand-500">Estimated Annual Cost</p>
          <p className="text-2xl font-bold text-sand-900 mt-1">{formatCurrency(annualCost)}</p>
          <p className="text-xs text-sand-400 mt-1">
            {formatNumber(regression.annual_total, 0)} {fuelUnit}/year
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm text-sand-500">Energy Split</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-sand-600">Weather-driven</span>
              <span className="font-medium text-sand-800">{climatePercent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-sand-100 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full transition-all"
                style={{ width: `${climatePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-sand-600">Base load</span>
              <span className="font-medium text-sand-800">{basePercent.toFixed(0)}%</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm text-sand-500">Model Quality</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={regression.r_squared >= 0.85 ? 'success' : regression.r_squared >= 0.65 ? 'warning' : 'danger'}>
              {quality.text}
            </Badge>
            <span className="text-sm text-sand-600">R² = {regression.r_squared.toFixed(3)}</span>
          </div>
          {regression.r_squared < 0.65 && (
            <p className="text-xs text-sand-500 mt-2">
              Your energy use doesn't correlate strongly with weather. This could mean significant non-climate loads, inconsistent occupancy, or data entry issues.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
