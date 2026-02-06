import * as XLSX from 'xlsx';

export interface CompareConfig {
  keyFields: string[];
  compareFields: string[];
  label: string;
}

export interface FieldDiff {
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface ComparisonRow {
  status: 'matched' | 'changed' | 'added' | 'removed';
  key: string;
  diffs: FieldDiff[];
  sourceRow?: Record<string, string>;
  compareRow?: Record<string, string>;
}

export interface ComparisonResult {
  dataType: string;
  config: CompareConfig;
  totalSource: number;
  totalCompare: number;
  matched: number;
  added: number;
  removed: number;
  changed: number;
  rows: ComparisonRow[];
}

/** Predefined comparison configs for each output type */
export const COMPARE_CONFIGS: Record<string, CompareConfig> = {
  recipes: {
    keyFields: ['locationCode', 'schemeCode', 'startWeek', 'endWeek'],
    compareFields: ['genus', 'series', 'color', 'growWeeks', 'category', 'catalogId', 'notes'],
    label: 'Recipes',
  },
  catalogs: {
    keyFields: ['genus', 'series', 'color'],
    compareFields: [],
    label: 'Catalogs',
  },
  events: {
    keyFields: ['recipeId', 'phase', 'startWeek', 'endWeek'],
    compareFields: ['locationCode', 'triggerWeeks', 'durationWeeks'],
    label: 'Events',
  },
  specs: {
    keyFields: ['recipeId', 'phase'],
    compareFields: ['spaceWidth', 'spaceLength', 'qtyPerArea'],
    label: 'Space Specs',
  },
  mixes: {
    keyFields: ['recipeId', 'catalogId', 'startWeek', 'endWeek'],
    compareFields: ['mixPct', 'commonItem', 'location', 'variant', 'note'],
    label: 'Mixes',
  },
};

/**
 * Build a composite key from a row's key fields.
 * Normalizes values to lowercase trimmed strings for fuzzy matching.
 */
function buildKey(row: Record<string, string>, keyFields: string[]): string {
  return keyFields
    .map(f => String(row[f] ?? '').trim().toLowerCase())
    .join('|');
}

/**
 * Try to auto-detect which output type a comparison file matches.
 * Looks at column headers and matches against known configs.
 */
export function detectCompareType(headers: string[]): string | null {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  // Score each config by how many key+compare fields match the headers
  let bestType: string | null = null;
  let bestScore = 0;

  for (const [type, config] of Object.entries(COMPARE_CONFIGS)) {
    const allFields = [...config.keyFields, ...config.compareFields];
    const score = allFields.filter(f =>
      lowerHeaders.some(h => h === f.toLowerCase() || h.replace(/[_ ]/g, '') === f.toLowerCase().replace(/[_ ]/g, ''))
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Require at least 2 matching fields to be confident
  return bestScore >= 2 ? bestType : null;
}

/**
 * Parse a comparison file (CSV or Excel) into rows with normalized headers.
 */
export function parseComparisonFile(
  file: { name: string; content?: string; excelData?: ArrayBuffer }
): { headers: string[]; rows: Record<string, string>[] } {
  if (file.content) {
    return parseCSVToRows(file.content);
  }

  if (file.excelData) {
    return parseExcelToRows(file.excelData);
  }

  return { headers: [], rows: [] };
}

function parseCSVToRows(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lines = cleanContent.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
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
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseExcelToRows(data: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rawRows.length < 2) return { headers: [], rows: [] };

  const headers = (rawRows[0] as unknown[]).map(h => String(h ?? '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i] as unknown[];
    if (!rawRow || rawRow.every(v => v == null || String(v).trim() === '')) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = String(rawRow[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Map comparison file headers to expected field names.
 * Handles common variations (e.g., "Location Code" → "locationCode").
 */
function normalizeHeaders(
  rows: Record<string, string>[],
  headers: string[],
  config: CompareConfig
): Record<string, string>[] {
  const allFields = [...config.keyFields, ...config.compareFields];
  const headerMap = new Map<string, string>();

  for (const field of allFields) {
    // Exact match first
    if (headers.includes(field)) {
      headerMap.set(field, field);
      continue;
    }

    // Case-insensitive match
    const lower = field.toLowerCase();
    const match = headers.find(h => h.toLowerCase() === lower);
    if (match) {
      headerMap.set(field, match);
      continue;
    }

    // Fuzzy: remove underscores/spaces/dots and compare
    const normalized = lower.replace(/[_. ]/g, '');
    const fuzzyMatch = headers.find(h => h.toLowerCase().replace(/[_. ]/g, '') === normalized);
    if (fuzzyMatch) {
      headerMap.set(field, fuzzyMatch);
    }
  }

  // Remap rows to use the expected field names
  return rows.map(row => {
    const mapped: Record<string, string> = {};
    for (const [field, sourceHeader] of headerMap) {
      mapped[field] = row[sourceHeader] ?? '';
    }
    // Keep all original fields too for display
    for (const [key, val] of Object.entries(row)) {
      if (!mapped[key]) mapped[key] = val;
    }
    return mapped;
  });
}

/**
 * Compare transform output against uploaded comparison data.
 */
export function compareData(
  sourceData: Record<string, unknown>[],
  compareFile: { headers: string[]; rows: Record<string, string>[] },
  dataType: string,
  config?: CompareConfig
): ComparisonResult {
  const cfg = config || COMPARE_CONFIGS[dataType];
  if (!cfg) {
    throw new Error(`No comparison config for type: ${dataType}`);
  }

  // Normalize source data to string records
  const sourceRows = sourceData.map(row => {
    const r: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      r[k] = String(v ?? '');
    }
    return r;
  });

  // Normalize comparison file headers to match expected fields
  const compareRows = normalizeHeaders(compareFile.rows, compareFile.headers, cfg);

  // Build index of comparison rows by key
  const compareIndex = new Map<string, Record<string, string>>();
  for (const row of compareRows) {
    const key = buildKey(row, cfg.keyFields);
    if (key && key !== cfg.keyFields.map(() => '').join('|')) {
      compareIndex.set(key, row);
    }
  }

  // Build index of source rows by key
  const sourceIndex = new Map<string, Record<string, string>>();
  for (const row of sourceRows) {
    const key = buildKey(row, cfg.keyFields);
    if (key && key !== cfg.keyFields.map(() => '').join('|')) {
      sourceIndex.set(key, row);
    }
  }

  const resultRows: ComparisonRow[] = [];
  const processedCompareKeys = new Set<string>();

  // Check each source row against comparison
  for (const [key, sourceRow] of sourceIndex) {
    const compareRow = compareIndex.get(key);

    if (!compareRow) {
      // In source but not in comparison = added (new in transform)
      resultRows.push({
        status: 'added',
        key,
        diffs: [],
        sourceRow,
      });
    } else {
      processedCompareKeys.add(key);

      // Compare fields
      const diffs: FieldDiff[] = [];
      for (const field of cfg.compareFields) {
        const sourceVal = String(sourceRow[field] ?? '').trim();
        const compareVal = String(compareRow[field] ?? '').trim();

        // Numeric-aware comparison
        const sourceNum = parseFloat(sourceVal);
        const compareNum = parseFloat(compareVal);
        const bothNumeric = !isNaN(sourceNum) && !isNaN(compareNum);

        if (bothNumeric ? sourceNum !== compareNum : sourceVal.toLowerCase() !== compareVal.toLowerCase()) {
          diffs.push({
            field,
            expected: compareVal || '(empty)',
            actual: sourceVal || '(empty)',
          });
        }
      }

      resultRows.push({
        status: diffs.length > 0 ? 'changed' : 'matched',
        key,
        diffs,
        sourceRow,
        compareRow,
      });
    }
  }

  // Check for rows in comparison but not in source = removed
  for (const [key, compareRow] of compareIndex) {
    if (!processedCompareKeys.has(key)) {
      resultRows.push({
        status: 'removed',
        key,
        diffs: [],
        compareRow,
      });
    }
  }

  // Sort: changed first, then added, removed, matched
  const statusOrder = { changed: 0, added: 1, removed: 2, matched: 3 };
  resultRows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return {
    dataType: cfg.label,
    config: cfg,
    totalSource: sourceIndex.size,
    totalCompare: compareIndex.size,
    matched: resultRows.filter(r => r.status === 'matched').length,
    added: resultRows.filter(r => r.status === 'added').length,
    removed: resultRows.filter(r => r.status === 'removed').length,
    changed: resultRows.filter(r => r.status === 'changed').length,
    rows: resultRows,
  };
}
