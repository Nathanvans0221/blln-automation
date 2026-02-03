import type {
  ParsedData,
  SchemeDictionary,
  SchemeRule,
  Catalog,
  Recipe,
  SpaceEvent,
  SpaceSpec,
  TransformResult,
} from './types';

/**
 * Parse scheme code to extract category
 * Format: BN-{Category}-{Genus}-{TimeProfile}
 * Example: BN-012PANN-BEG-LSP → Category = 012PANN
 */
function parseSchemeCode(code: string): { category: string; timeProfile: string } {
  const parts = code.split('-');
  return {
    category: parts.length >= 2 ? parts[1] : '',
    timeProfile: parts.length >= 4 ? parts[3] : '',
  };
}

/**
 * Convert days to weeks (7 days = 1 week)
 */
function daysToWeeks(days: number): number {
  return Math.round(days / 7);
}

/**
 * Build scheme dictionary from parsed data
 * Maps scheme code → array of rules (phases with durations per period)
 *
 * VBA equivalent: BuildSchemeDictionary
 */
export function buildSchemeDictionary(data: ParsedData): SchemeDictionary {
  const dict: SchemeDictionary = {};

  // Group scheme lines by code
  const linesByScheme = new Map<string, typeof data.schemeLines>();
  for (const line of data.schemeLines) {
    const existing = linesByScheme.get(line.schemeCode) || [];
    existing.push(line);
    linesByScheme.set(line.schemeCode, existing);
  }

  // Group periods by scheme+line
  const periodsByKey = new Map<string, typeof data.schemeLinePeriods>();
  for (const period of data.schemeLinePeriods) {
    const key = `${period.schemeCode}|${period.lineNo}|${period.phase}`;
    const existing = periodsByKey.get(key) || [];
    existing.push(period);
    periodsByKey.set(key, existing);
  }

  // Build rules for each scheme
  for (const [schemeCode, lines] of linesByScheme) {
    const rules: SchemeRule[] = [];

    for (const line of lines) {
      const periodKey = `${line.schemeCode}|${line.lineNo}|${line.phase}`;
      const periods = periodsByKey.get(periodKey) || [];

      if (periods.length === 0) {
        // No period-specific durations, use line duration for full year
        rules.push({
          startWeek: 1,
          endWeek: 53,
          growWeeks: daysToWeeks(line.duration * 7), // Duration is in weeks
          phase: line.phase,
        });
      } else {
        // Sort periods by period number
        const sortedPeriods = [...periods].sort((a, b) => a.periodNo - b.periodNo);

        // Create rules for each period range
        for (let i = 0; i < sortedPeriods.length; i++) {
          const period = sortedPeriods[i];
          const nextPeriod = sortedPeriods[i + 1];

          const startWeek = period.periodNo;
          const endWeek = nextPeriod ? nextPeriod.periodNo - 1 : 53;

          rules.push({
            startWeek,
            endWeek,
            growWeeks: daysToWeeks(period.days),
            phase: period.phase,
          });
        }
      }
    }

    dict[schemeCode] = rules;
  }

  return dict;
}

/**
 * Merge GROW and SPACE phases
 * Collapses extra phases (SPACE, HANG, etc.) into GROW rules
 *
 * VBA equivalent: MergeGrowAndSpace
 */
