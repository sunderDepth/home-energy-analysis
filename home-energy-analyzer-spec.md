# Home Energy Analyzer — Product Spec

## 1. Product Overview

A free, single-page web application that helps homeowners understand their home's energy profile by analyzing their actual utility bills against local weather data. Unlike existing calculators that use generic assumptions ("a typical 2,000 sq ft home in Maine"), this tool builds a custom thermal model of the user's specific building from their real consumption history.

### Core Value Propositions

- **Your data, your building**: Input actual fuel deliveries or utility bills and get a personalized energy model — not industry averages.
- **Multi-fuel support**: Handles homes with multiple energy sources (e.g., oil boiler + heat pumps, propane + electric), which is increasingly common as homeowners partially electrify.
- **Fuel cost comparison**: Once the model is built, project what the same heating/cooling load would cost with alternative fuels and systems.
- **Delivery forecasting**: For delivery fuels (oil, propane, pellets), predict when the next delivery will be needed based on weather forecasts and historical patterns.
- **No account, no backend**: Runs entirely in the browser. No login, no server, no data collection. Users export/import their data as JSON files.

### Target Audience

Homeowners in heating-dominant climates (New England focus initially) who are somewhat data-literate. They track their fuel deliveries, compare prices, and want to understand whether switching fuels or systems makes financial sense. The interface should be content-forward and informative rather than flashy — our audience appreciates seeing the math.

---

## 2. Architecture

### Technical Stack

- **Single-page static site**: HTML/CSS/JS (or a lightweight framework like React/Preact). No backend server.
- **Weather data**: Open-Meteo API (free, no API key required for basic use). Provides historical daily temperatures and 16-day forecasts via simple GET requests with lat/lon parameters.
- **Geocoding**: Open-Meteo geocoding API or a bundled static US zip code → lat/lon lookup table.
- **All computation client-side**: HDD/CDD calculation, linear regression, fuel equivalency math, delivery projection — all run in the browser.
- **Hosting**: Static files on any CDN (GitHub Pages, Netlify, Vercel, etc.). Zero operational cost.

### Data Flow

```
User enters zip code
  → Resolve to lat/lon (geocoding API or static lookup)
  → Fetch daily temperature history from Open-Meteo (1-5 years)
  → Calculate HDD and CDD arrays in browser

User enters fuel bills/deliveries
  → Normalize to common format: (start_date, end_date, quantity, unit)
  → Calculate energy content per period using fuel reference data
  → Regress energy against degree days for same periods

Output:
  → Base load (energy independent of weather)
  → Climate sensitivity (energy per degree day)
  → Cost comparisons across fuel types
  → Delivery forecast (for tank-based fuels)
```

---

## 3. Data Model

### 3.1 Universal Bill Record

Every fuel input — whether a propane delivery, a gas bill, or an electric bill — normalizes to this structure:

```typescript
interface BillRecord {
  start_date: string;      // ISO date (YYYY-MM-DD)
  end_date: string;        // ISO date (YYYY-MM-DD)
  quantity: number;        // Amount in native units
  unit: string;            // "gallons", "therms", "kWh", "tons", "cords"
  cost?: number;           // Total cost for this period (optional)
  price_per_unit?: number; // Unit price (optional, derived if cost provided)
}
```

**Ingestion behavior by fuel type:**

| Fuel Type | Input Pattern | How Intervals Are Derived |
|-----------|--------------|--------------------------|
| Oil, Propane, Pellets | Delivery dates + quantities | Consumption assumed between consecutive deliveries. First delivery has no prior reference — user may optionally provide a "start" tank level or the first interval is dropped. |
| Natural Gas | Billing period + therms used | Bill already defines the interval. |
| Electricity | Billing period + kWh used | Bill already defines the interval. |
| Cordwood | Delivery or usage estimate | Least precise — may offer simplified annual input. |

### 3.2 Fuel Source Configuration

Each fuel source the user adds has:

```typescript
interface FuelSource {
  id: string;                  // Unique ID
  fuel_type: FuelTypeKey;      // Key into reference table (e.g., "propane", "oil_2", "electricity")
  label: string;               // User-facing label (e.g., "Main oil boiler", "Heat pumps")
  input_mode: "delivery" | "billing"; // Determines UI for data entry
  system_efficiency?: number;  // Override default efficiency (0-1)
  system_capacity_btu?: number; // Optional: boiler/furnace input capacity in BTU/hr
  tank_capacity?: number;      // For delivery fuels: tank size in native units
  current_tank_level?: number; // For delivery fuels: estimated current level
  bills: BillRecord[];         // The actual consumption data
  purpose: "heating" | "cooling" | "both" | "all"; // What this fuel is used for
}
```

