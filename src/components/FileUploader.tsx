import { useRef, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import TableChartIcon from '@mui/icons-material/TableChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { PRODUCE_COLORS } from '../theme/produceTheme';
import type { UploadedFile } from '../hooks/useTransformPipeline';

interface FileUploaderProps {
  uploadedFiles: UploadedFile[];
  arcFlowFileStatus: { name: string; present: boolean }[];
  hasAllArcFlow: boolean;
  hasExcel: boolean;
  canProceedToValidate: boolean;
  onAddFiles: (files: File[]) => Promise<void>;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  onProceed: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploader({
  uploadedFiles,
  arcFlowFileStatus,
  hasAllArcFlow,
  hasExcel,
  canProceedToValidate,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onProceed,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    if (files.length > 0) {
      await onAddFiles(files);
    }
  }, [onAddFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  return (
    <Box>
      {/* Drop Zone */}
      <Card
        sx={{
          mb: 3,
          border: isDragOver ? `3px dashed ${PRODUCE_COLORS.primary}` : '3px dashed #ccc',
          backgroundColor: isDragOver ? PRODUCE_COLORS.background : 'transparent',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          '&:hover': {
            borderColor: PRODUCE_COLORS.primary,
            backgroundColor: PRODUCE_COLORS.background,
          },
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        elevation={0}
      >
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CloudUploadIcon sx={{ fontSize: 64, color: isDragOver ? PRODUCE_COLORS.primary : '#999', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ color: isDragOver ? PRODUCE_COLORS.primary : 'text.primary' }}>
            {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Accepts CSV files (Arc Flow exports) and Excel files (4M Variant Mixes)
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2 }}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            Choose Files
          </Button>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* Next Step Navigation */}
      {uploadedFiles.length > 0 && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            backgroundColor: canProceedToValidate ? PRODUCE_COLORS.background : '#f5f5f5',
            border: canProceedToValidate ? `1px solid ${PRODUCE_COLORS.primary}40` : '1px solid #e0e0e0',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, color: canProceedToValidate ? 'text.primary' : 'text.secondary' }}>
            {canProceedToValidate
              ? `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} ready — proceed to validation`
              : `Upload all required files to continue`}
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={onProceed}
            disabled={!canProceedToValidate}
            sx={{ minWidth: 200, fontWeight: 600, py: 1 }}
          >
            Next: Validate Data
          </Button>
        </Stack>
      )}

      {/* Required Files Checklist + Uploaded Files */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Required Files */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Required Files
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All 4 Arc Flow CSV exports are needed for the transform.
            </Typography>
            <List dense disablePadding>
              {arcFlowFileStatus.map((af) => (
                <ListItem key={af.name} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {af.present ? (
                      <CheckCircleIcon sx={{ color: '#2e7d32' }} fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ color: '#999' }} fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={af.name}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: af.present ? 600 : 400,
                          color: af.present ? '#2e7d32' : 'text.secondary',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        },
                      },
                    }}
                  />
                </ListItem>
              ))}
              <Divider sx={{ my: 1 }} />
              <ListItem disableGutters sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {hasExcel ? (
                    <CheckCircleIcon sx={{ color: '#2e7d32' }} fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ color: '#999' }} fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="4M Variant Mixes (Excel)"
                  secondary="Optional — needed for mix breakout"
                  slotProps={{
                    primary: {
                      sx: {
                        fontWeight: hasExcel ? 600 : 400,
                        color: hasExcel ? '#2e7d32' : 'text.secondary',
                        fontSize: '0.85rem',
                      },
                    },
                  }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        <Card sx={{ flex: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Uploaded Files ({uploadedFiles.length})
              </Typography>
              {uploadedFiles.length > 0 && (
                <Button size="small" startIcon={<RestartAltIcon />} onClick={onClearFiles} color="inherit">
                  Clear All
                </Button>
              )}
            </Stack>

            {uploadedFiles.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No files uploaded yet. Drag & drop or click the upload area above.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {uploadedFiles.map((file, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: '#f8f8f8',
                      '&:hover': { backgroundColor: '#f0f0f0' },
                    }}
                  >
                    {file.type === 'excel' ? (
                      <TableChartIcon sx={{ color: '#217346' }} />
                    ) : (
                      <InsertDriveFileIcon sx={{ color: PRODUCE_COLORS.primary }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }} noWrap>
                        {file.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                        {file.rowCount !== undefined && (
                          <Chip label={`${file.rowCount.toLocaleString()} rows`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                        )}
                        <Chip
                          label={file.type === 'arc-flow' ? 'Arc Flow' : file.type === 'excel' ? 'Excel' : 'Unknown'}
                          size="small"
                          color={file.type === 'arc-flow' ? 'primary' : file.type === 'excel' ? 'success' : 'default'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Stack>
                    </Box>
                    <IconButton size="small" onClick={() => onRemoveFile(idx)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Status Alerts */}
      <Box sx={{ mt: 3 }}>
        {!hasAllArcFlow && uploadedFiles.length > 0 && (
          <Alert severity="warning">
            Missing {4 - arcFlowFileStatus.filter(f => f.present).length} required Arc Flow file(s):
            {' '}{arcFlowFileStatus.filter(f => !f.present).map(f => f.name).join(', ')}
          </Alert>
        )}
        {hasAllArcFlow && !hasExcel && (
          <Alert severity="info">
            All Arc Flow files detected. The 4M Variant Mixes Excel is optional — add it if you need mix breakout data.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