function mergeGrowAndSpace(rules: SchemeRule[]): SchemeRule[] {
  // Collect all break points
  const breakpoints = new Set<number>();
  for (const rule of rules) {
    breakpoints.add(rule.startWeek);
    breakpoints.add(rule.endWeek + 1);
  }
  breakpoints.add(54); // Sentinel

  // Sort breakpoints
  const sortedBPs = Array.from(breakpoints).sort((a, b) => a - b);

  // Build merged segments
  const merged: SchemeRule[] = [];

  for (let i = 0; i < sortedBPs.length - 1; i++) {
    const segStart = sortedBPs[i];
    const segEnd = sortedBPs[i + 1] - 1;

    if (segStart > segEnd) continue;

    // Find covering GROW rule
    let growWeeks = -1;
    for (const rule of rules) {
      if (rule.phase === 'GROW') {
        if (segStart >= rule.startWeek && segEnd <= rule.endWeek) {
          growWeeks = rule.growWeeks;
          break;
        }
      }
    }

    if (growWeeks === -1) continue; // Skip gaps

    // Sum extra phases
    let extraWeeks = 0;
    for (const rule of rules) {
      if (rule.phase !== 'GROW' && rule.phase !== 'INVENTORY') {
        if (segStart >= rule.startWeek && segEnd <= rule.endWeek) {
          extraWeeks += rule.growWeeks;
        }
      }
    }

    merged.push({
      startWeek: segStart,
      endWeek: segEnd,
      growWeeks: growWeeks + extraWeeks,
      phase: 'GROW',
    });
  }

  return merged;
}

/**
 * Generate catalogs from schemes
 * Each unique genus becomes a catalog entry
 */
function generateCatalogs(data: ParsedData): Catalog[] {
  const catalogs: Catalog[] = [];
  const seenGenus = new Set<string>();
  let id = 1;

  for (const scheme of data.schemes) {
    if (!seenGenus.has(scheme.genusCode)) {
      seenGenus.add(scheme.genusCode);
      catalogs.push({
        id: id++,
        genus: scheme.genusCode,
        series: '', // Extracted from 4M number if available
        color: '', // Extracted from variant code if available
      });
    }
  }

  return catalogs;
}

/**
 * Generate recipes from schemes and preferences
 *
 * VBA equivalent: GenerateImportFile
 */
function generateRecipes(
  data: ParsedData,
  schemeDictionary: SchemeDictionary,
  catalogs: Catalog[]
): { recipes: Recipe[]; warnings: string[] } {
  const recipes: Recipe[] = [];
  const warnings: string[] = [];
  let id = 1;

  // Build genus → catalog map
  const genusCatalogMap = new Map<string, number>();
  for (const catalog of catalogs) {
    genusCatalogMap.set(catalog.genus, catalog.id);
  }

  // Build scheme → genus map
  const schemeGenusMap = new Map<string, string>();
  for (const scheme of data.schemes) {
    schemeGenusMap.set(scheme.code, scheme.genusCode);
  }

  // Process each preference (links items to schemes)
  const seenRecipes = new Set<string>();

  for (const pref of data.preferences) {
    const schemeCode = pref.schemeCode;
    const rules = schemeDictionary[schemeCode];

    if (!rules) {
      warnings.push(`No rules found for scheme: ${schemeCode}`);
      continue;
    }

    const genus = schemeGenusMap.get(schemeCode) || '';
    const { category } = parseSchemeCode(schemeCode);
    const catalogId = genusCatalogMap.get(genus);

    // Merge phases and create recipe for each segment
    const mergedRules = mergeGrowAndSpace(rules);

    for (const rule of mergedRules) {
      // Deduplicate recipes by unique key
      const recipeKey = `${pref.locationCode}|${schemeCode}|${rule.startWeek}|${rule.endWeek}`;
      if (seenRecipes.has(recipeKey)) continue;
      seenRecipes.add(recipeKey);

      recipes.push({
        id: id++,
        locationCode: pref.locationCode,
        category,
        schemeCode,
        genus,
        series: pref.productionItemNo,
        color: pref.variantCode,
        startWeek: rule.startWeek,
        endWeek: rule.endWeek,
        growWeeks: rule.growWeeks,
        notes: schemeCode, // Store scheme code in Notes per BLN requirements
        catalogId,
      });
    }
  }

  return { recipes, warnings };
}

/**
 * Generate space events from recipes and scheme rules
 *
 * VBA equivalent: GenerateSpaceEvents
 */