The `purpose` field matters for the regression:
- `"heating"` → regress against HDD only
- `"cooling"` → regress against CDD only
- `"both"` → regress against both HDD and CDD (e.g., a heat pump used year-round)
- `"all"` → electricity that covers heating, cooling, and base electrical load

### 3.3 Fuel Reference Table

Built-in reference data for all supported fuel types:

```typescript
interface FuelReference {
  key: string;
  name: string;
  unit: string;                    // Native unit ("gallon", "therm", "kWh", "ton", "cord")
  btu_per_unit: number;            // Gross energy content
  typical_system_efficiency: number; // Default AFUE/COP/HSPF (0-1 scale, >1 for heat pumps)
  co2_lbs_per_unit: number;        // Carbon emissions
  default_price?: number;          // Fallback price if user doesn't provide
}
```

**Initial fuel types to support:**

| Fuel | Unit | BTU/Unit | Typical Efficiency | CO2 (lbs/MMBtu) |
|------|------|----------|-------------------|-----------------|
| Fuel Oil #2 | Gallon | 138,500 | 0.83 | 161.3 |
| Propane | Gallon | 91,333 | 0.85 | 139.0 |
| Natural Gas | Therm | 100,000 | 0.90 | 117.0 |
| Wood Pellets (premium) | Ton | 16,400,000 | 0.83 | ~0 (carbon neutral) |
| Electricity (resistance) | kWh | 3,412 | 1.00 | Varies by grid |
| Electricity (heat pump) | kWh | 3,412 | 2.50 (COP) | Varies by grid |
| Cordwood (seasoned) | Cord | 20,000,000 | 0.60 | ~0 |
| Kerosene | Gallon | 135,000 | 0.80 | 159.5 |

Note: Heat pump efficiency is expressed as COP (Coefficient of Performance). A COP of 2.5 means 2.5 kWh of heat per 1 kWh of electricity consumed. COP varies significantly with outdoor temperature — an advanced feature could model this with a temperature-dependent COP curve rather than a flat average.

### 3.4 Session State (Export/Import)

The complete application state that gets saved/loaded:

```typescript
interface SessionState {
  version: string;               // App version for migration compatibility
  exported_at: string;           // ISO timestamp
  location: {
    zip_code: string;
    lat: number;
    lon: number;
    station_name?: string;       // Weather station used
  };
  degree_day_config: {
    heating_base_temp_f: number;   // Default: 65
    cooling_base_temp_f: number;   // Default: 65
    years_of_history: number;      // How many years of weather data were fetched
  };
  fuel_sources: FuelSource[];      // All fuel inputs
  weather_data_hash?: string;      // Hash of fetched weather data for staleness detection
  notes?: string;                  // Freeform user notes
}
```

**Export formats:**

- **JSON** (primary): Full round-trip fidelity. Drag-and-drop or file picker to re-import. The app validates on import and flags issues (missing fields, schema version mismatch, stale weather data).
- **CSV** (secondary): Export just the bill data for spreadsheet users. One CSV per fuel source. Not re-importable into the app (use JSON for that).

**Import behavior:**

- On import, the app rehydrates all state: location, fuel sources, bills, config.
- If the weather data hash doesn't match current data (or is older than 30 days), prompt: "Your weather data is from [date]. Refresh with current data?"
- Validate schema version. If the file is from an older app version, migrate transparently. If from a newer version, warn the user.

---

## 4. Core Analysis Engine

### 4.1 Degree Day Calculation

Performed client-side from daily temperature data fetched from Open-Meteo.

```
For each day:
  mean_temp = (daily_max + daily_min) / 2

  HDD = max(0, base_temp - mean_temp)
  CDD = max(0, mean_temp - base_temp)
```

Default base temperatures: 65°F for both HDD and CDD. Configurable in advanced mode.

Fetch daily temperature history for the user's location covering the full span of their bill data, plus the current year. Typically 1-5 years.

### 4.2 Aggregating Degree Days to Bill Periods

