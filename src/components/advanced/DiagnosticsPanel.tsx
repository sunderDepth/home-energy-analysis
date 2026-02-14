import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { ResidualChart } from './ResidualChart.tsx';
import { DegreeDayTable } from './DegreeDayTable.tsx';
import { formatNumber } from '../../utils/format.ts';
import type { RegressionResult, DailyDegreeDay } from '../../types/index.ts';
import { sum } from '../../engine/stats.ts';

interface DiagnosticsPanelProps {
  regression: RegressionResult;
  purpose: string;
  fuelUnit: string;
  daily: DailyDegreeDay[];
}

export function DiagnosticsPanel({ regression, fuelUnit, daily }: DiagnosticsPanelProps) {
  const residualStdError = Math.sqrt(
    sum(regression.residuals.map(r => r * r)) / Math.max(1, regression.residuals.length - 2)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-sand-900">Regression Diagnostics</h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-sand-500 uppercase tracking-wider border-b border-sand-100">
                  <th className="pb-2 pr-4">Coefficient</th>
                  <th className="pb-2 pr-4">Value</th>
                  <th className="pb-2">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-50">
                <tr>
                  <td className="py-2 pr-4 font-medium text-sand-700">
                    <span className="font-mono">β₀</span> (base load)
                  </td>
                  <td className="py-2 pr-4 font-mono text-sand-800">
                    {formatNumber(regression.beta0, 4)}
                  </td>
                  <td className="py-2 text-sand-600">
                    {formatNumber(regression.beta0, 2)} {fuelUnit}/day regardless of weather
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-sand-700">
                    <span className="font-mono">β₁</span> (heating)
                  </td>
                  <td className="py-2 pr-4 font-mono text-sand-800">
                    {formatNumber(regression.beta1, 4)}
                  </td>
                  <td className="py-2 text-sand-600">
                    {formatNumber(regression.beta1, 3)} {fuelUnit} per HDD
                  </td>
                </tr>
                {regression.beta2 !== null && (
                  <tr>
                    <td className="py-2 pr-4 font-medium text-sand-700">
                      <span className="font-mono">β₂</span> (cooling)
                    </td>
                    <td className="py-2 pr-4 font-mono text-sand-800">
                      {formatNumber(regression.beta2, 4)}
                    </td>
                    <td className="py-2 text-sand-600">
                      {formatNumber(regression.beta2, 3)} {fuelUnit} per CDD
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-sand-100">
            <div>
              <p className="text-xs text-sand-500">R²</p>
              <p className="font-mono text-sand-800">{regression.r_squared.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-sand-500">Residual Std. Error</p>
              <p className="font-mono text-sand-800">{formatNumber(residualStdError, 2)}</p>
            </div>
            <div>
              <p className="text-xs text-sand-500">Observations</p>
              <p className="font-mono text-sand-800">{regression.observations.length}</p>
            </div>
            <div>
              <p className="text-xs text-sand-500">Annual Total</p>
              <p className="font-mono text-sand-800">{formatNumber(regression.annual_total, 1)} {fuelUnit}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <ResidualChart regression={regression} fuelUnit={fuelUnit} />
      <DegreeDayTable daily={daily} />
    </div>
  );
}
