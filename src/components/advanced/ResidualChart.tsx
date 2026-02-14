import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { formatNumber } from '../../utils/format.ts';
import type { RegressionResult } from '../../types/index.ts';

interface ResidualChartProps {
  regression: RegressionResult;
  fuelUnit: string;
}

export function ResidualChart({ regression, fuelUnit }: ResidualChartProps) {
  const data = regression.fitted_values.map((fitted, i) => ({
    fitted,
    residual: regression.residuals[i],
  }));

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-sand-900">Residual Plot</h3>
        <p className="text-sm text-sand-500 mt-0.5">
          Residuals should be randomly scattered around zero with no pattern.
        </p>
      </CardHeader>
      <CardBody>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 10, right: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5dfda" />
              <XAxis
                dataKey="fitted"
                type="number"
                label={{ value: `Fitted (${fuelUnit})`, position: 'bottom', offset: 5, style: { fontSize: 11, fill: '#6b6159' } }}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                dataKey="residual"
                type="number"
                label={{ value: `Residual (${fuelUnit})`, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b6159' } }}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white shadow-card rounded-lg px-3 py-2 text-sm">
                      <p className="text-sand-500 text-xs">Fitted: {formatNumber(d.fitted, 2)}</p>
                      <p className="text-sand-800">Residual: {formatNumber(d.residual, 2)}</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="#a89e94" strokeDasharray="4 2" />
              <Scatter data={data} fill="#fbbf24" stroke="#d97706" strokeWidth={1} r={4} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