For each bill record, sum the daily HDD (and/or CDD) over the bill's date range:

```
bill_hdd = sum(daily_hdd for each day in [start_date, end_date))
bill_cdd = sum(daily_cdd for each day in [start_date, end_date))
bill_days = end_date - start_date  (number of days in period)
```

This gives us paired observations: (energy_consumed, degree_days, period_length) for each bill.

### 4.3 Regression Model

Simple linear regression of energy consumed against degree days:

```
energy = β₀ × days + β₁ × HDD   (heating-only fuel)
energy = β₀ × days + β₂ × CDD   (cooling-only fuel)
energy = β₀ × days + β₁ × HDD + β₂ × CDD   (dual-purpose, e.g., heat pump electricity)
```

Where:
- **β₀** = daily base load (energy per day independent of weather — hot water, cooking, always-on loads)
- **β₁** = heating sensitivity (energy per HDD — the building's thermal response to cold)
- **β₂** = cooling sensitivity (energy per CDD — the building's thermal response to heat)

Use ordinary least squares. Display R² so the user can gauge model quality.

**Units**: The regression operates in the fuel's native units (gallons, therms, kWh). Conversion to common energy units (BTU, kWh-thermal) happens at the comparison/display layer.

**Edge cases:**
- If the user only has one fuel source used for heating, this is a simple two-variable regression (base load + HDD slope).
- If R² is very low, surface a message: "Your energy use doesn't correlate well with weather. This could mean significant non-climate loads, inconsistent occupancy, or data entry issues."
- If β₀ is negative (which is non-physical), clamp to zero and note it.

### 4.4 Derived Metrics

From the regression, compute and display:

| Metric | Formula | What It Tells The User |
|--------|---------|----------------------|
| Annual base load | β₀ × 365 | Energy used regardless of weather (hot water, etc.) |
| Annual climate load | β₁ × annual_HDD (or β₂ × annual_CDD) | Energy driven by heating/cooling |
| Total annual energy | Base + climate load | Full year projection |
| Annual cost | Total energy × price per unit | What they're spending |
| Effective efficiency | Delivered heat ÷ fuel energy input | How well their system converts fuel to useful heat |
| Cost per delivered MMBtu | Annual cost ÷ (annual energy × efficiency × BTU/unit ÷ 1,000,000) | Normalized cost of useful heat |

### 4.5 Fuel Cost Comparison

Using the model's annual heating load (in BTU of delivered heat), calculate what that same load would cost with every fuel in the reference table:

```
For each alternative fuel:
  fuel_quantity_needed = annual_heat_demand_btu / (btu_per_unit × system_efficiency)
  annual_cost = fuel_quantity_needed × price_per_unit
```

Allow the user to override prices for any fuel to reflect their actual local costs.

### 4.6 Multi-Fuel Aggregation

When the user has multiple fuel sources:

- Run regression independently for each fuel source.
- The total building heating demand = sum of climate-driven loads across all heating fuels.
- The total base load = sum of base loads (though the user should understand that electricity base load includes non-heating uses).
- For the fuel comparison output, use the combined heating demand as the basis.

**Example**: User has oil boiler (primary) + heat pumps (supplemental). The oil regression shows 800 gallons/year climate-driven. The electricity regression shows 3,000 kWh/year climate-driven (from the heat pump). Combined heating demand = (800 gal × 138,500 BTU × 0.83 efficiency) + (3,000 kWh × 3,412 BTU × 2.5 COP) = ~117 MMBtu. Now we can ask: what would it cost to meet that 117 MMBtu entirely with pellets? Entirely with a heat pump? Etc.

---

## 5. Delivery Forecast Feature

### 5.1 Concept

For delivery fuels (oil, propane, pellets), the app estimates when the user's tank will reach a threshold level, based on projected consumption.

### 5.2 Inputs

- Current tank level (user enters as gallons, percentage, or "last delivery was X gallons on Y date")
- Tank capacity (from fuel source config)
- Delivery threshold (default: 25% of tank, configurable — "schedule delivery when tank reaches ___ gallons")

### 5.3 Projection Method

1. **Near-term (next 16 days)**: Use Open-Meteo's weather forecast to compute expected HDD/day.
2. **Beyond 16 days**: Use historical average HDD for each calendar day (computed from the multi-year temperature history already fetched).
3. **Daily consumption estimate**: base_load_per_day + (sensitivity × expected_daily_HDD)
4. **Cumulative draw-down**: Starting from current tank level, subtract daily consumption until the threshold is reached.
5. **Output**: "Estimated delivery needed by [date]" with a confidence note explaining the blend of forecast and historical averages.

### 5.4 Display

A time-series chart showing:
- Solid line: actual historical tank level (inferred from delivery history)
- Dashed line: projected tank level going forward
- Shaded band: uncertainty range (e.g., +/- 1 standard deviation of historical HDD variability)
- Horizontal line: delivery threshold
- Annotation: "Schedule delivery by approximately [date]"

---

## 6. Input UX

### 6.1 Progressive Disclosure Flow

The app should be usable with minimal input and get more powerful as the user provides more data.

**Level 1 — Quick Estimate (no bill data)**:
- Zip code
- Fuel type
- Annual fuel cost OR annual fuel quantity
- → Show a rough fuel comparison based on local degree days and averages

**Level 2 — Detailed Analysis (bill data)**:
- Add delivery dates and quantities (or billing periods and consumption)
- → Run the full regression, show base load vs. climate load, R², and detailed comparisons

**Level 3 — Advanced / Multi-Fuel**:
- Add additional fuel sources
- Override system efficiencies, base temperatures, prices
- Enable delivery forecasting with tank configuration
- View regression diagnostics

### 6.2 Bill Entry UI

**For delivery fuels** (oil, propane, pellets):

A table with columns:
| Date | Quantity (gal) | Price/gal | Total Cost |
|------|---------------|-----------|------------|

- User enters delivery date and gallons. Price and total cost are optional (either can be derived from the other).
- The app automatically calculates consumption intervals between deliveries.
- The first row should include a note: "Consumption before your first delivery can't be calculated — we'll start the analysis from your second delivery onward."

**For metered fuels** (natural gas, electricity):

A table with columns:
| Bill Start | Bill End | Usage (therms/kWh) | Cost |
|------------|----------|--------------------|----|

- User enters the billing period dates and consumption. These are typically printed on every utility bill.

**Common to both**:
- Support paste-from-spreadsheet (tab-delimited) so users can paste from their fuel company's portal or their own tracking spreadsheet.
- Support manual row add/delete.
- Basic validation: dates should be chronological, quantities should be positive, warn on apparent outliers (e.g., a delivery 10x the average).

### 6.3 Advanced Mode Toggle

A toggle (or expandable section) that reveals:
- Heating/cooling base temperature overrides (default 65°F)
- System efficiency override per fuel source
- Boiler/furnace capacity (BTU/hr input)
- Tank size and current level (for delivery forecast)
- Thermostat set point
- Number of years of weather history to use
- Regression diagnostics (R², coefficients, residual plot)

---

## 7. Output UX

### 7.1 Primary Results Panel

After the user enters data and the regression runs:

**Summary Cards** (always visible):
- Annual heating cost (current fuel): "$X,XXX"
- Base load vs. climate load split (as a simple bar or donut)
- Model quality: "Good fit" / "Fair fit" / "Poor fit" with R² shown on hover or in advanced mode

**Fuel Cost Comparison Chart**:
- Horizontal bar chart showing annual cost for each fuel type, sorted cheapest to most expensive.
- The user's current fuel is highlighted.
- Each bar labeled with the annual cost and fuel quantity needed.
- Prices shown are editable — user can click to update with their actual local price.

**What-If Savings**:
- "Switching from [current fuel] to [cheapest alternative] could save ~$X,XXX/year"
- Note about capital cost considerations: "This doesn't include equipment costs. A [system type] typically costs $X,000-$X,000 installed."

### 7.2 Energy Profile Chart

A scatter plot showing:
- X-axis: HDD (or CDD) for each billing period
- Y-axis: Energy consumed (in native units) for each period
- Regression line overlaid
- Each point labeled (or on hover) with the date range

This is the "nerd mode" chart that validates the model visually. Users who understand regression will immediately see if the fit is good or if there are outliers.

### 7.3 Delivery Forecast Panel

(Only shown for delivery fuels when tank info is provided)

- The tank drawdown chart described in Section 5.4.
- Plain-language summary: "Based on your usage and current weather forecasts, you'll want to schedule a delivery around [date]."
- Toggle between "forecast-based" and "historical average" projections.

### 7.4 Advanced / Diagnostic Panel

Expandable section showing:
- Regression coefficients (β₀, β₁, β₂) with plain-language labels
- R² and residual standard error
- Residual plot (residuals vs. fitted values)
- Degree day summary by month/year
- Raw data table with computed HDD/CDD per billing period

---

## 8. Export / Import

### 8.1 Export

Two export options, accessible from a persistent "Save/Load" button:

**Export as JSON** (primary):
- Saves the complete `SessionState` object.
- Filename convention: `energy-analysis-[zip]-[date].json`
- Includes a `version` field for future schema migration.
- Includes a `weather_data_hash` so the app can detect stale data on re-import.

**Export as CSV** (secondary):
- One CSV per fuel source, with columns matching the bill entry table.
- Useful for users who want to take their data into Excel or Google Sheets.
- Not re-importable into the app.

### 8.2 Import

- Drag-and-drop zone or file picker accepting `.json` files.
- On import:
  1. Validate schema version. Migrate if older. Warn if newer.
  2. Rehydrate all state: location, fuel sources, bills, config.
  3. Check `weather_data_hash` against fresh data. If stale (or >30 days old), prompt: "Your weather data was fetched on [date]. Refresh?"
  4. If weather data is refreshed, re-run regressions automatically.
  5. Surface any validation issues: "2 bill records had dates out of order — please review."

---

## 9. Design Principles

### Content-Forward
- The UI should feel like a well-designed analytical tool, not a marketing landing page. Prioritize information density over whitespace.
- Use clear typography, minimal decoration. Think Bloomberg Terminal sensibility adapted for consumers, not a SaaS onboarding wizard.
- Labels and explanations should be concise but present. Don't hide useful context behind tooltips — put it inline where space allows.

### Progressive Complexity
- The default view should be approachable for anyone who can read a utility bill.
- Advanced features (regression diagnostics, base temp overrides, multi-fuel aggregation) are available but not in the way.
- The "advanced" toggle should feel like unlocking a richer view, not entering a different app.

### Responsive and Performant
- Must work well on mobile — many users will enter data from their phone while looking at a paper bill.
- Bill entry tables should be usable on small screens (consider a card-based layout on mobile vs. table on desktop).
- All computation is client-side — no loading spinners for server round-trips. The only async operation is fetching weather data from Open-Meteo.

### Transparent
- Show the math. Not everyone will look, but those who do should be able to verify every number.
- Link to methodology explanations where appropriate (what are degree days, how the regression works, what efficiency means).
- No black boxes.

### Privacy-Respecting
- No analytics, no tracking, no cookies (or only strictly functional ones).
- User data never leaves the browser except via explicit export.
- State clearly on the page: "Your data stays in your browser. We don't collect or store anything."

---

## 10. Reference Data Sources

| Data | Source | Access Method |
|------|--------|--------------|
| Daily temperature history | Open-Meteo Historical Weather API | Free, no key. GET request with lat/lon/date range. |
| 16-day weather forecast | Open-Meteo Forecast API | Free, no key. GET request with lat/lon. |
| Zip code → lat/lon | Open-Meteo Geocoding API or bundled static lookup | Free API or ~40KB static JSON. |
| Fuel energy content | ASHRAE / DOE reference values | Bundled in app as static reference table. |
| Fuel prices | EIA State Energy Data System (SEDS) | Could fetch dynamically or bundle regional defaults. User can override. |
| CO2 emission factors | EPA eGRID (for electricity), EIA (for fossil fuels) | Bundled as static reference data. |

---

## 11. Future Considerations (Out of Scope for V1)

These are features worth designing toward but not building initially:

- **Temperature-dependent heat pump COP curve**: Model heat pump efficiency as a function of outdoor temp rather than a flat COP.
- **Time-of-use electricity pricing**: For users on TOU rates, model cost based on when heating/cooling load falls.
- **Weatherization ROI**: If the user can see their energy-per-HDD is high, suggest insulation improvements and estimate payback.
- **State/utility rebate integration**: Pull in available incentives (like Efficiency Maine rebates) for system upgrades.
- **Multi-year trend analysis**: Show whether the building's thermal performance is changing over time (degrading insulation, etc.).
- **PDF bill import via OCR**: Let users upload photos of utility bills and extract data automatically.
- **Shareable links**: Encode session state in a URL hash for sharing (if data is small enough).
