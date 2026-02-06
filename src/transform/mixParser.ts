import * as XLSX from 'xlsx';
import type { MixRow } from './types';

/**
 * Parse 4M Variant Mixes Excel file
 *
 * Expected structure:
 * - Column A: Location
 * - Column B: (varies)
 * - Column C: Common Item
 * - Column D: Production Item
 * - Column E: Variant Code
 * - Columns F onwards: Week percentages (header row has week numbers)
 */
export function parseMixExcel(data: ArrayBuffer): MixRow[] {
  const workbook = XLSX.read(data, { type: 'array' });

  // Get first sheet (or sheet named "MixData" if it exists)
  const sheetName = workbook.SheetNames.includes('MixData')
    ? 'MixData'
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('No sheet found in Excel file');
  }

  // Convert to array of arrays
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    return [];
  }

  // Find header row (should be row 0 or 1)
  const headerRowIndex = 0;
  const headerRow = rows[headerRowIndex] as (string | number)[];

  // Detect column positions
  // Look for week numbers in the header (typically starts around column F/index 5)
  const weekStartCol = findWeekStartColumn(headerRow);
  const weekColumns = extractWeekColumns(headerRow, weekStartCol);

  // Detect data columns
  const colMap = detectColumnMap(headerRow);

  const mixRows: MixRow[] = [];

  // Process data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] as (string | number | undefined)[];

    if (!row || row.length === 0) continue;

    const location = String(row[colMap.location] ?? '').trim();
    const commonItem = String(row[colMap.commonItem] ?? '').trim();
    const productionItem = String(row[colMap.productionItem] ?? '').trim();
    const variantCode = String(row[colMap.variantCode] ?? '').trim();

    // Skip empty rows
    if (!location && !commonItem && !productionItem) continue;

    // Extract weekly percentages
    const weeklyPcts = new Map<number, number>();

    for (const { colIndex, weekNum } of weekColumns) {
      const cellValue = row[colIndex];
      if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
        const pct = typeof cellValue === 'number'
          ? cellValue
          : parseFloat(String(cellValue));

        if (!isNaN(pct) && pct > 0) {
          // Convert decimal to percentage if needed (0.5 → 50)
          const normalizedPct = pct <= 1 ? pct * 100 : pct;
          weeklyPcts.set(weekNum, normalizedPct);
        }
      }
    }

    // Only add if we have some weekly data
    if (weeklyPcts.size > 0 || productionItem) {
      mixRows.push({
        location,
        commonItem,
        productionItem,
        variantCode,
        weeklyPcts,
      });
    }
  }

  return mixRows;
}

/**
 * Find the column where week numbers start
 */
function findWeekStartColumn(headerRow: (string | number)[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const val = headerRow[i];
    if (typeof val === 'number' && val >= 1 && val <= 53) {
      return i;
    }
    if (typeof val === 'string') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 53) {
        return i;
      }
    }
  }
  // Default to column F (index 5)
  return 5;
}

/**
 * Extract week column mappings from header
 */
function extractWeekColumns(
  headerRow: (string | number)[],
  startCol: number
): { colIndex: number; weekNum: number }[] {
  const weekColumns: { colIndex: number; weekNum: number }[] = [];

  for (let i = startCol; i < headerRow.length; i++) {
    const val = headerRow[i];
    let weekNum: number | undefined;

    if (typeof val === 'number') {
      weekNum = val;
    } else if (typeof val === 'string') {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        weekNum = num;
      }
    }

    if (weekNum !== undefined && weekNum >= 1 && weekNum <= 53) {
      weekColumns.push({ colIndex: i, weekNum });
    }
  }

  return weekColumns;
}

/**
 * Detect column positions based on header names
 */
function detectColumnMap(headerRow: (string | number)[]): {
  location: number;
  commonItem: number;
  productionItem: number;
  variantCode: number;
} {
  const colMap = {
    location: 0,
    commonItem: 2,
    productionItem: 3,
    variantCode: 4,
  };

  for (let i = 0; i < Math.min(headerRow.length, 10); i++) {
    const val = String(headerRow[i] ?? '').toLowerCase();

    if (val.includes('location')) {
      colMap.location = i;
    } else if (val.includes('common') && val.includes('item')) {
      colMap.commonItem = i;
    } else if (val.includes('production') && val.includes('item')) {
      colMap.productionItem = i;
    } else if (val.includes('variant')) {
      colMap.variantCode = i;
    }
  }

  return colMap;
}

/**
 * Convert browser File to ArrayBuffer for XLSX parsing
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
