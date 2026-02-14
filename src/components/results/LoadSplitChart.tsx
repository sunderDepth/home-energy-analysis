import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import type { RegressionResult } from '../../types/index.ts';
import { formatNumber } from '../../utils/format.ts';

interface LoadSplitChartProps {
  regression: RegressionResult;
  fuelUnit: string;
}

export function LoadSplitChart({ regression, fuelUnit }: LoadSplitChartProps) {
  const data = [
    { name: 'Heating Load', value: regression.annual_heating_load },
    { name: 'Cooling Load', value: regression.annual_cooling_load },
    { name: 'Base Load', value: regression.annual_base_load },
  ].filter(d => d.value > 0);

  const COLORS = ['#059669', '#0ea5e9', '#a89e94'];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend
            formatter={(value: string, entry) => {
              const payload = entry?.payload as { value?: number } | undefined;
              return (
                <span className="text-xs text-sand-700">
                  {value}: {formatNumber(payload?.value ?? 0, 0)} {fuelUnit}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
