import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SyncIcon from '@mui/icons-material/Sync';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { PRODUCE_COLORS } from '../theme/produceTheme';
import FileUploader from './FileUploader';
import DataQualityReport from './DataQualityReport';
import ResultsViewer from './ResultsViewer';
import ExportPanel from './ExportPanel';
import type { useTransformPipeline } from '../hooks/useTransformPipeline';

type PipelineReturn = ReturnType<typeof useTransformPipeline>;

interface PipelineStepperProps {
  pipeline: PipelineReturn;
}

function TransformStepIcon({ status }: { status: string }) {
  switch (status) {
    case 'complete': return <CheckCircleOutlineIcon sx={{ color: '#2e7d32' }} fontSize="small" />;
    case 'running': return <CircularProgress size={18} sx={{ color: PRODUCE_COLORS.primary }} />;
    case 'error': return <ErrorOutlineIcon sx={{ color: '#d32f2f' }} fontSize="small" />;
    default: return <HourglassEmptyIcon sx={{ color: '#999' }} fontSize="small" />;
  }
}

function TransformView({ pipeline }: { pipeline: PipelineReturn }) {
  const { transformSteps, isTransforming, transformResult } = pipeline;
  const completedSteps = transformSteps.filter(s => s.status === 'complete').length;
  const totalSteps = transformSteps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const hasErrors = transformResult?.errors && transformResult.errors.length > 0;

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isTransforming ? 'Transforming...' : hasErrors ? 'Transform Failed' : 'Transform Complete'}
            </Typography>
            {isTransforming && (
              <Chip label={`${Math.round(progress)}%`} color="primary" size="small" />
            )}
          </Stack>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 3,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: hasErrors ? '#d32f2f' : progress === 100 ? '#2e7d32' : PRODUCE_COLORS.primary,
              },
            }}
          />

          {/* Step-by-step pipeline */}
          <Stack spacing={1}>
            {transformSteps.map((step, idx) => (
              <Stack
                key={idx}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: step.status === 'running' ? PRODUCE_COLORS.background : step.status === 'complete' ? '#f0f7f0' : 'transparent',
                  transition: 'background-color 0.3s ease',
                }}
              >
                <TransformStepIcon status={step.status} />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: step.status === 'running' ? 600 : 400,
                    flex: 1,
                    color: step.status === 'pending' ? '#999' : 'text.primary',
                  }}
                >
                  {step.label}
                </Typography>
                {step.detail && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {step.detail}
                  </Typography>
                )}
                {step.outputCount !== undefined && (
                  <Chip
                    label={step.outputCount.toLocaleString()}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: step.status === 'complete' ? '#c8e6c9' : '#e0e0e0',
                    }}
                  />
                )}
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Error display */}
      {hasErrors && transformResult && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Transform Errors</Typography>
          {transformResult.errors.map((err, i) => (
            <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
              {err}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Actions when not transforming */}
      {!isTransforming && (
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => pipeline.setActiveStep(1)}
          >
            Back to Validation
          </Button>
          {hasErrors && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={pipeline.runTransform}
            >
              Retry Transform
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}

const STEP_ICONS = [
  <CloudUploadIcon key="upload" />,
  <FactCheckIcon key="validate" />,
  <SyncIcon key="transform" />,
  <AssessmentIcon key="results" />,
];

const STEP_LABELS = ['Upload', 'Validate', 'Transform', 'Results'];

export default function PipelineStepper({ pipeline }: PipelineStepperProps) {
  const { activeStep } = pipeline;

  const handleProceedToValidate = async () => {
    await pipeline.parseAndValidate();
  };

  const handleRunTransform = async () => {
    await pipeline.runTransform();
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Data Transform Pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Agroware Arc Flow → PRODUCE Import Files
          </Typography>
        </Box>
        {activeStep > 0 && (
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={pipeline.reset}
            size="small"
            color="inherit"
          >
            Start Over
          </Button>
        )}
      </Stack>

      {/* Horizontal Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEP_LABELS.map((label, idx) => {
          const completed = idx < activeStep;
          const active = idx === activeStep;
          return (
            <Step key={label} completed={completed}>
              <StepLabel
                icon={
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: completed ? '#2e7d32' : active ? PRODUCE_COLORS.primary : '#e0e0e0',
                      color: completed || active ? '#fff' : '#999',
                      cursor: completed ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => {
                      if (completed) pipeline.setActiveStep(idx);
                    }}
                  >
                    {STEP_ICONS[idx]}
                  </Box>
                }
                sx={{
                  '& .MuiStepLabel-label': {
                    fontWeight: active ? 700 : 500,
                    color: active ? PRODUCE_COLORS.primary : completed ? '#2e7d32' : 'text.secondary',
                    mt: 1,
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {/* Step Content */}
      <Box>
        {activeStep === 0 && (
          <FileUploader
            uploadedFiles={pipeline.uploadedFiles}
            arcFlowFileStatus={pipeline.arcFlowFileStatus}
            hasAllArcFlow={pipeline.hasAllArcFlow}
            hasExcel={pipeline.hasExcel}
            canProceedToValidate={pipeline.canProceedToValidate}
            onAddFiles={pipeline.addFiles}
            onRemoveFile={pipeline.removeFile}
            onClearFiles={pipeline.clearFiles}
            onProceed={handleProceedToValidate}
          />
        )}

        {activeStep === 1 && pipeline.validationResult && pipeline.parsedData && (
          <DataQualityReport
            validation={pipeline.validationResult}
            parsedData={pipeline.parsedData}
            canTransform={pipeline.canTransform}
            onRunTransform={handleRunTransform}
          />
        )}

        {activeStep === 2 && (
          <TransformView pipeline={pipeline} />
        )}

        {activeStep === 3 && pipeline.transformResult && pipeline.hasResults && (
          <Box>
            <ResultsViewer result={pipeline.transformResult} duration={pipeline.transformDuration} />
            <Box sx={{ mt: 3 }}>
              <ExportPanel result={pipeline.transformResult} />
            </Box>
          </Box>
        )}
      </Box>

      {/* Pipeline Info Footer */}
      {activeStep === 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>How This Pipeline Works</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>1. Upload</strong> — Drop your 4 Arc Flow CSV exports and optionally the 4M Variant Mixes Excel.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>2. Validate</strong> — The system parses all files, checks for data quality issues, and shows a preview.
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>3. Transform</strong> — Runs the VBA logic (BuildSchemeDictionary, MergeGrowAndSpace, GenerateRecipes, etc.)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>4. Results</strong> — Browse output tables, search/filter data, and export PRODUCE-ready CSVs.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
