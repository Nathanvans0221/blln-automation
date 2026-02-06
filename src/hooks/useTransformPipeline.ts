import { useState, useCallback, useRef } from 'react';
import type { ParsedData, TransformResult } from '../transform/types';
import { parseAllFiles, parseMixExcel, fileToArrayBuffer, transform } from '../transform';
import { validateParsedData } from '../transform/validator';
import type { ValidationResult } from '../transform/validator';

export interface UploadedFile {
  name: string;
  size: number;
  type: 'arc-flow' | 'excel' | 'unknown';
  file: File;
  rowCount?: number;
}

export interface TransformStepInfo {
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  outputCount?: number;
  detail?: string;
}

export interface PipelineState {
  activeStep: number;
  uploadedFiles: UploadedFile[];
  parsedData: ParsedData | null;
  validationResult: ValidationResult | null;
  isTransforming: boolean;
  transformSteps: TransformStepInfo[];
  transformResult: TransformResult | null;
  transformDuration: number;
  lastRunTimestamp: string | null;
}

const ARC_FLOW_FILES = [
  'ProductionPreferences',
  'ProductionScheme',
  'ProductionSchemeLine',
  'ProductionSchemeLinePeriod',
];

function detectFileType(fileName: string): 'arc-flow' | 'excel' | 'unknown' {
  const lowerName = fileName.toLowerCase();
  if (ARC_FLOW_FILES.some(af => lowerName.includes(af.toLowerCase()))) return 'arc-flow';
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) return 'excel';
  if (lowerName.endsWith('.csv')) return 'arc-flow';
  return 'unknown';
}

function countCsvRows(content: string): number {
  return Math.max(0, content.split('\n').filter(l => l.trim()).length - 1);
}

const INITIAL_STEPS: TransformStepInfo[] = [
  { label: 'Parse CSV files' },
  { label: 'Parse Excel mix data' },
  { label: 'Build scheme dictionary' },
  { label: 'Generate catalogs' },
  { label: 'Generate recipes' },
  { label: 'Generate events & specs' },
  { label: 'Generate mixes' },
  { label: 'Validate output' },
].map(s => ({ ...s, status: 'pending' as const }));

