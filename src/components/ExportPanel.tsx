import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Divider,
  Chip,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { TransformResult } from '../transform/types';
import {
  exportCatalogsCSV,
  exportRecipesCSV,
  exportEventsCSV,
  exportSpecsCSV,
  exportMixesCSV,
  downloadFile,
  downloadAsExcel,
} from '../transform/exporter';

interface ExportPanelProps {
  result: TransformResult;
}

interface ExportItem {
  key: string;
  label: string;
  count: number;
  getCSV: () => string;
}

export default function ExportPanel({ result }: ExportPanelProps) {
  const [excelDownloaded, setExcelDownloaded] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState<Set<string>>(new Set());

  const exports: ExportItem[] = [
    { key: 'catalogs', label: 'Catalogs', count: result.catalogs.length, getCSV: () => exportCatalogsCSV(result.catalogs) },
    { key: 'recipes', label: 'Recipes', count: result.recipes.length, getCSV: () => exportRecipesCSV(result.recipes) },
    { key: 'events', label: 'Events', count: result.events.length, getCSV: () => exportEventsCSV(result.events) },
    { key: 'specs', label: 'Space Specs', count: result.specs.length, getCSV: () => exportSpecsCSV(result.specs) },
    { key: 'mixes', label: 'Mixes', count: result.mixes.length, getCSV: () => exportMixesCSV(result.mixes) },
  ];

  const totalRows = exports.reduce((sum, e) => sum + e.count, 0);

  const handleDownloadExcel = () => {
    downloadAsExcel(result);
    setExcelDownloaded(true);
  };

  const handleDownloadSingleCSV = (item: ExportItem) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const csv = item.getCSV();
    downloadFile(csv, `bln-${item.key}-${timestamp}.csv`);
    setCsvDownloaded(prev => new Set([...prev, item.key]));
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Export PRODUCE-Ready Files
        </Typography>

        {/* Primary: Excel workbook (single file, no browser blocking) */}
        <Box sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: '#f0f7f0',
          border: '1px solid #c8e6c9',
          textAlign: 'center',
          mb: 3,
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Recommended: Single Excel Workbook
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All {exports.filter(e => e.count > 0).length} tables in one .xlsx file ({totalRows.toLocaleString()} total rows) — each on its own sheet.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={excelDownloaded ? <CheckCircleIcon /> : <TableViewIcon />}
            onClick={handleDownloadExcel}
            sx={{
              px: 5,
              py: 1.5,
              backgroundColor: excelDownloaded ? '#2e7d32' : '#1565c0',
              '&:hover': { backgroundColor: excelDownloaded ? '#1b5e20' : '#0d47a1' },
            }}
          >
            {excelDownloaded ? 'Downloaded — Click to Re-download' : 'Download Excel Workbook'}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>
          <Chip label="or download individual CSVs" size="small" />
        </Divider>

        {/* Secondary: Individual CSV downloads */}
        <Stack spacing={0.5}>
          {exports.map((item) => (
            <Stack key={item.key} direction="row" alignItems="center" justifyContent="space-between" sx={{
              py: 1,
              px: 1.5,
              borderRadius: 1,
              '&:hover': { backgroundColor: '#f8f8f8' },
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                <Chip
                  label={`${item.count.toLocaleString()} rows`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                {csvDownloaded.has(item.key) && (
                  <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 16 }} />
                )}
              </Stack>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownloadSingleCSV(item)}
                disabled={item.count === 0}
              >
                CSV
              </Button>
            </Stack>
          ))}
        </Stack>

        {excelDownloaded && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
            Export complete! Import the file into PRODUCE.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
