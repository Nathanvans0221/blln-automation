import type { ParsedData } from './types';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
  count?: number;
}

export interface DataStats {
  schemeCount: number;
  schemeLineCount: number;
  periodCount: number;
  preferenceCount: number;
  mixRowCount: number;
  uniqueLocations: string[];
  uniqueGenera: string[];
  uniquePhases: string[];
  schemesWithPeriods: number;
  schemesWithoutPeriods: number;
  avgLinesPerScheme: number;
  weekCoverage: { min: number; max: number };
}

export interface ValidationResult {
  isValid: boolean;
  canTransform: boolean;
  issues: ValidationIssue[];
  stats: DataStats;
  qualityScore: number; // 0-100
}

export function validateParsedData(data: ParsedData): ValidationResult {
  const issues: ValidationIssue[] = [];

  const schemeCodesInSchemes = new Set(data.schemes.map(s => s.code));
  const schemeCodesInLines = new Set(data.schemeLines.map(l => l.schemeCode));
  const schemeCodesInPeriods = new Set(data.schemeLinePeriods.map(p => p.schemeCode));
  const schemeCodesInPrefs = new Set(data.preferences.map(p => p.schemeCode));

  // --- Critical: Missing data ---
  if (data.schemes.length === 0) {
    issues.push({ severity: 'error', category: 'Missing Data', message: 'No ProductionScheme data found. Upload the ProductionScheme CSV.' });
  }
  if (data.schemeLines.length === 0) {
    issues.push({ severity: 'error', category: 'Missing Data', message: 'No ProductionSchemeLine data found. Upload the ProductionSchemeLine CSV.' });
  }
  if (data.preferences.length === 0) {
    issues.push({ severity: 'error', category: 'Missing Data', message: 'No ProductionPreferences data found. Upload the ProductionPreferences CSV.' });
  }
  if (data.schemeLinePeriods.length === 0) {
    issues.push({ severity: 'warning', category: 'Missing Data', message: 'No ProductionSchemeLinePeriod data — all schemes will use default full-year durations', count: 0 });
  }
  if (data.mixRows.length === 0) {
    issues.push({ severity: 'info', category: 'Optional Data', message: 'No 4M Variant Mixes loaded — mix output will be empty. Upload the Excel file if needed.' });
  }

  // --- Orphan references ---
  const orphanPrefSchemes = [...schemeCodesInPrefs].filter(c => !schemeCodesInSchemes.has(c));
  if (orphanPrefSchemes.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Orphan References',
      message: `${orphanPrefSchemes.length} preference(s) reference schemes not in ProductionScheme`,
      details: orphanPrefSchemes.slice(0, 10).join(', ') + (orphanPrefSchemes.length > 10 ? ` (+${orphanPrefSchemes.length - 10} more)` : ''),
      count: orphanPrefSchemes.length,
    });
  }

  const orphanLineSchemes = [...schemeCodesInLines].filter(c => !schemeCodesInSchemes.has(c));
  if (orphanLineSchemes.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Orphan References',
      message: `${orphanLineSchemes.length} scheme line code(s) not found in ProductionScheme`,
      details: orphanLineSchemes.slice(0, 10).join(', '),
      count: orphanLineSchemes.length,
    });
  }

  const orphanPeriodSchemes = [...schemeCodesInPeriods].filter(c => !schemeCodesInSchemes.has(c));
  if (orphanPeriodSchemes.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Orphan References',
      message: `${orphanPeriodSchemes.length} period code(s) not found in ProductionScheme`,
      details: orphanPeriodSchemes.slice(0, 10).join(', '),
      count: orphanPeriodSchemes.length,
    });
  }

  // --- Incomplete data ---
  const schemesWithoutLines = [...schemeCodesInSchemes].filter(c => !schemeCodesInLines.has(c));
  if (schemesWithoutLines.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Incomplete Data',
      message: `${schemesWithoutLines.length} scheme(s) have no scheme lines — they won't produce output`,
      details: schemesWithoutLines.slice(0, 10).join(', '),
      count: schemesWithoutLines.length,
    });
  }

  const prefsWithNoLines = [...schemeCodesInPrefs].filter(c => !schemeCodesInLines.has(c));
  if (prefsWithNoLines.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Transform Impact',
      message: `${prefsWithNoLines.length} preference scheme(s) have no scheme lines — won't produce recipes`,
      count: prefsWithNoLines.length,
    });
  }

  // --- Data quality ---
  const zeroDurationLines = data.schemeLines.filter(l => l.duration === 0);
  if (zeroDurationLines.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Data Quality',
      message: `${zeroDurationLines.length} scheme line(s) have zero duration`,
      count: zeroDurationLines.length,
    });
  }

  const missingGenus = data.schemes.filter(s => !s.genusCode || s.genusCode.trim() === '');
  if (missingGenus.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Data Quality',
      message: `${missingGenus.length} scheme(s) have empty genus codes — catalogs may be incomplete`,
      count: missingGenus.length,
    });
  }

  // --- Duplicates ---
  const schemeCounts = new Map<string, number>();
  for (const s of data.schemes) {
    schemeCounts.set(s.code, (schemeCounts.get(s.code) || 0) + 1);
  }
  const duplicateSchemes = [...schemeCounts].filter(([, count]) => count > 1);
  if (duplicateSchemes.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Duplicates',
      message: `${duplicateSchemes.length} duplicate scheme code(s) found`,
      details: duplicateSchemes.map(([code, count]) => `${code} (x${count})`).join(', '),
      count: duplicateSchemes.length,
    });
  }

  // --- Mix data cross-validation ---
  if (data.mixRows.length > 0) {
    const mixLocations = new Set(data.mixRows.map(m => m.location).filter(Boolean));
    const prefLocations = new Set(data.preferences.map(p => p.locationCode).filter(Boolean));
    const unmatchedMixLocations = [...mixLocations].filter(l => !prefLocations.has(l));
    if (unmatchedMixLocations.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'Mix Data',
        message: `${unmatchedMixLocations.length} mix location(s) not found in preferences — those mixes won't match recipes`,
        details: unmatchedMixLocations.slice(0, 10).join(', '),
        count: unmatchedMixLocations.length,
      });
    }

    const mixItemsNoPrefs = new Set<string>();
    const prefItems = new Set(data.preferences.map(p => `${p.locationCode}|${p.productionItemNo}`));
    for (const mix of data.mixRows) {
      const key = `${mix.location}|${mix.productionItem}`;
      if (!prefItems.has(key)) {
        mixItemsNoPrefs.add(key);
      }
    }
    if (mixItemsNoPrefs.size > 0) {
      issues.push({
        severity: 'info',
        category: 'Mix Data',
        message: `${mixItemsNoPrefs.size} mix location/item combination(s) don't match any preference`,
        count: mixItemsNoPrefs.size,
      });
    }
  }

  // --- Compute stats ---
  const uniqueLocations = [...new Set(data.preferences.map(p => p.locationCode))].filter(Boolean).sort();
  const uniqueGenera = [...new Set(data.schemes.map(s => s.genusCode))].filter(Boolean).sort();
  const uniquePhases = [...new Set(data.schemeLines.map(l => l.phase))].filter(Boolean).sort();
  const schemesWithPeriods = new Set(data.schemeLinePeriods.map(p => p.schemeCode)).size;

  const linesPerScheme = new Map<string, number>();
  for (const line of data.schemeLines) {
    linesPerScheme.set(line.schemeCode, (linesPerScheme.get(line.schemeCode) || 0) + 1);
  }
  const avgLines = linesPerScheme.size > 0
    ? [...linesPerScheme.values()].reduce((a, b) => a + b, 0) / linesPerScheme.size
    : 0;

  const allPeriodNos = data.schemeLinePeriods.map(p => p.periodNo).filter(w => w > 0);
  const weekCoverage = allPeriodNos.length > 0
    ? { min: Math.min(...allPeriodNos), max: Math.max(...allPeriodNos) }
    : { min: 0, max: 0 };

  // --- Quality score ---
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  let score = 100;
  score -= errorCount * 25;
  score -= warningCount * 5;
  score = Math.max(0, Math.min(100, score));

  const hasErrors = errorCount > 0;

  return {
    isValid: !hasErrors,
    canTransform: data.schemes.length > 0 && data.schemeLines.length > 0,
    issues,
    qualityScore: score,
    stats: {
      schemeCount: data.schemes.length,
      schemeLineCount: data.schemeLines.length,
      periodCount: data.schemeLinePeriods.length,
      preferenceCount: data.preferences.length,
      mixRowCount: data.mixRows.length,
      uniqueLocations,
      uniqueGenera,
      uniquePhases,
      schemesWithPeriods,
      schemesWithoutPeriods: schemeCodesInSchemes.size - schemesWithPeriods,
      avgLinesPerScheme: Math.round(avgLines * 10) / 10,
      weekCoverage,
    },
  };
}
