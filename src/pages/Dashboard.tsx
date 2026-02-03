import { useState, useRef } from 'react';
import { Box, Card, CardContent, Typography, Button, Stack, Chip, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { PRODUCE_COLORS } from '../theme/produceTheme';

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Dashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: detectFileType(file.name),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const arcFlowCount = uploadedFiles.filter(f => f.type === 'arc-flow').length;
  const excelCount = uploadedFiles.filter(f => f.type === 'excel').length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Data Sync Dashboard
      </Typography>

      {/* Status Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }} flexWrap="wrap">
        <StatusCard
          title="Last Sync"
          value="Never"
          subtitle="No syncs yet"
        />
        <StatusCard
          title="Files Uploaded"
          value={uploadedFiles.length}
          subtitle={`${arcFlowCount} Arc Flow, ${excelCount} Excel`}
        />
        <StatusCard
          title="Recipes"
          value={0}
          subtitle="In database"
        />
        <StatusCard
          title="Validation"
          value={uploadedFiles.length > 0 ? 'Ready' : 'N/A'}
          color={uploadedFiles.length > 0 ? PRODUCE_COLORS.primary : PRODUCE_COLORS.darkGray}
        />
      </Stack>

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
                  label={`${file.name} (${formatFileSize(file.size)})`}
                  color={file.type === 'arc-flow' ? 'primary' : file.type === 'excel' ? 'secondary' : 'default'}
                  variant="outlined"
                  onDelete={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
            {arcFlowCount < 4 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Missing Arc Flow files: {4 - arcFlowCount} of 4. Expected: ProductionPreferences, ProductionScheme, ProductionSchemeLine, ProductionSchemeLinePeriod
              </Alert>
            )}
            {arcFlowCount === 4 && (
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
              Run transformation logic and validate changes
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              disabled={arcFlowCount < 4}
            >
              Run Transform
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: PRODUCE_COLORS.primary, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Generate Import
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Export PRODUCE-ready import files
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CheckCircleIcon />}
              disabled
            >
              Export
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
            <strong>Transform:</strong> VBA logic converted to TypeScript
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Target:</strong> PRODUCE-ready imports (Catalogs, Recipes, Events, Specs)
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
