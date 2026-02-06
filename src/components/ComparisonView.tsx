import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Paper,
  Tooltip,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { PRODUCE_COLORS } from '../theme/produceTheme';
import type { TransformResult } from '../transform/types';
import {
  COMPARE_CONFIGS,
  detectCompareType,
  parseComparisonFile,
  compareData,
} from '../transform/comparator';
import type { ComparisonResult, ComparisonRow } from '../transform/comparator';
import { fileToArrayBuffer } from '../transform';

interface ComparisonViewProps {
  result: TransformResult;
}

const STATUS_COLORS = {
  matched: '#e8f5e9',
  changed: '#fff3e0',
  added: '#e3f2fd',
  removed: '#fce4ec',
};

const STATUS_LABELS = {
  matched: 'Matched',
  changed: 'Changed',
  added: 'New in Transform',
  removed: 'Missing from Transform',
};

const STATUS_ICONS = {
  matched: <CheckCircleOutlineIcon sx={{ color: '#2e7d32' }} fontSize="small" />,
  changed: <ChangeCircleIcon sx={{ color: '#ed6c02' }} fontSize="small" />,
  added: <AddCircleOutlineIcon sx={{ color: '#1565c0' }} fontSize="small" />,
  removed: <RemoveCircleOutlineIcon sx={{ color: '#c62828' }} fontSize="small" />,
};

function getOutputData(result: TransformResult, type: string): Record<string, unknown>[] {
  switch (type) {
    case 'recipes': return result.recipes as unknown as Record<string, unknown>[];
    case 'catalogs': return result.catalogs as unknown as Record<string, unknown>[];
    case 'events': return result.events as unknown as Record<string, unknown>[];
    case 'specs': return result.specs as unknown as Record<string, unknown>[];
    case 'mixes': return result.mixes as unknown as Record<string, unknown>[];
    default: return [];
  }
}

function exportComparisonCSV(comparison: ComparisonResult): string {
  const allFields = [...comparison.config.keyFields, ...comparison.config.compareFields];
  const header = ['Status', 'Key', ...allFields, 'Differences'].join(',');

  const rows = comparison.rows.map(row => {
    const data = row.sourceRow || row.compareRow || {};
    const diffStr = row.diffs.map(d => `${d.field}: ${d.expected} → ${d.actual}`).join('; ');
    const values = [
      row.status,
      `"${row.key}"`,
      ...allFields.map(f => {
        const v = data[f] ?? '';
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }),
      `"${diffStr}"`,
    ];
    return values.join(',');
  });

  return [header, ...rows].join('\n');
}

