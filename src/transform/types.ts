// Arc Flow source data types
export interface ProductionScheme {
  code: string;
  description: string;
  genusCode: string;
}

export interface ProductionSchemeLine {
  schemeCode: string;
  lineNo: string;
  phase: string;
  duration: number;
  qtyPerArea: number;
  output: number;
}

export interface ProductionSchemeLinePeriod {
  schemeCode: string;
  lineNo: string;
  phase: string;
  days: number;
  periodNo: number;
}

export interface ProductionPreference {
  productionItemNo: string;
  variantCode: string;
  locationCode: string;
  schemeCode: string;
  activitySchemeCode: string;
  addActivitySchemeCode: string;
}

// Intermediate types for transformation
export interface SchemeRule {
  startWeek: number;
  endWeek: number;
  growWeeks: number;
  phase: string;
}

export interface SchemeDictionary {
  [schemeCode: string]: SchemeRule[];
}

// PRODUCE output types
export interface Catalog {
  id: number;
  genus: string;
  series: string;
  color: string;
}

export interface Recipe {
  id: number;
  locationCode: string;
  category: string;
  schemeCode: string;
  genus: string;
  series: string;
  color: string;
  startWeek: number;
  endWeek: number;
  growWeeks: number;
  notes: string;
  catalogId?: number;
}

export interface SpaceEvent {
  id: number;
  recipeId: number;
  locationCode: string;
  category: string;
  schemeCode: string;
  genus: string;
  series: string;
  color: string;
  phase: string;
  startWeek: number;
  endWeek: number;
  triggerWeeks: number;
  durationWeeks: number;
}

export interface SpaceSpec {
  id: number;
  recipeId: number;
  spaceWidth: number;
  spaceLength: number;
  qtyPerArea: number;
  phase: string;
}

export interface TransformResult {
  catalogs: Catalog[];
  recipes: Recipe[];
  events: SpaceEvent[];
  specs: SpaceSpec[];
  mixes: RecipeMix[];
  errors: string[];
  warnings: string[];
}

// Mix data from 4M Variant Mixes Excel
export interface MixRow {
  location: string;
  commonItem: string;
  productionItem: string;
  variantCode: string;
  weeklyPcts: Map<number, number>; // week → percentage
}

export interface RecipeMix {
  id: number;
  recipeId: number;
  catalogId: number;
  mixPct: number;
  commonItem: string;
  location: string;
  variant: string;
  startWeek: number;
  endWeek: number;
  note: string;
}

export interface ParsedData {
  schemes: ProductionScheme[];
  schemeLines: ProductionSchemeLine[];
  schemeLinePeriods: ProductionSchemeLinePeriod[];
  preferences: ProductionPreference[];
  mixRows: MixRow[];
}
