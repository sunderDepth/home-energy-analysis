import { Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { formatNumber, formatDate } from '../../utils/format.ts';
import type { RegressionResult, FuelPurpose } from '../../types/index.ts';

interface EnergyProfileChartProps {
  regression: RegressionResult;
  purpose: FuelPurpose;
  fuelUnit: string;
}

export function EnergyProfileChart({ regression, purpose, fuelUnit }: EnergyProfileChartProps) {
  const useHDD = purpose === 'heating' || purpose === 'both' || purpose === 'all';
  const xLabel = useHDD ? 'Heating Degree Days (HDD)' : 'Cooling Degree Days (CDD)';

  const scatterData = regression.observations.map((obs, i) => ({
    dd: useHDD ? obs.hdd : obs.cdd,
    energy: obs.energy,
    fitted: regression.fitted_values[i],
    label: `${formatDate(obs.bill.start_date)} – ${formatDate(obs.bill.end_date)}`,
  }));

  // Generate regression line points
  const ddValues = scatterData.map(d => d.dd);
  const minDD = Math.min(...ddValues);
  const maxDD = Math.max(...ddValues);
  const lineData = [];
  for (let dd = minDD; dd <= maxDD; dd += (maxDD - minDD) / 50) {
    const days = 30; // approximate month
    const energy = regression.beta0 * days + (useHDD ? regression.beta1 : (regression.beta2 ?? 0)) * dd;
    lineData.push({ dd, energy: Math.max(0, energy) });
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-sand-900">Energy Profile</h3>
        <p className="text-sm text-sand-500 mt-0.5">
          Each point is a billing period. The line shows your building's modeled response to weather.
        </p>
      </CardHeader>
      <CardBody>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ left: 10, right: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5dfda" />
              <XAxis
                dataKey="dd"
                type="number"
                label={{ value: xLabel, position: 'bottom', offset: 5, style: { fontSize: 12, fill: '#6b6159' } }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: fuelUnit, angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 12, fill: '#6b6159' } }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white shadow-card rounded-lg px-3 py-2 text-sm">
                      {d.label && <p className="text-sand-500 text-xs">{d.label}</p>}
                      <p className="text-sand-800">
                        {formatNumber(d.energy, 1)} {fuelUnit} at {formatNumber(d.dd, 0)} {useHDD ? 'HDD' : 'CDD'}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                data={lineData}
                dataKey="energy"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
                type="monotone"
              />
              <Scatter data={scatterData} dataKey="energy" fill="#fbbf24" stroke="#d97706" strokeWidth={1} r={5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
