import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { TransformResult } from '../transform/types';
import {
  exportCatalogsCSV,
  exportRecipesCSV,
  exportEventsCSV,
  exportSpecsCSV,
  exportMixesCSV,
  downloadFile,
  exportAll,
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
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const exports: ExportItem[] = [
    { key: 'catalogs', label: 'Catalogs', count: result.catalogs.length, getCSV: () => exportCatalogsCSV(result.catalogs) },
    { key: 'recipes', label: 'Recipes', count: result.recipes.length, getCSV: () => exportRecipesCSV(result.recipes) },
    { key: 'events', label: 'Events', count: result.events.length, getCSV: () => exportEventsCSV(result.events) },
    { key: 'specs', label: 'Space Specs', count: result.specs.length, getCSV: () => exportSpecsCSV(result.specs) },
    { key: 'mixes', label: 'Mixes', count: result.mixes.length, getCSV: () => exportMixesCSV(result.mixes) },
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set(exports.map(e => e.key)));

  const handleToggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selected.size === exports.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(exports.map(e => e.key)));
    }
  };

  const handleDownloadSingle = (item: ExportItem) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const csv = item.getCSV();
    downloadFile(csv, `bln-${item.key}-${timestamp}.csv`);
    setDownloaded(prev => new Set([...prev, item.key]));
  };

  const handleDownloadAll = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const allExports = exportAll(result);

    const filesToDownload = exports.filter(e => selected.has(e.key));
    let delay = 0;

    for (const item of filesToDownload) {
      const csv = allExports[item.key as keyof typeof allExports];
      if (csv) {
        setTimeout(() => {
          downloadFile(csv, `bln-${item.key}-${timestamp}.csv`);
        }, delay);
        delay += 150;
      }
    }

    // Also download summary JSON
    setTimeout(() => {
      downloadFile(allExports.summary, `bln-summary-${timestamp}.json`, 'application/json');
    }, delay);

    setDownloaded(new Set(exports.map(e => e.key)));
  };

  const totalRows = exports.filter(e => selected.has(e.key)).reduce((sum, e) => sum + e.count, 0);
  const allDownloaded = exports.every(e => downloaded.has(e.key));

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Export PRODUCE-Ready Files
          </Typography>
          <Chip
            label={`${selected.size} files selected (${totalRows.toLocaleString()} rows)`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Stack>

        {/* File selection */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selected.size === exports.length}
                indeterminate={selected.size > 0 && selected.size < exports.length}
                onChange={handleToggleAll}
              />
            }
            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Select All</Typography>}
          />
          <Divider sx={{ my: 1 }} />
          {exports.map((item) => (
            <Stack key={item.key} direction="row" alignItems="center" sx={{ py: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected.has(item.key)}
                    onChange={() => handleToggle(item.key)}
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{item.label}</Typography>
                    <Chip label={`${item.count.toLocaleString()} rows`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    {downloaded.has(item.key) && (
                      <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 16 }} />
                    )}
                  </Stack>
                }
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownloadSingle(item)}
                disabled={item.count === 0}
              >
                CSV
              </Button>
            </Stack>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Download All */}
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<FolderZipIcon />}
            onClick={handleDownloadAll}
            disabled={selected.size === 0}
            sx={{
              px: 4,
              py: 1.5,
              backgroundColor: '#2e7d32',
              '&:hover': { backgroundColor: '#1b5e20' },
            }}
          >
            Download {selected.size} Selected Files + Summary
          </Button>
        </Stack>

        {allDownloaded && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
            All files downloaded! Import these CSVs into PRODUCE.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
