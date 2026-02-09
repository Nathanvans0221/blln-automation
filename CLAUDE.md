# BLN Data Sync — CLAUDE.md

## What This Project Is

A React web app that converts **Agroware Arc Flow** production data into **PRODUCE**-ready import files for Bell Nursery (BLN). It ports the VBA macro logic from Excel into a browser-based 4-step pipeline wizard.

**Live URL:** https://blln-automation.vercel.app
**GitHub:** `Nathanvans0221/blln-automation`
**Deploy:** `npx vercel --prod` (not auto-deploy — must run manually)

## Tech Stack

- React 19 + TypeScript + Vite 7
- MUI v7 (Material UI)
- `xlsx` library for Excel parsing and export
- Vercel hosting

## Theme

PRODUCE orange theme defined in `src/theme/produceTheme.ts`:
- `PRODUCE_COLORS.primary` = `#DB6E14` (orange)
- `PRODUCE_COLORS.primaryDark` = `#A34900`
- `PRODUCE_COLORS.primaryLight` = `#F4D3B8`
- `PRODUCE_COLORS.background` = `#FFF3E5`
- `PRODUCE_COLORS.darkGray` = `#3F4948`
- Font: Montserrat

## Pipeline Flow

### Step 1: Upload
User drops 4 required Arc Flow CSV exports + optional 4M Variant Mixes Excel:
- `ProductionScheme` — scheme codes, genus mappings
- `ProductionSchemeLine` — phases, durations, quantities
- `ProductionSchemeLinePeriod` — period breakdowns per phase
- `ProductionPreferences` — item/variant/location/scheme assignments
- `4M Variant Mixes (Excel)` — optional, weekly mix percentages

### Step 2: Validate
Parses all files, runs 15+ data quality checks (orphan references, missing data, duplicates, coverage gaps), scores quality 0-100, shows data preview tables.

### Step 3: Transform
Runs the ported VBA logic:
- `buildSchemeDictionary()` — converts scheme lines + periods into week-based rules
- `generateCatalogs()` — unique genus+series+color from preferences (series=productionItemNo, color=variantCode)
- `generateRecipes()` — one recipe per preference row, linked to catalog
- `generateEvents()` — space events from scheme rules per recipe
- `generateSpecs()` — space specs from scheme line quantities
- `generateMixes()` — mix breakout from 4M Excel (if provided)

### Step 4: Results
Tabbed data tables (Catalogs, Recipes, Events, Specs, Mixes) with sort/search/pagination, export as single Excel workbook or individual CSVs, plus a comparison tool to diff against existing PRODUCE data.

## File Structure

```
src/
  transform/
    types.ts          — All TypeScript interfaces (ParsedData, TransformResult, Catalog, Recipe, etc.)
    csvParser.ts      — CSV parsing for 4 Arc Flow tables
    mixParser.ts      — 4M Variant Mixes Excel parser
    transformer.ts    — Core transform logic (VBA port)
    validator.ts      — Data quality validation engine (15+ checks, scoring)
    exporter.ts       — CSV/Excel export functions (downloadAsExcel, downloadCSV)
    comparator.ts     — Comparison/diff engine (fuzzy header matching, composite key diffing)
    index.ts          — Re-exports all modules
  hooks/
    useTransformPipeline.ts — Central state management hook (files, parsing, validation, transform, navigation)
  components/
    PipelineStepper.tsx     — Main orchestrator: horizontal stepper + step content + nav bar
    FileUploader.tsx        — Drag & drop upload zone, file detection, required files checklist, inline nav
    DataQualityReport.tsx   — Quality score bar, stats cards, validation issues, data preview
    DataTable.tsx           — Reusable sortable/searchable/paginated table with CSV download
    ResultsViewer.tsx       — Tabbed output tables + summary cards + ComparisonView
    ComparisonView.tsx      — Upload PRODUCE file, auto-detect type, color-coded diff display
    ExportPanel.tsx         — Excel workbook primary download, individual CSVs secondary
    Layout.tsx              — App shell: AppBar ("BLN Data Sync"), Container, footer
  pages/
    Dashboard.tsx           — Renders PipelineStepper with useTransformPipeline hook
  theme/
    produceTheme.ts         — PRODUCE orange MUI theme with Montserrat font
```

## Data Types (from types.ts)

### Input (Arc Flow)
- `ProductionScheme` — code, description, genusCode
- `ProductionSchemeLine` — schemeCode, lineNo, phase, duration, qtyPerArea, output
- `ProductionSchemeLinePeriod` — schemeCode, lineNo, phase, days, periodNo
- `ProductionPreference` — productionItemNo, variantCode, locationCode, schemeCode, activitySchemeCode, addActivitySchemeCode
- `MixRow` — location, commonItem, productionItem, variantCode, weeklyPcts (Map<number, number>)

### Output (PRODUCE)
- `Catalog` — id, genus, series (=productionItemNo), color (=variantCode)
- `Recipe` — id, locationCode, category, schemeCode, genus, series, color, startWeek, endWeek, growWeeks, notes, catalogId
- `SpaceEvent` — id, recipeId, locationCode, category, schemeCode, genus, series, color, phase, startWeek, endWeek, triggerWeeks, durationWeeks
- `SpaceSpec` — id, recipeId, spaceWidth, spaceLength, qtyPerArea, phase
- `RecipeMix` — id, recipeId, catalogId, mixPct, commonItem, location, variant, startWeek, endWeek, note

## Key Design Decisions

1. **Catalogs include series+color** — entries are per unique `genus|productionItemNo|variantCode` from preferences, not just per genus
2. **Single Excel export** — primary download is one multi-sheet .xlsx workbook (avoids browser popup blockers that kill rapid-fire downloads)
3. **Comparison engine** — auto-detects data type from column headers via fuzzy matching, uses composite key-based row diffing, shows matched/changed/added/removed with field-level diffs
4. **Inline navigation** — Upload step has a prominent "Next: Validate Data" bar between drop zone and file cards; other steps have a bottom nav bar with Back/Next buttons

## Reference Data

- `reference/sql-schema/bln-produce-schema.md` — PRODUCE database schema
- `reference/sql-schema/data-analysis.md` — data analysis notes

## Commands

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npx vercel --prod    # Deploy to production
```

## Known Issues / Future Work

- Build warning: chunk > 500KB (could code-split with dynamic imports)
- No unit tests yet
- Mix parser assumes specific Excel column layout from 4M Variant Mixes
- Comparison only works for CSV/Excel uploads, not direct PRODUCE API integration
- Could add drag-to-reorder for uploaded files
- Could add "save session" to persist uploaded data across page reloads
- Could add direct PRODUCE API export (instead of file download)
- Node.js version warning (using 18, Vite 7 wants 20+) — works fine, just a warning
