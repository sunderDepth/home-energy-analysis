import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { formatDate, formatNumber } from '../../utils/format.ts';
import type { TankLevelPoint } from '../../types/index.ts';

interface TankLevelChartProps {
  points: TankLevelPoint[];
  tankCapacity: number;
  threshold: number;
}

export function TankLevelChart({ points, tankCapacity, threshold }: TankLevelChartProps) {
  if (points.length === 0) return null;

  // Separate historical and projected for different line styles
  const chartData = points.map(p => ({
    date: p.date,
    historical: p.is_projected ? undefined : p.level,
    projected: p.is_projected ? p.level : undefined,
    // Connect the two lines at the transition point
    level: p.level,
    low: p.level_low,
    high: p.level_high,
  }));

  // Find transition point and bridge the gap
  const firstProjectedIdx = chartData.findIndex(d => d.projected !== undefined);
  if (firstProjectedIdx > 0) {
    chartData[firstProjectedIdx].historical = chartData[firstProjectedIdx - 1].historical;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5dfda" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(d: string) => {
              const date = new Date(d + 'T00:00:00');
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, tankCapacity]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white shadow-card rounded-lg px-3 py-2 text-sm">
                  <p className="text-sand-500 text-xs">{formatDate(d.date)}</p>
                  <p className="text-sand-800 font-medium">{formatNumber(d.level, 1)} gallons</p>
                  {d.low != null && (
                    <p className="text-sand-400 text-xs">
                      Range: {formatNumber(d.low, 0)} – {formatNumber(d.high, 0)}
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* Uncertainty band */}
          <Area
            dataKey="high"
            stroke="none"
            fill="#a7f3d0"
            fillOpacity={0.3}
            type="monotone"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="low"
            stroke="none"
            fill="#faf8f5"
            fillOpacity={1}
            type="monotone"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Historical line (solid) */}
          <Line
            dataKey="historical"
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            type="monotone"
            connectNulls={false}
          />

          {/* Projected line (dashed) */}
          <Line
            dataKey="projected"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            type="monotone"
            connectNulls={false}
          />

          {/* Threshold line */}
          <ReferenceLine
            y={threshold}
            stroke="#d97706"
            strokeDasharray="4 2"
            label={{
              value: `Reorder (${threshold} gal)`,
              position: 'right',
              style: { fontSize: 10, fill: '#d97706' },
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
