import type {
  ProductionScheme,
  ProductionSchemeLine,
  ProductionSchemeLinePeriod,
  ProductionPreference,
  ParsedData,
} from './types';

/**
 * Parse CSV content into rows, handling quoted fields and BOM
 */
function parseCSV(content: string): string[][] {
  // Remove BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');

  const rows: string[][] = [];
  const lines = cleanContent.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Clean numeric string (remove commas, handle decimals)
 */
function cleanNumber(value: string): number {
  if (!value || value === '') return 0;
  const cleaned = value.replace(/,/g, '').replace(/"/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse ProductionScheme CSV
 * Columns: Code, Description, Genus Code
 */
export function parseProductionScheme(content: string): ProductionScheme[] {
  const rows = parseCSV(content);
  const schemes: ProductionScheme[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    schemes.push({
      code: row[0],
      description: row[1],
      genusCode: row[2],
    });
  }

  return schemes;
}

/**
 * Parse ProductionSchemeLine CSV
 * Columns: Production Scheme Code, Line no_, Production Phase, Duration, Qty_ per Area, Output _
 */
export function parseProductionSchemeLine(content: string): ProductionSchemeLine[] {
  const rows = parseCSV(content);
  const lines: ProductionSchemeLine[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 6) continue;

    lines.push({
      schemeCode: row[0],
      lineNo: row[1].replace(/,/g, ''),
      phase: row[2].toUpperCase(),
      duration: cleanNumber(row[3]),
      qtyPerArea: cleanNumber(row[4]),
      output: cleanNumber(row[5]),
    });
  }

  return lines;
}

/**
 * Parse ProductionSchemeLinePeriod CSV
 * Columns: Production Scheme Code, Production Scheme Line No_, Production Phase, No_ of Days, Period No_
 */
export function parseProductionSchemeLinePeriod(content: string): ProductionSchemeLinePeriod[] {
  const rows = parseCSV(content);
  const periods: ProductionSchemeLinePeriod[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5) continue;

    periods.push({
      schemeCode: row[0],
      lineNo: row[1].replace(/,/g, ''),
      phase: row[2].toUpperCase(),
      days: cleanNumber(row[3]),
      periodNo: Math.round(cleanNumber(row[4])),
    });
  }

  return periods;
}

/**
 * Parse ProductionPreferences CSV
 * Columns: Production Item No_, Production Variant Code, Location Code, Production Scheme Code, Activity Scheme Code, Add_ Activity Scheme Code
 */
export function parseProductionPreferences(content: string): ProductionPreference[] {
  const rows = parseCSV(content);
  const preferences: ProductionPreference[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 6) continue;

    preferences.push({
      productionItemNo: row[0],
      variantCode: row[1],
      locationCode: row[2],
      schemeCode: row[3],
      activitySchemeCode: row[4],
      addActivitySchemeCode: row[5],
    });
  }

  return preferences;
}

/**
 * Parse all Arc Flow files
 */
export function parseAllFiles(files: { name: string; content: string }[]): ParsedData {
  const result: ParsedData = {
    schemes: [],
    schemeLines: [],
    schemeLinePeriods: [],
    preferences: [],
    mixRows: [],
  };

  for (const file of files) {
    const nameLower = file.name.toLowerCase();

    if (nameLower.includes('productionschemelineperiod')) {
      result.schemeLinePeriods = parseProductionSchemeLinePeriod(file.content);
    } else if (nameLower.includes('productionschemeline')) {
      result.schemeLines = parseProductionSchemeLine(file.content);
    } else if (nameLower.includes('productionscheme')) {
      result.schemes = parseProductionScheme(file.content);
    } else if (nameLower.includes('productionpreferences')) {
      result.preferences = parseProductionPreferences(file.content);
    }
  }

  return result;
}
