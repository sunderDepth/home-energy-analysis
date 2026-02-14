import { useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { formatNumber } from '../../utils/format.ts';
import type { DailyDegreeDay } from '../../types/index.ts';

interface DegreeDayTableProps {
  daily: DailyDegreeDay[];
}

interface MonthData {
  year: number;
  month: number;
  label: string;
  hdd: number;
  cdd: number;
  avgTemp: number;
  days: number;
}

export function DegreeDayTable({ daily }: DegreeDayTableProps) {
  const monthlyData = useMemo(() => {
    const groups = new Map<string, { hdd: number; cdd: number; temps: number[]; days: number }>();

    for (const d of daily) {
      const key = d.date.slice(0, 7); // YYYY-MM
      const existing = groups.get(key) ?? { hdd: 0, cdd: 0, temps: [], days: 0 };
      existing.hdd += d.hdd;
      existing.cdd += d.cdd;
      existing.temps.push(d.mean_temp);
      existing.days++;
      groups.set(key, existing);
    }

    const months: MonthData[] = [];
    for (const [key, data] of groups) {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const date = new Date(year, month - 1);
      months.push({
        year,
        month,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        hdd: data.hdd,
        cdd: data.cdd,
        avgTemp: data.temps.reduce((a, b) => a + b, 0) / data.temps.length,
        days: data.days,
      });
    }

    return months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [daily]);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-sand-900">Degree Day Summary</h3>
        <p className="text-sm text-sand-500 mt-0.5">Monthly breakdown of heating and cooling degree days</p>
      </CardHeader>
      <CardBody className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-xs font-medium text-sand-500 uppercase tracking-wider border-b border-sand-100">
              <th className="pb-2 pr-4">Month</th>
              <th className="pb-2 pr-4 text-right">Avg Temp</th>
              <th className="pb-2 pr-4 text-right">HDD</th>
              <th className="pb-2 text-right">CDD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-50">
            {monthlyData.map(m => (
              <tr key={m.label}>
                <td className="py-1.5 pr-4 text-sand-700">{m.label}</td>
                <td className="py-1.5 pr-4 text-right font-mono text-sand-600">{formatNumber(m.avgTemp, 1)}°F</td>
                <td className="py-1.5 pr-4 text-right font-mono text-sand-800">{formatNumber(m.hdd, 0)}</td>
                <td className="py-1.5 text-right font-mono text-sand-800">{formatNumber(m.cdd, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