export function useTransformPipeline() {
  const [state, setState] = useState<PipelineState>({
    activeStep: 0,
    uploadedFiles: [],
    parsedData: null,
    validationResult: null,
    isTransforming: false,
    transformSteps: INITIAL_STEPS.map(s => ({ ...s })),
    transformResult: null,
    transformDuration: 0,
    lastRunTimestamp: null,
  });

  const startTimeRef = useRef(0);

  const addFiles = useCallback(async (files: File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      const fileType = detectFileType(file.name);
      const uf: UploadedFile = {
        name: file.name,
        size: file.size,
        type: fileType,
        file,
      };

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        uf.rowCount = countCsvRows(content);
      }

      newFiles.push(uf);
    }

    setState(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...newFiles],
      parsedData: null,
      validationResult: null,
      transformResult: null,
      transformSteps: INITIAL_STEPS.map(s => ({ ...s })),
    }));
  }, []);

  const removeFile = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index),
      parsedData: null,
      validationResult: null,
      transformResult: null,
      transformSteps: INITIAL_STEPS.map(s => ({ ...s })),
    }));
  }, []);

  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadedFiles: [],
      parsedData: null,
      validationResult: null,
      transformResult: null,
      transformSteps: INITIAL_STEPS.map(s => ({ ...s })),
      activeStep: 0,
    }));
  }, []);

  const parseAndValidate = useCallback(async () => {
    const uploaded = state.uploadedFiles;

    // Parse CSVs
    const csvFiles: { name: string; content: string }[] = [];
    for (const f of uploaded) {
      if (f.file.name.endsWith('.csv')) {
        const content = await f.file.text();
        csvFiles.push({ name: f.name, content });
      }
    }

    const parsedData = parseAllFiles(csvFiles);

    // Parse Excel mixes
    const excelFiles = uploaded.filter(f => f.type === 'excel');
    for (const ef of excelFiles) {
      const arrayBuffer = await fileToArrayBuffer(ef.file);
      const mixRows = parseMixExcel(arrayBuffer);
      parsedData.mixRows.push(...mixRows);
    }

    const validationResult = validateParsedData(parsedData);

    setState(prev => ({
      ...prev,
      parsedData,
      validationResult,
      activeStep: 1,
    }));

    return { parsedData, validationResult };
  }, [state.uploadedFiles]);

  const runTransform = useCallback(async () => {
    const parsedData = state.parsedData;
    if (!parsedData) return;

    startTimeRef.current = Date.now();

    setState(prev => ({
      ...prev,
      isTransforming: true,
      transformResult: null,
      transformSteps: INITIAL_STEPS.map(s => ({ ...s })),
      activeStep: 2,
    }));

    const updateStep = (index: number, update: Partial<TransformStepInfo>) => {
      setState(prev => ({
        ...prev,
        transformSteps: prev.transformSteps.map((s, i) =>
          i === index ? { ...s, ...update } : s
        ),
      }));
    };

    try {
      // Step 0: CSVs already parsed
      updateStep(0, {
        status: 'complete',
        outputCount: parsedData.schemes.length + parsedData.schemeLines.length +
          parsedData.schemeLinePeriods.length + parsedData.preferences.length,
        detail: `${parsedData.schemes.length} schemes, ${parsedData.schemeLines.length} lines, ${parsedData.preferences.length} prefs`,
      });

      // Step 1: Mixes already parsed
      updateStep(1, {
        status: 'complete',
        outputCount: parsedData.mixRows.length,
        detail: parsedData.mixRows.length > 0 ? `${parsedData.mixRows.length} mix rows` : 'No mix data',
      });

      await new Promise(r => setTimeout(r, 200));

      // Step 2: Build dictionary
      updateStep(2, { status: 'running' });
      await new Promise(r => setTimeout(r, 150));

      const result = transform(parsedData);

      // Mark all remaining steps complete with counts
      updateStep(2, { status: 'complete', detail: `${Object.keys(parsedData.schemes).length} scheme rules built` });
      updateStep(3, { status: 'complete', outputCount: result.catalogs.length, detail: `${result.catalogs.length} catalogs` });
      updateStep(4, { status: 'complete', outputCount: result.recipes.length, detail: `${result.recipes.length} recipes` });
      updateStep(5, {
        status: 'complete',
        outputCount: result.events.length + result.specs.length,
        detail: `${result.events.length} events, ${result.specs.length} specs`,
      });
      updateStep(6, {
        status: 'complete',
        outputCount: result.mixes.length,
        detail: result.mixes.length > 0 ? `${result.mixes.length} mixes` : 'No mixes generated',
      });

      await new Promise(r => setTimeout(r, 100));

      // Validation step
      const hasErrors = result.errors.length > 0;
      const hasWarnings = result.warnings.length > 0;
      updateStep(7, {
        status: hasErrors ? 'error' : 'complete',
        detail: hasErrors
          ? `${result.errors.length} error(s)`
          : hasWarnings
            ? `OK with ${result.warnings.length} warning(s)`
            : 'All checks passed',
      });

      const duration = Date.now() - startTimeRef.current;

      setState(prev => ({
        ...prev,
        isTransforming: false,
        transformResult: result,
        transformDuration: duration,
        lastRunTimestamp: new Date().toISOString(),
        activeStep: hasErrors ? 2 : 3,
      }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        isTransforming: false,
        transformResult: {
          catalogs: [],
          recipes: [],
          events: [],
          specs: [],
          mixes: [],
          errors: [errMsg],
          warnings: [],
        },
        transformDuration: Date.now() - startTimeRef.current,
        lastRunTimestamp: new Date().toISOString(),
      }));
    }
  }, [state.parsedData]);

  const setActiveStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, activeStep: step }));
  }, []);

  const reset = useCallback(() => {
    setState({
      activeStep: 0,
      uploadedFiles: [],
      parsedData: null,
      validationResult: null,
      isTransforming: false,
      transformSteps: INITIAL_STEPS.map(s => ({ ...s })),
      transformResult: null,
      transformDuration: 0,
      lastRunTimestamp: null,
    });
  }, []);

  // Computed values
  const arcFlowCount = state.uploadedFiles.filter(f => f.type === 'arc-flow').length;
  const hasAllArcFlow = arcFlowCount >= 4;
  const hasExcel = state.uploadedFiles.some(f => f.type === 'excel');
  const canProceedToValidate = state.uploadedFiles.length > 0 && hasAllArcFlow;
  const canTransform = state.validationResult?.canTransform ?? false;
  const hasResults = state.transformResult !== null && state.transformResult.errors.length === 0;

  const arcFlowFileStatus = ARC_FLOW_FILES.map(name => ({
    name,
    present: state.uploadedFiles.some(f =>
      f.name.toLowerCase().includes(name.toLowerCase())
    ),
  }));

  return {
    ...state,
    arcFlowCount,
    hasAllArcFlow,
    hasExcel,
    canProceedToValidate,
    canTransform,
    hasResults,
    arcFlowFileStatus,
    addFiles,
    removeFile,
    clearFiles,
    parseAndValidate,
    runTransform,
    setActiveStep,
    reset,
  };
}