function generateEvents(
  recipes: Recipe[],
  schemeDictionary: SchemeDictionary
): SpaceEvent[] {
  const events: SpaceEvent[] = [];
  let id = 1;

  for (const recipe of recipes) {
    const rules = schemeDictionary[recipe.schemeCode];
    if (!rules) continue;

    // Find GROW rules for trigger calculation
    const growRules = rules.filter(r => r.phase === 'GROW');

    for (const rule of rules) {
      // Check if rule overlaps with recipe window
      if (recipe.startWeek > rule.endWeek || recipe.endWeek < rule.startWeek) {
        continue;
      }

      // Calculate overlap
      const ovStart = Math.max(recipe.startWeek, rule.startWeek);
      const ovEnd = Math.min(recipe.endWeek, rule.endWeek);

      // Calculate trigger weeks (for non-GROW phases)
      let triggerWeeks = 0;
      if (rule.phase !== 'GROW') {
        for (const growRule of growRules) {
          if (ovStart >= growRule.startWeek && ovEnd <= growRule.endWeek) {
            triggerWeeks = growRule.growWeeks;
            break;
          }
        }
      }

      events.push({
        id: id++,
        recipeId: recipe.id,
        locationCode: recipe.locationCode,
        category: recipe.category,
        schemeCode: recipe.schemeCode,
        genus: recipe.genus,
        series: recipe.series,
        color: recipe.color,
        phase: rule.phase,
        startWeek: ovStart,
        endWeek: ovEnd,
        triggerWeeks,
        durationWeeks: rule.growWeeks,
      });
    }
  }

  return events;
}

/**
 * Generate space specs from recipes and scheme lines
 * Space calculation: sqrt(qtyPerArea) for width and length
 */
function generateSpecs(
  recipes: Recipe[],
  data: ParsedData
): SpaceSpec[] {
  const specs: SpaceSpec[] = [];
  let id = 1;

  // Build scheme → qtyPerArea map
  const schemeQtyMap = new Map<string, { phase: string; qtyPerArea: number }[]>();
  for (const line of data.schemeLines) {
    const existing = schemeQtyMap.get(line.schemeCode) || [];
    existing.push({ phase: line.phase, qtyPerArea: line.qtyPerArea });
    schemeQtyMap.set(line.schemeCode, existing);
  }

  for (const recipe of recipes) {
    const qtyData = schemeQtyMap.get(recipe.schemeCode);
    if (!qtyData) continue;

    for (const item of qtyData) {
      if (item.qtyPerArea > 0) {
        // Calculate space dimensions (sqrt of qty per area)
        const spaceDim = Math.sqrt(item.qtyPerArea);

        specs.push({
          id: id++,
          recipeId: recipe.id,
          spaceWidth: Math.round(spaceDim * 100) / 100,
          spaceLength: Math.round(spaceDim * 100) / 100,
          qtyPerArea: item.qtyPerArea,
          phase: item.phase,
        });
      }
    }
  }

  return specs;
}

/**
 * Main transform function
 * Takes parsed Arc Flow data and produces PRODUCE-ready output
 */
export function transform(data: ParsedData): TransformResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate input
  if (data.schemes.length === 0) {
    errors.push('No ProductionScheme data found');
  }
  if (data.schemeLines.length === 0) {
    errors.push('No ProductionSchemeLine data found');
  }

  if (errors.length > 0) {
    return {
      catalogs: [],
      recipes: [],
      events: [],
      specs: [],
      errors,
      warnings,
    };
  }

  // Build scheme dictionary
  const schemeDictionary = buildSchemeDictionary(data);

  // Generate outputs
  const catalogs = generateCatalogs(data);
  const { recipes, warnings: recipeWarnings } = generateRecipes(data, schemeDictionary, catalogs);
  warnings.push(...recipeWarnings);

  const events = generateEvents(recipes, schemeDictionary);
  const specs = generateSpecs(recipes, data);

  return {
    catalogs,
    recipes,
    events,
    specs,
    errors,
    warnings,
  };
}