export default function ComparisonView({ result }: ComparisonViewProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>(['changed', 'added', 'removed', 'matched']);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    let fileData: { name: string; content?: string; excelData?: ArrayBuffer };

    if (file.name.endsWith('.csv')) {
      const content = await file.text();
      fileData = { name: file.name, content };
    } else {
      const buffer = await fileToArrayBuffer(file);
      fileData = { name: file.name, excelData: buffer };
    }

    const parsed = parseComparisonFile(fileData);

    if (parsed.rows.length === 0) {
      setComparison(null);
      return;
    }

    // Auto-detect type if not selected
    let type = selectedType;
    if (!type) {
      const detected = detectCompareType(parsed.headers);
      if (detected) {
        type = detected;
        setSelectedType(detected);
      }
    }

    if (!type || !COMPARE_CONFIGS[type]) {
      setComparison(null);
      return;
    }

    const sourceData = getOutputData(result, type);
    const compResult = compareData(sourceData as Record<string, unknown>[], parsed, type);
    setComparison(compResult);
    setPage(0);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedType, result]);


  const handleDownloadReport = useCallback(() => {
    if (!comparison) return;
    const csv = exportComparisonCSV(comparison);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bln-comparison-${comparison.dataType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [comparison]);

  // Filter rows
  const filteredRows = comparison
    ? comparison.rows.filter(row => {
        if (!statusFilter.includes(row.status)) return false;
        if (search) {
          const term = search.toLowerCase();
          const data = row.sourceRow || row.compareRow || {};
          return row.key.toLowerCase().includes(term) ||
            Object.values(data).some(v => String(v).toLowerCase().includes(term));
        }
        return true;
      })
    : [];

  const paginatedRows = filteredRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <CompareArrowsIcon sx={{ color: PRODUCE_COLORS.primary }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Compare Against Existing Data
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload a CSV or Excel file exported from PRODUCE to compare against the transform output.
            Mismatches, missing entries, and new records will be highlighted.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Compare against</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setComparison(null); }}
                label="Compare against"
              >
                <MenuItem value="">Auto-detect</MenuItem>
                {Object.entries(COMPARE_CONFIGS).map(([key, cfg]) => {
                  const count = getOutputData(result, key).length;
                  return (
                    <MenuItem key={key} value={key} disabled={count === 0}>
                      {cfg.label} ({count.toLocaleString()})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {comparison ? 'Upload New File' : 'Upload Comparison File'}
            </Button>

            {fileName && (
              <Chip label={fileName} variant="outlined" onDelete={() => { setComparison(null); setFileName(''); }} />
            )}
          </Stack>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: STATUS_COLORS.matched, flex: 1, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>{comparison.matched}</Typography>
              <Typography variant="body2">Matched</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: STATUS_COLORS.changed, flex: 1, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#e65100' }}>{comparison.changed}</Typography>
              <Typography variant="body2">Changed</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: STATUS_COLORS.added, flex: 1, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565c0' }}>{comparison.added}</Typography>
              <Typography variant="body2">New in Transform</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: STATUS_COLORS.removed, flex: 1, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#c62828' }}>{comparison.removed}</Typography>
              <Typography variant="body2">Missing from Transform</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#f5f5f5', flex: 1, textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {comparison.totalSource} / {comparison.totalCompare}
              </Typography>
              <Typography variant="body2">Transform / PRODUCE</Typography>
            </Box>
          </Stack>

          {comparison.changed === 0 && comparison.added === 0 && comparison.removed === 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Perfect match! Transform output matches the comparison file exactly.
            </Alert>
          )}

          {/* Filters */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup
                  value={statusFilter}
                  onChange={(_, v) => { if (v.length > 0) { setStatusFilter(v); setPage(0); } }}
                  size="small"
                >
                  <ToggleButton value="changed">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {STATUS_ICONS.changed}
                      <span>Changed ({comparison.changed})</span>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="added">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {STATUS_ICONS.added}
                      <span>New ({comparison.added})</span>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="removed">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {STATUS_ICONS.removed}
                      <span>Missing ({comparison.removed})</span>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="matched">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {STATUS_ICONS.matched}
                      <span>OK ({comparison.matched})</span>
                    </Stack>
                  </ToggleButton>
                </ToggleButtonGroup>

                <TextField
                  size="small"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    },
                  }}
                  sx={{ width: 200 }}
                />

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Download comparison report">
                  <IconButton onClick={handleDownloadReport} size="small">
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', width: 40 }}>Status</TableCell>
                    {comparison.config.keyFields.map(f => (
                      <TableCell key={f} sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' }}>
                        {f}
                      </TableCell>
                    ))}
                    {comparison.config.compareFields.length > 0 && (
                      <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Differences</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={comparison.config.keyFields.length + 2} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {search ? 'No matching rows' : 'No rows in selected filters'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row, idx) => (
                      <ComparisonTableRow key={idx} row={row} config={comparison.config} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredRows.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Card>
        </>
      )}
    </Box>
  );
}

function ComparisonTableRow({ row, config }: { row: ComparisonRow; config: ComparisonViewProps extends never ? never : { keyFields: string[]; compareFields: string[] } }) {
  const data = row.sourceRow || row.compareRow || {};

  return (
    <TableRow sx={{ backgroundColor: STATUS_COLORS[row.status] + '80' }}>
      <TableCell>
        <Tooltip title={STATUS_LABELS[row.status]}>
          <Box>{STATUS_ICONS[row.status]}</Box>
        </Tooltip>
      </TableCell>
      {config.keyFields.map(f => (
        <TableCell key={f} sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          {data[f] ?? ''}
        </TableCell>
      ))}
      {config.compareFields.length > 0 && (
        <TableCell>
          {row.diffs.length > 0 ? (
            <Stack spacing={0.5}>
              {row.diffs.map((d, i) => (
                <Typography key={i} variant="caption" sx={{ fontFamily: 'monospace' }}>
                  <strong>{d.field}:</strong>{' '}
                  <span style={{ color: '#c62828', textDecoration: 'line-through' }}>{String(d.expected)}</span>
                  {' → '}
                  <span style={{ color: '#2e7d32' }}>{String(d.actual)}</span>
                </Typography>
              ))}
            </Stack>
          ) : row.status === 'matched' ? (
            <Typography variant="caption" color="text.secondary">All fields match</Typography>
          ) : null}
        </TableCell>
      )}
    </TableRow>
  );
}
