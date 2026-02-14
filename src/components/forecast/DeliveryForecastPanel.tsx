import { useMemo } from 'react';
import { useAppState } from '../../state/app-context.tsx';
import { useDegreeDays, useRegression } from '../../state/hooks.ts';
import { projectDelivery, reconstructTankHistory } from '../../engine/delivery-forecast.ts';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { TankLevelChart } from './TankLevelChart.tsx';
import { formatDate } from '../../utils/format.ts';
import type { FuelSource, TankLevelPoint } from '../../types/index.ts';

interface DeliveryForecastPanelProps {
  fuelSource: FuelSource;
}

export function DeliveryForecastPanel({ fuelSource }: DeliveryForecastPanelProps) {
  const { weatherData, degreeDayConfig } = useAppState();
  const daily = useDegreeDays();
  const regression = useRegression(fuelSource);

  const forecast = useMemo(() => {
    if (
      !regression ||
      !weatherData ||
      !fuelSource.tank_capacity ||
      fuelSource.current_tank_level == null
    ) {
      return null;
    }

    // Get historical tank levels
    const deliveries = fuelSource.bills
      .filter(b => b.end_date && b.quantity > 0)
      .map(b => ({ date: b.end_date, quantity: b.quantity }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const historicalPoints = deliveries.length >= 2
      ? reconstructTankHistory(
          deliveries,
          fuelSource.tank_capacity,
          regression.beta0,
          regression.beta1,
          daily,
        )
      : [];

    // Project forward
    const projection = projectDelivery(
      fuelSource.current_tank_level,
      fuelSource.tank_capacity,
      fuelSource.delivery_threshold,
      regression.beta0,
      regression.beta1,
      daily,
      weatherData.forecast_temps,
      degreeDayConfig.heating_base_temp_f,
    );

    return {
      historicalPoints,
      projection,
    };
  }, [regression, weatherData, fuelSource, daily, degreeDayConfig.heating_base_temp_f]);

  if (!forecast) return null;

  const { projection, historicalPoints } = forecast;
  const allPoints: TankLevelPoint[] = [...historicalPoints, ...projection.points];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sand-900">Delivery Forecast</h3>
            <p className="text-sm text-sand-500 mt-0.5">{fuelSource.label}</p>
          </div>
          {projection.estimated_delivery_date && (
            <Badge variant={projection.days_until_delivery! < 14 ? 'danger' : projection.days_until_delivery! < 30 ? 'warning' : 'success'}>
              {projection.days_until_delivery! < 14
                ? 'Order soon'
                : `~${projection.days_until_delivery} days`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {projection.estimated_delivery_date ? (
          <p className="text-sm text-sand-700 mb-4">
            Based on your usage and weather forecast, schedule a delivery by approximately{' '}
            <span className="font-semibold text-sand-900">{formatDate(projection.estimated_delivery_date)}</span>.
          </p>
        ) : (
          <p className="text-sm text-sand-700 mb-4">
            Your current supply should last beyond the forecast window.
          </p>
        )}

        <TankLevelChart
          points={allPoints}
          tankCapacity={fuelSource.tank_capacity!}
          threshold={fuelSource.delivery_threshold ?? fuelSource.tank_capacity! * 0.25}
        />

        <p className="text-xs text-sand-400 mt-3">
          Solid line = historical (estimated from deliveries). Dashed line = projected.
          Shaded area = uncertainty range based on historical weather variability.
        </p>
      </CardBody>
    </Card>
  );
}
