# Claude Instructions — Home Energy Analyzer

## Session Protocol

### Starting Every Session
1. Read this file (`claude-instructions.md`)
2. Read the spec (`home-energy-analyzer-spec.md`)
3. Read `PLAN.md` if it exists — this tracks current implementation status
4. Check `git log --oneline -10` and `git status` to understand recent work
5. Ask: "Where did we leave off?" if unclear

### During Work
- **Run tests before every commit**: `npm run test` must pass. All 92+ tests green before pushing.
- **Commit frequently**: After completing any logical unit of work, commit and push. Don't let work accumulate.
- **Update docs as you go**: If you learn something new about my preferences, the codebase, or decisions we've made, update this file immediately.
- **Keep PLAN.md current**: Mark completed tasks, add new tasks discovered during implementation, note blockers or open questions.
- **Write tests for new engine/utility code**: Any new pure function in `src/engine/` or `src/utils/` should have a co-located `.test.ts` file.

### Ending a Session
Before I close the window, remind me to let you:
1. Commit and push any pending work
2. Update `PLAN.md` with current status and next steps
3. Update this file with any new learnings

### Key Files
| File | Purpose |
|------|---------|
| `claude-instructions.md` | This file. Living doc of project context, decisions, and preferences. |
| `home-energy-analyzer-spec.md` | Product spec. Source of truth for requirements. |
| `PLAN.md` | Implementation plan with task status. Where to pick up. |
| `netlify.toml` | Netlify build config (fresh `npm install` + `npm run build`, publishes `dist/`). |
| `src/engine/*.test.ts` | Unit tests for core engine (stats, degree-days, regression, fuel-comparison, delivery-forecast). |
| `src/utils/*.test.ts` | Unit tests for formatting and hashing utilities. |
| `src/components/io/ImportValidator.test.ts` | Unit tests for JSON import validation. |

---

## Project Overview

Single-page, client-side web app that helps homeowners analyze energy usage by correlating their actual utility bills with local weather data. No backend, no accounts — runs entirely in the browser with data export/import via JSON.

## Core Technical Decisions

- **Stack**: React 19 + Vite 7 + TypeScript 5.9
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin and `@theme` design tokens
- **Charts**: Recharts 3
- **Testing**: Vitest 4 (92 tests across 8 files)
- **Weather API**: Open-Meteo (free, no API key required)
- **Hosting**: Netlify (auto-deploys from `main` branch)
- **Data persistence**: Browser-only, export/import as JSON files

## Key Data Structures

### BillRecord
```typescript
interface BillRecord {
  start_date: string;      // ISO date
  end_date: string;        // ISO date
  quantity: number;        // Native units (gallons, therms, kWh)
  unit: string;
  cost?: number;
  price_per_unit?: number;
}
```

### FuelSource
- Supports delivery-based (oil, propane, pellets) and billing-based (gas, electricity) fuels
- `purpose` field: "heating" | "cooling" | "both" | "all"
- Optional tank tracking for delivery forecast feature

## Analysis Engine

1. **Degree Days**: HDD = max(0, 65 - mean_temp), CDD = max(0, mean_temp - 65)
2. **Regression**: energy = β₀ × days + β₁ × HDD [+ β₂ × CDD]
   - β₀ = daily base load
   - β₁ = heating sensitivity (energy per HDD)
   - β₂ = cooling sensitivity (energy per CDD)
3. **Fuel comparison**: Convert heating load to BTU, then to each alternative fuel accounting for efficiency

## Supported Fuels (V1)

| Fuel | Unit | BTU/Unit | Default Efficiency |
|------|------|----------|-------------------|
| Fuel Oil #2 | Gallon | 138,500 | 0.83 |
| Propane | Gallon | 91,333 | 0.85 |
| Natural Gas | Therm | 100,000 | 0.90 |
| Wood Pellets | Ton | 16,400,000 | 0.83 |
| Electricity (resistance) | kWh | 3,412 | 1.00 |
| Electricity (heat pump) | kWh | 3,412 | 2.50 (COP) |
| Cordwood | Cord | 20,000,000 | 0.60 |
| Kerosene | Gallon | 135,000 | 0.80 |

## UX Principles

- **Content-forward**: Information-dense, show the math, minimal decoration
- **Progressive disclosure**: Quick estimate → detailed analysis → advanced/multi-fuel
- **Mobile-friendly**: Bill entry must work on phones
- **Transparent**: All calculations visible and verifiable
- **Privacy-first**: No analytics, no tracking, explicit "data never leaves your browser" messaging

## Key Features

1. **Fuel cost comparison**: Bar chart showing annual cost by fuel type
2. **Energy profile chart**: Scatter plot of consumption vs. degree days with regression line
3. **Delivery forecast** (for tank fuels): Predict next delivery date based on weather forecast + historical patterns
4. **Multi-fuel support**: Handle homes with multiple heating sources (e.g., oil + heat pumps)
5. **Export/Import**: Full state as JSON, bills as CSV

## Out of Scope (V1)

- Temperature-dependent heat pump COP curves
- Time-of-use electricity pricing
- Weatherization ROI calculations
- Rebate/incentive integration
- PDF/OCR bill import
- Shareable URL links

## Development Notes

- Weather data is the only async operation (Open-Meteo fetch)
- First delivery in a series has no consumption interval — drop or let user provide starting tank level
- Clamp negative base load (β₀) to zero
- Show R² so users can gauge model quality
- Validate imported JSON schema version and offer migration

---

## User Preferences & Learnings

- **Aesthetic**: Clean, warm, approachable — inspired by Rewiring America energy calculators. Not a Bloomberg terminal, not overly "lickable" either.
- **Analysis trigger**: Explicit "Run Analysis" button, not auto-run. Show staleness banner ("Data changed — re-run?") when data changes after analysis.
- **Row ordering**: Newest-first (reverse chronological) with row numbers.
- **Plain language first**: Top-line findings in natural language before charts/data. The "answer" should be obvious.
- **Import UX**: Close the modal on successful import. Don't show false warnings for delivery-mode date ordering.
- **npm registry**: Local machine uses a private Nexus registry. The `.npmrc` in the repo pins `registry.npmjs.org` for CI. When regenerating `package-lock.json`, always use `--registry https://registry.npmjs.org/`.
