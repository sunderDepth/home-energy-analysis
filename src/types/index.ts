export type FuelTypeKey =
  | 'oil_2'
  | 'propane'
  | 'natural_gas'
  | 'wood_pellets'
  | 'electricity_resistance'
  | 'electricity_heat_pump'
  | 'cordwood'
  | 'kerosene';

export type FuelPurpose = 'heating' | 'cooling' | 'both' | 'all';
export type InputMode = 'delivery' | 'billing';

export interface BillRecord {
  id: string;
  start_date: string; // ISO date YYYY-MM-DD
  end_date: string;
  quantity: number;
  unit: string;
  cost?: number;
  price_per_unit?: number;
}

export interface FuelSource {
  id: string;
  fuel_type: FuelTypeKey;
  label: string;
  input_mode: InputMode;
  system_efficiency?: number;
  system_capacity_btu?: number;
  tank_capacity?: number;
  current_tank_level?: number;
  delivery_threshold?: number; // gallons at which to schedule delivery
  bills: BillRecord[];
  purpose: FuelPurpose;
}

export interface FuelReference {
  key: FuelTypeKey;
  name: string;
  unit: string;
  unit_plural: string;
  btu_per_unit: number;
  typical_system_efficiency: number;
  co2_lbs_per_mmbtu: number;
  default_price: number;
  input_mode: InputMode;
}

export interface DegreeDayConfig {
  heating_base_temp_f: number;
  cooling_base_temp_f: number;
  years_of_history: number;
}

export interface DailyTemp {
  date: string; // ISO date
  temp_max_f: number;
  temp_min_f: number;
}

export interface DailyDegreeDay {
  date: string;
  hdd: number;
  cdd: number;
  mean_temp: number;
}

export interface AggregatedDegreeDays {
  hdd: number;
  cdd: number;
  days: number;
}

export interface BillWithDegreeDays {
  bill: BillRecord;
  hdd: number;
  cdd: number;
  days: number;
  energy: number; // quantity from the bill
}

export interface RegressionResult {
  beta0: number; // daily base load
  beta1: number; // heating sensitivity (per HDD)
  beta2: number | null; // cooling sensitivity (per CDD), null if not applicable
  r_squared: number;
  residuals: number[];
  fitted_values: number[];
  observations: BillWithDegreeDays[];
  annual_base_load: number;
  annual_heating_load: number;
  annual_cooling_load: number;
  annual_total: number;
}

export interface FuelComparisonEntry {
  fuel: FuelReference;
  quantity_needed: number;
  annual_cost: number;
  price_per_unit: number;
  is_current: boolean;
}

export interface TankLevelPoint {
  date: string;
  level: number;
  level_low?: number;
  level_high?: number;
  is_projected: boolean;
}

export interface DeliveryForecastResult {
  points: TankLevelPoint[];
  estimated_delivery_date: string | null;
  days_until_delivery: number | null;
}

export interface LocationData {
  zip_code: string;
  lat: number;
  lon: number;
  name: string;
}

export interface WeatherData {
  daily_temps: DailyTemp[];
  forecast_temps: DailyTemp[];
  fetched_at: string; // ISO timestamp
  hash: string;
}

export interface SessionState {
  version: string;
  exported_at: string;
  location: LocationData | null;
  degree_day_config: DegreeDayConfig;
  fuel_sources: FuelSource[];
  weather_data_hash?: string;
  notes?: string;
}

export interface QuickEstimate {
  fuel_type: FuelTypeKey;
  annual_cost?: number;
  annual_quantity?: number;
}
