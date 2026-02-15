# Implementation Plan — Home Energy Analyzer

## Current Status

**Phase**: V1 complete, deployed, tested
**Last updated**: 2026-02-15
**Deployed at**: Netlify (connected to GitHub `main` branch)

## Completed

- [x] Decide on framework → React 19 + Vite 7 + TypeScript 5.9
- [x] Set up project structure and build tooling
- [x] Implement core data structures (TypeScript interfaces)
- [x] Build weather API integration (Open-Meteo historical + forecast)
- [x] Implement degree day calculation engine
- [x] Build bill entry UI (billing + delivery modes, paste support)
- [x] Implement regression engine (2-var and 3-var OLS)
- [x] Build results display (summary cards, energy profile chart, fuel comparison)
- [x] Add export/import functionality (JSON round-trip, CSV export)
- [x] Delivery forecast feature (tank drawdown projection with uncertainty bands)
- [x] Top-line findings component (plain-language summary)
- [x] Explicit "Run Analysis" button with data staleness indicator
- [x] Fix floating-point price display artifacts
- [x] Fix date picker updating wrong row (removed memo, reverse sort)
- [x] Fix delivery-to-interval conversion for regression
- [x] Fix geocoding returning non-US results
- [x] Fix import: close modal, sync zip input, skip false date-order warnings
- [x] Set up Vitest test suite (92 tests across 8 files)
- [x] Netlify deployment configuration

## Next Steps / Future Work

- [ ] Temperature-dependent heat pump COP curves
- [ ] Time-of-use electricity pricing
- [ ] Weatherization ROI calculations
- [ ] PDF/OCR bill import
- [ ] Code-split Recharts for smaller initial bundle

## Session Notes

### 2026-02-14 — Session 1
- Set up repo, linked to GitHub
- Created project documentation structure

### 2026-02-15 — Session 2
- One-shot V1 implementation (38 source files)
- Bug fixes: price rounding, date picker, delivery conversion, analysis trigger
- Added TopLineFindings, Run Analysis button, staleness indicator
- Fixed geocoding (filter to US results)
- Fixed import flow (close modal, sync zip, false warnings)
- Set up Netlify deployment
- Added Vitest test suite: 92 tests covering engine, utils, validation
- Updated project documentation
