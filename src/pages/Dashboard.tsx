import { useState, useRef } from 'react';
import { Box, Card, CardContent, Typography, Button, Stack, Chip, Alert, CircularProgress, LinearProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import WarningIcon from '@mui/icons-material/Warning';
import { PRODUCE_COLORS } from '../theme/produceTheme';
import { parseAllFiles, transform, downloadAllExports } from '../transform';
import type { TransformResult as FullTransformResult } from '../transform';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: 'arc-flow' | 'excel' | 'unknown';
  content?: string;
  rowCount?: number;
}

interface TransformSummary {
  catalogs: number;
  recipes: number;
  events: number;
  specs: number;
  errors: string[];
  warnings: string[];
}

const ARC_FLOW_FILES = [
  'ProductionPreferences',
  'ProductionScheme',
  'ProductionSchemeLine',
  'ProductionSchemeLinePeriod',
];

function StatusCard({ title, value, subtitle, color = PRODUCE_COLORS.primary }: StatusCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 200 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function detectFileType(fileName: string): 'arc-flow' | 'excel' | 'unknown' {
  const lowerName = fileName.toLowerCase();
  if (ARC_FLOW_FILES.some(af => lowerName.includes(af.toLowerCase()))) {
    return 'arc-flow';
  }
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return 'excel';
  }
  if (lowerName.endsWith('.csv')) {
    return 'arc-flow';
  }
  return 'unknown';
}

function countCsvRows(content: string): number {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  return Math.max(0, lines.length - 1);
}

