import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PRODUCE_COLORS } from '../theme/produceTheme';
import type { ValidationResult } from '../transform/validator';
import type { ParsedData } from '../transform/types';

interface DataQualityReportProps {
  validation: ValidationResult;
  parsedData: ParsedData;
  canTransform: boolean;
  onRunTransform: () => void;
}

function QualityScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#2e7d32' : score >= 50 ? '#ed6c02' : '#d32f2f';
  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Data Quality Score</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color }}>{score}/100</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          height: 10,
          borderRadius: 5,
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 5 },
        }}
      />
    </Box>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Box sx={{
      textAlign: 'center',
      p: 2,
      borderRadius: 2,
      backgroundColor: '#f8f8f8',
      minWidth: 120,
      flex: 1,
    }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: PRODUCE_COLORS.primary }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

function IssueIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'error': return <ErrorIcon sx={{ color: '#d32f2f' }} fontSize="small" />;
    case 'warning': return <WarningIcon sx={{ color: '#ed6c02' }} fontSize="small" />;
    default: return <InfoIcon sx={{ color: '#0288d1' }} fontSize="small" />;
  }
}

function PreviewTable({ title, rows, columns }: {
  title: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string }[];
}) {
  const previewRows = rows.slice(0, 8);
  return (
    <Accordion disableGutters elevation={0} sx={{ border: '1px solid #e0e0e0', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
          <Chip label={`${rows.length.toLocaleString()} rows`} size="small" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map(c => (
                  <TableCell key={c.key} sx={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', backgroundColor: '#f5f5f5' }}>
                    {c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map(c => (
                    <TableCell key={c.key} sx={{ fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {String((row as Record<string, unknown>)[c.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length > 8 && (
                <TableRow>
                  <TableCell colSpan={columns.length} sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.75rem' }}>
                    ... and {(rows.length - 8).toLocaleString()} more rows
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}

export default function DataQualityReport({ validation, parsedData, canTransform, onRunTransform }: DataQualityReportProps) {
  const { stats, issues, qualityScore } = validation;
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return (
    <Box>
      {/* Quality Score & Stats */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <QualityScoreBar score={qualityScore} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {errors.length > 0 && <Chip icon={<ErrorIcon />} label={`${errors.length} errors`} color="error" size="small" />}
              {warnings.length > 0 && <Chip icon={<WarningIcon />} label={`${warnings.length} warnings`} color="warning" size="small" />}
              {infos.length > 0 && <Chip icon={<InfoIcon />} label={`${infos.length} info`} color="info" size="small" />}
              {issues.length === 0 && <Chip icon={<CheckCircleIcon />} label="No issues" color="success" size="small" />}
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Parsed Data Summary</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <StatCard label="Schemes" value={stats.schemeCount} />
              <StatCard label="Scheme Lines" value={stats.schemeLineCount} sub={`~${stats.avgLinesPerScheme} per scheme`} />
              <StatCard label="Periods" value={stats.periodCount} sub={stats.schemesWithPeriods > 0 ? `${stats.schemesWithPeriods} schemes` : 'None'} />
              <StatCard label="Preferences" value={stats.preferenceCount} />
              <StatCard label="Mix Rows" value={stats.mixRowCount} />
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Coverage Info */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Locations ({stats.uniqueLocations.length})</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {stats.uniqueLocations.slice(0, 20).map(loc => (
                <Chip key={loc} label={loc} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
              ))}
              {stats.uniqueLocations.length > 20 && (
                <Chip label={`+${stats.uniqueLocations.length - 20} more`} size="small" />
              )}
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Genera ({stats.uniqueGenera.length})</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {stats.uniqueGenera.slice(0, 20).map(g => (
                <Chip key={g} label={g} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
              ))}
              {stats.uniqueGenera.length > 20 && (
                <Chip label={`+${stats.uniqueGenera.length - 20} more`} size="small" />
              )}
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Phases ({stats.uniquePhases.length})</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {stats.uniquePhases.map(p => (
                <Chip key={p} label={p} size="small" color="primary" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
              ))}
            </Stack>
            {stats.weekCoverage.max > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Week coverage: {stats.weekCoverage.min} - {stats.weekCoverage.max}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Issues */}
      {issues.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Validation Issues</Typography>
            <Stack spacing={1}>
              {[...errors, ...warnings, ...infos].map((issue, idx) => (
                <Alert
                  key={idx}
                  severity={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'}
                  icon={<IssueIcon severity={issue.severity} />}
                  sx={{ '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        <Chip label={issue.category} size="small" variant="outlined" sx={{ mr: 1, height: 20, fontSize: '0.7rem' }} />
                        {issue.message}
                      </Typography>
                      {issue.details && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontFamily: 'monospace' }}>
                          {issue.details}
                        </Typography>
                      )}
                    </Box>
                    {issue.count !== undefined && issue.count > 0 && (
                      <Chip label={issue.count} size="small" sx={{ ml: 1 }} />
                    )}
                  </Stack>
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Data Previews */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Data Previews</Typography>
          <Stack spacing={1}>
            <PreviewTable
              title="ProductionScheme"
              rows={parsedData.schemes as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'description', label: 'Description' },
                { key: 'genusCode', label: 'Genus Code' },
              ]}
            />
            <PreviewTable
              title="ProductionSchemeLine"
              rows={parsedData.schemeLines as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'schemeCode', label: 'Scheme Code' },
                { key: 'lineNo', label: 'Line No' },
                { key: 'phase', label: 'Phase' },
                { key: 'duration', label: 'Duration' },
                { key: 'qtyPerArea', label: 'Qty/Area' },
                { key: 'output', label: 'Output' },
              ]}
            />
            <PreviewTable
              title="ProductionSchemeLinePeriod"
              rows={parsedData.schemeLinePeriods as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'schemeCode', label: 'Scheme Code' },
                { key: 'lineNo', label: 'Line No' },
                { key: 'phase', label: 'Phase' },
                { key: 'days', label: 'Days' },
                { key: 'periodNo', label: 'Period No' },
              ]}
            />
            <PreviewTable
              title="ProductionPreferences"
              rows={parsedData.preferences as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'productionItemNo', label: 'Item No' },
                { key: 'variantCode', label: 'Variant' },
                { key: 'locationCode', label: 'Location' },
                { key: 'schemeCode', label: 'Scheme' },
              ]}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Transform Action */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        {canTransform ? (
          <Alert severity="success" sx={{ mb: 2 }} action={
            <Button
              color="inherit"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={onRunTransform}
              sx={{ fontWeight: 600 }}
            >
              Run Transform
            </Button>
          }>
            Data is valid and ready to transform.
            {qualityScore < 100 && ` Quality score: ${qualityScore}/100 — review warnings above if needed.`}
          </Alert>
        ) : (
          <Alert severity="error">
            Cannot proceed with transform. Fix the errors above and re-upload data.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
