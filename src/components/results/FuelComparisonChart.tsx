import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { useAppState, useAppDispatch } from '../../state/app-context.tsx';
import { FUEL_DATA } from '../../types/fuel-reference.ts';
import { formatCurrency, formatNumber } from '../../utils/format.ts';
import type { FuelComparisonEntry } from '../../types/index.ts';

interface FuelComparisonChartProps {
  data: FuelComparisonEntry[];
}

export function FuelComparisonChart({ data }: FuelComparisonChartProps) {
  const { fuelPriceOverrides } = useAppState();
  const dispatch = useAppDispatch();

  if (data.length === 0) return null;

  const chartData = data.map(entry => ({
    name: entry.fuel.name,
    cost: Math.round(entry.annual_cost),
    quantity: entry.quantity_needed,
    unit: entry.fuel.unit_plural,
    isCurrent: entry.is_current,
    key: entry.fuel.key,
  }));

  const handlePriceChange = (fuelKey: string, price: number) => {
    dispatch({
      type: 'SET_FUEL_PRICE_OVERRIDE',
      payload: { key: fuelKey, price },
    });
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-sand-900">Annual Heating Cost by Fuel Type</h3>
        <p className="text-sm text-sand-500 mt-0.5">Based on your building's heating demand. Edit prices to match your local rates.</p>
      </CardHeader>
      <CardBody>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 80, top: 5, bottom: 5 }}>
              <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white shadow-card rounded-lg px-3 py-2 text-sm">
                      <p className="font-medium text-sand-800">{d.name}</p>
                      <p className="text-sand-600">
                        {formatCurrency(d.cost)} ({formatNumber(d.quantity, 1)} {d.unit})
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isCurrent ? '#fbbf24' : '#10b981'}
                    fillOpacity={entry.isCurrent ? 1 : 0.7 + (index * 0.03)}
                  />
                ))}
                <LabelList
                  dataKey="cost"
                  position="right"
                  formatter={(v: unknown) => formatCurrency(Number(v))}
                  style={{ fontSize: 12, fill: '#3a332d' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price editor */}
        <div className="mt-4 pt-4 border-t border-sand-100">
          <p className="text-xs font-medium text-sand-500 uppercase tracking-wider mb-2">Fuel Prices</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FUEL_DATA.map(fuel => (
              <div key={fuel.key} className="flex items-center gap-1">
                <label className="text-xs text-sand-600 truncate flex-1" title={fuel.name}>
                  {fuel.name.replace('Electric ', 'E-').replace('(Seasoned)', '')}
                </label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-sand-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-20 pl-4 pr-1 py-1 text-xs rounded border border-sand-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={Math.round((fuelPriceOverrides[fuel.key] ?? fuel.default_price) * 100) / 100}
                    onChange={e => handlePriceChange(fuel.key, Math.round((parseFloat(e.target.value) || 0) * 100) / 100)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