export default function Dashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformProgress, setTransformProgress] = useState(0);
  const [transformStep, setTransformStep] = useState('');
  const [transformSummary, setTransformSummary] = useState<TransformSummary | null>(null);
  const [fullResult, setFullResult] = useState<FullTransformResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const fileData: UploadedFile = {
        name: file.name,
        size: file.size,
        type: detectFileType(file.name),
      };

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        fileData.content = content;
        fileData.rowCount = countCsvRows(content);
      }

      newFiles.push(fileData);
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setTransformSummary(null);
    setFullResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTransform = async () => {
    setIsTransforming(true);
    setTransformProgress(0);
    setTransformSummary(null);
    setFullResult(null);

    const steps = [
      { label: 'Parsing CSV files...', progress: 10 },
      { label: 'Building scheme dictionary...', progress: 30 },
      { label: 'Generating catalogs...', progress: 50 },
      { label: 'Generating recipes...', progress: 70 },
      { label: 'Generating events & specs...', progress: 90 },
      { label: 'Validating output...', progress: 100 },
    ];

    try {
      // Step 1: Parse files
      setTransformStep(steps[0].label);
      setTransformProgress(steps[0].progress);
      await new Promise(resolve => setTimeout(resolve, 100));

      const csvFiles = uploadedFiles
        .filter(f => f.content)
        .map(f => ({ name: f.name, content: f.content! }));

      const parsedData = parseAllFiles(csvFiles);

      // Step 2-5: Transform
      for (let i = 1; i < steps.length - 1; i++) {
        setTransformStep(steps[i].label);
        setTransformProgress(steps[i].progress);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const result = transform(parsedData);

      // Step 6: Complete
      setTransformStep(steps[steps.length - 1].label);
      setTransformProgress(100);
      await new Promise(resolve => setTimeout(resolve, 100));

      setFullResult(result);
      setTransformSummary({
        catalogs: result.catalogs.length,
        recipes: result.recipes.length,
        events: result.events.length,
        specs: result.specs.length,
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error) {
      setTransformSummary({
        catalogs: 0,
        recipes: 0,
        events: 0,
        specs: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        warnings: [],
      });
    }

    setIsTransforming(false);
  };

  const handleExport = () => {
    if (!fullResult) return;
    downloadAllExports(fullResult, 'bln');
  };

  const arcFlowCount = uploadedFiles.filter(f => f.type === 'arc-flow').length;
  const totalRows = uploadedFiles.reduce((sum, f) => sum + (f.rowCount || 0), 0);
  const hasErrors = transformSummary && transformSummary.errors.length > 0;
  const hasWarnings = transformSummary && transformSummary.warnings.length > 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Data Sync Dashboard
      </Typography>

      {/* Status Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }} flexWrap="wrap">
        <StatusCard
          title="Last Sync"
          value={transformSummary ? 'Just now' : 'Never'}
          subtitle={transformSummary ? new Date().toLocaleTimeString() : 'No syncs yet'}
        />
        <StatusCard
          title="Files Uploaded"
          value={uploadedFiles.length}
          subtitle={`${totalRows.toLocaleString()} total rows`}
        />
        <StatusCard
          title="Recipes"
          value={transformSummary?.recipes || 0}
          subtitle="Generated"
        />
        <StatusCard
          title="Status"
          value={
            isTransforming ? 'Running' :
            hasErrors ? 'Errors' :
            transformSummary ? 'Complete' :
            uploadedFiles.length > 0 ? 'Ready' : 'Waiting'
          }
          color={
            hasErrors ? '#d32f2f' :
            transformSummary ? '#2e7d32' :
            isTransforming ? PRODUCE_COLORS.primary :
            PRODUCE_COLORS.darkGray
          }
        />
      </Stack>

      {/* Transform Progress */}
      {isTransforming && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Transforming...
            </Typography>
            <LinearProgress variant="determinate" value={transformProgress} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {transformStep} ({Math.round(transformProgress)}%)
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Transform Results */}
      {transformSummary && !isTransforming && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: hasErrors ? '#d32f2f' : '#2e7d32' }}
            >
              {hasErrors ? 'Transform Failed' : 'Transform Complete'}
            </Typography>

            {!hasErrors && (
              <Stack direction="row" spacing={4} flexWrap="wrap" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ color: PRODUCE_COLORS.primary }}>
                    {transformSummary.catalogs.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Catalogs</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ color: PRODUCE_COLORS.primary }}>
                    {transformSummary.recipes.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Recipes</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ color: PRODUCE_COLORS.primary }}>
                    {transformSummary.events.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Events</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ color: PRODUCE_COLORS.primary }}>
                    {transformSummary.specs.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Space Specs</Typography>
                </Box>
              </Stack>
            )}

            {hasErrors && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Errors:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {transformSummary.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {hasWarnings && (
              <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>
                <Typography variant="subtitle2">
                  {transformSummary.warnings.length} warnings
                </Typography>
                <Typography variant="body2">
                  {transformSummary.warnings.slice(0, 5).join(', ')}
                  {transformSummary.warnings.length > 5 && ` and ${transformSummary.warnings.length - 5} more...`}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Uploaded Files
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {uploadedFiles.map((file, index) => (
                <Chip
                  key={index}
                  icon={<InsertDriveFileIcon />}
                  label={`${file.name} (${file.rowCount?.toLocaleString() || '?'} rows)`}
                  color={file.type === 'arc-flow' ? 'primary' : file.type === 'excel' ? 'secondary' : 'default'}
                  variant="outlined"
                  onDelete={() => {
                    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                    setTransformSummary(null);
                    setFullResult(null);
                  }}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
            {arcFlowCount < 4 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Missing Arc Flow files: {4 - arcFlowCount} of 4. Expected: ProductionPreferences, ProductionScheme, ProductionSchemeLine, ProductionSchemeLinePeriod
              </Alert>
            )}
            {arcFlowCount >= 4 && !transformSummary && (
              <Alert severity="success" sx={{ mt: 2 }}>
                All 4 Arc Flow files uploaded. Ready to transform.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".csv,.xlsx,.xls"
        multiple
        style={{ display: 'none' }}
      />

      {/* Action Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: PRODUCE_COLORS.primary, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Upload Source Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Import CSV files from Arc Flow or Excel supplements
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUploadClick}
              disabled={isTransforming}
            >
              Upload Files
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <SyncIcon sx={{ fontSize: 48, color: PRODUCE_COLORS.primary, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Transform Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Run VBA transformation logic (converted to TypeScript)
            </Typography>
            <Button
              variant={transformSummary && !hasErrors ? 'outlined' : 'contained'}
              startIcon={isTransforming ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleTransform}
              disabled={arcFlowCount < 4 || isTransforming}
            >
              {isTransforming ? 'Transforming...' : transformSummary ? 'Re-run Transform' : 'Run Transform'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon
              sx={{
                fontSize: 48,
                color: transformSummary && !hasErrors ? '#2e7d32' : PRODUCE_COLORS.primary,
                mb: 2
              }}
            />
            <Typography variant="h6" gutterBottom>
              Generate Import
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Export PRODUCE-ready CSV files (5 files)
            </Typography>
            <Button
              variant="contained"
              color={transformSummary && !hasErrors ? 'success' : 'primary'}
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={!fullResult || !!hasErrors}
            >
              Download All
            </Button>
          </CardContent>
        </Card>
      </Stack>

      {/* Data Pipeline Info */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Source:</strong> Agroware → Arc Flow (4 CSV tables) + Manual Excel
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Transform:</strong> BuildSchemeDictionary → MergeGrowAndSpace → GenerateRecipes → GenerateEvents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Output:</strong> Catalogs, Recipes, Events, SpaceSpecs (PRODUCE-ready CSVs)
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
