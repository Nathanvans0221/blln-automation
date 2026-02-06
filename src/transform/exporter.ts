import type { TransformResult, Catalog, Recipe, SpaceEvent, SpaceSpec, RecipeMix } from './types';

/**
 * Convert array of objects to CSV string
 */
function toCSV<T>(data: T[], columns: (keyof T)[]): string {
  if (data.length === 0) return '';

  const header = (columns as string[]).join(',');
  const rows = data.map(item =>
    columns.map(col => {
      const val = item[col];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val ?? '');
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Export catalogs to CSV
 */
export function exportCatalogsCSV(catalogs: Catalog[]): string {
  return toCSV(catalogs, ['id', 'genus', 'series', 'color']);
}

/**
 * Export recipes to CSV (PRODUCE Plan Import format)
 */
export function exportRecipesCSV(recipes: Recipe[]): string {
  return toCSV(recipes, [
    'id',
    'locationCode',
    'category',
    'schemeCode',
    'genus',
    'series',
    'color',
    'startWeek',
    'endWeek',
    'growWeeks',
    'notes',
    'catalogId',
  ]);
}

/**
 * Export events to CSV
 */
export function exportEventsCSV(events: SpaceEvent[]): string {
  return toCSV(events, [
    'id',
    'recipeId',
    'locationCode',
    'category',
    'schemeCode',
    'genus',
    'series',
    'color',
    'phase',
    'startWeek',
    'endWeek',
    'triggerWeeks',
    'durationWeeks',
  ]);
}

/**
 * Export specs to CSV
 */
export function exportSpecsCSV(specs: SpaceSpec[]): string {
  return toCSV(specs, [
    'id',
    'recipeId',
    'spaceWidth',
    'spaceLength',
    'qtyPerArea',
    'phase',
  ]);
}

/**
 * Export mixes to CSV (PRODUCE RecipeMix format)
 */
export function exportMixesCSV(mixes: RecipeMix[]): string {
  return toCSV(mixes, [
    'id',
    'recipeId',
    'catalogId',
    'mixPct',
    'commonItem',
    'location',
    'variant',
    'startWeek',
    'endWeek',
    'note',
  ]);
}

/**
 * Create a zip-like bundle of all exports as a JSON object
 * (For browser download without actual zip library)
 */
export function exportAll(result: TransformResult): {
  catalogs: string;
  recipes: string;
  events: string;
  specs: string;
  mixes: string;
  summary: string;
} {
  return {
    catalogs: exportCatalogsCSV(result.catalogs),
    recipes: exportRecipesCSV(result.recipes),
    events: exportEventsCSV(result.events),
    specs: exportSpecsCSV(result.specs),
    mixes: exportMixesCSV(result.mixes),
    summary: JSON.stringify({
      timestamp: new Date().toISOString(),
      counts: {
        catalogs: result.catalogs.length,
        recipes: result.recipes.length,
        events: result.events.length,
        specs: result.specs.length,
        mixes: result.mixes.length,
      },
      errors: result.errors,
      warnings: result.warnings,
    }, null, 2),
  };
}

/**
 * Trigger browser download of a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download all exports as separate files
 */
export function downloadAllExports(result: TransformResult, prefix = 'bln'): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const exports = exportAll(result);

  downloadFile(exports.catalogs, `${prefix}-catalogs-${timestamp}.csv`);

  // Small delay between downloads to prevent browser issues
  setTimeout(() => {
    downloadFile(exports.recipes, `${prefix}-recipes-${timestamp}.csv`);
  }, 100);

  setTimeout(() => {
    downloadFile(exports.events, `${prefix}-events-${timestamp}.csv`);
  }, 200);

  setTimeout(() => {
    downloadFile(exports.specs, `${prefix}-specs-${timestamp}.csv`);
  }, 300);

  setTimeout(() => {
    downloadFile(exports.mixes, `${prefix}-mixes-${timestamp}.csv`);
  }, 400);

  setTimeout(() => {
    downloadFile(exports.summary, `${prefix}-summary-${timestamp}.json`, 'application/json');
  }, 500);
}
