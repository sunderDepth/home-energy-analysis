import type {
  LocationData,
  WeatherData,
  FuelSource,
  BillRecord,
  DegreeDayConfig,
  SessionState,
  QuickEstimate,
} from '../types/index.ts';

export interface AppState {
  location: LocationData | null;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  fuelSources: FuelSource[];
  degreeDayConfig: DegreeDayConfig;
  quickEstimate: QuickEstimate | null;
  advancedMode: boolean;
  fuelPriceOverrides: Record<string, number>;
  dataVersion: number;      // incremented on any data mutation
  analysisVersion: number;  // set to dataVersion when user clicks "Run Analysis"
}

export const initialState: AppState = {
  location: null,
  weatherData: null,
  weatherLoading: false,
  weatherError: null,
  fuelSources: [],
  degreeDayConfig: {
    heating_base_temp_f: 65,
    cooling_base_temp_f: 65,
    years_of_history: 3,
  },
  quickEstimate: null,
  advancedMode: false,
  fuelPriceOverrides: {},
  dataVersion: 0,
  analysisVersion: -1,
};

export type AppAction =
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'SET_WEATHER_DATA'; payload: WeatherData }
  | { type: 'SET_WEATHER_LOADING'; payload: boolean }
  | { type: 'SET_WEATHER_ERROR'; payload: string | null }
  | { type: 'ADD_FUEL_SOURCE'; payload: FuelSource }
  | { type: 'UPDATE_FUEL_SOURCE'; payload: FuelSource }
  | { type: 'REMOVE_FUEL_SOURCE'; payload: string }
  | { type: 'ADD_BILL'; payload: { fuelSourceId: string; bill: BillRecord } }
  | { type: 'UPDATE_BILL'; payload: { fuelSourceId: string; bill: BillRecord } }
  | { type: 'REMOVE_BILL'; payload: { fuelSourceId: string; billId: string } }
  | { type: 'SET_BILLS'; payload: { fuelSourceId: string; bills: BillRecord[] } }
  | { type: 'SET_DEGREE_DAY_CONFIG'; payload: Partial<DegreeDayConfig> }
  | { type: 'SET_QUICK_ESTIMATE'; payload: QuickEstimate | null }
  | { type: 'SET_ADVANCED_MODE'; payload: boolean }
  | { type: 'SET_FUEL_PRICE_OVERRIDE'; payload: { key: string; price: number } }
  | { type: 'IMPORT_SESSION'; payload: SessionState & { weatherData?: WeatherData } }
  | { type: 'RUN_ANALYSIS' }
  | { type: 'RESET' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload, weatherData: null, weatherError: null };

    case 'SET_WEATHER_DATA':
      return { ...state, weatherData: action.payload, weatherLoading: false, weatherError: null };

    case 'SET_WEATHER_LOADING':
      return { ...state, weatherLoading: action.payload };

    case 'SET_WEATHER_ERROR':
      return { ...state, weatherError: action.payload, weatherLoading: false };

    case 'ADD_FUEL_SOURCE':
      return { ...state, fuelSources: [...state.fuelSources, action.payload], dataVersion: state.dataVersion + 1 };

    case 'UPDATE_FUEL_SOURCE':
      return {
        ...state,
        dataVersion: state.dataVersion + 1,
        fuelSources: state.fuelSources.map(fs =>
          fs.id === action.payload.id ? action.payload : fs
        ),
      };

    case 'REMOVE_FUEL_SOURCE':
      return {
        ...state,
        dataVersion: state.dataVersion + 1,
        fuelSources: state.fuelSources.filter(fs => fs.id !== action.payload),
      };

    case 'ADD_BILL': {
      return {
        ...state,
        dataVersion: state.dataVersion + 1,
        fuelSources: state.fuelSources.map(fs =>
          fs.id === action.payload.fuelSourceId
            ? { ...fs, bills: [...fs.bills, action.payload.bill] }
            : fs
        ),
      };
    }

    case 'UPDATE_BILL': {
      return {
        ...state,
        dataVersion: state.dataVersion + 1,
        fuelSources: state.fuelSources.map(fs =>
          fs.id === action.payload.fuelSourceId
            ? {
                ...fs,
                bills: fs.bills.map(b =>
                  b.id === action.payload.bill.id ? action.payload.bill : b
                ),
              }
            : fs
        ),
      };
    }

    case 'REMOVE_BILL': {
      return {
        ...state,
        dataVersion: state.dataVersion + 1,
        fuelSources: state.fuelSources.map(fs =>
          fs.id === action.payload.fuelSourceId
            ? { ...fs, bills: fs.bills.filter(b => b.id !== action.payload.billId) }
            : fs
        ),
      };
    }

    case 'SET_BILLS': {
      return {
        ...state,
        dataVersion: state.dataVersion + 1,
        fuelSources: state.fuelSources.map(fs =>
          fs.id === action.payload.fuelSourceId
            ? { ...fs, bills: action.payload.bills }
            : fs
        ),
      };
    }

    case 'SET_DEGREE_DAY_CONFIG':
      return {
        ...state,
        degreeDayConfig: { ...state.degreeDayConfig, ...action.payload },
      };

    case 'SET_QUICK_ESTIMATE':
      return { ...state, quickEstimate: action.payload };

    case 'SET_ADVANCED_MODE':
      return { ...state, advancedMode: action.payload };

    case 'SET_FUEL_PRICE_OVERRIDE':
      return {
        ...state,
        fuelPriceOverrides: {
          ...state.fuelPriceOverrides,
          [action.payload.key]: action.payload.price,
        },
      };

    case 'IMPORT_SESSION': {
      const session = action.payload;
      return {
        ...state,
        location: session.location,
        weatherData: session.weatherData ?? null,
        fuelSources: session.fuel_sources,
        degreeDayConfig: session.degree_day_config,
        quickEstimate: null,
        dataVersion: state.dataVersion + 1,
        analysisVersion: -1,
      };
    }

    case 'RUN_ANALYSIS':
      return { ...state, analysisVersion: state.dataVersion };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}
