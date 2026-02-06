import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  Chip,
  Alert,
} from '@mui/material';
import { PRODUCE_COLORS } from '../theme/produceTheme';
import DataTable from './DataTable';
import type { ColumnDef } from './DataTable';
import type { TransformResult } from '../transform/types';

interface ResultsViewerProps {
  result: TransformResult;
  duration: number;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box sx={{
      textAlign: 'center',
      p: 2,
      borderRadius: 2,
      backgroundColor: '#f8f8f8',
      minWidth: 130,
      flex: 1,
    }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color || PRODUCE_COLORS.primary }}>
        {value.toLocaleString()}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
    </Box>
  );
}

const CATALOG_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', numeric: true, width: 60 },
  { key: 'genus', label: 'Genus' },
  { key: 'series', label: 'Series' },
  { key: 'color', label: 'Color' },
];

const RECIPE_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', numeric: true, width: 60 },
  { key: 'locationCode', label: 'Location' },
  { key: 'category', label: 'Category' },
  { key: 'schemeCode', label: 'Scheme' },
  { key: 'genus', label: 'Genus' },
  { key: 'series', label: 'Series' },
  { key: 'color', label: 'Color' },
  { key: 'startWeek', label: 'Start Wk', numeric: true, width: 80 },
  { key: 'endWeek', label: 'End Wk', numeric: true, width: 80 },
  { key: 'growWeeks', label: 'Grow Wks', numeric: true, width: 80 },
  { key: 'notes', label: 'Notes' },
  { key: 'catalogId', label: 'Catalog', numeric: true, width: 70 },
];

const EVENT_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', numeric: true, width: 60 },
  { key: 'recipeId', label: 'Recipe', numeric: true, width: 70 },
  { key: 'locationCode', label: 'Location' },
  { key: 'category', label: 'Category' },
  { key: 'genus', label: 'Genus' },
  { key: 'phase', label: 'Phase' },
  { key: 'startWeek', label: 'Start Wk', numeric: true, width: 80 },
  { key: 'endWeek', label: 'End Wk', numeric: true, width: 80 },
  { key: 'triggerWeeks', label: 'Trigger Wks', numeric: true, width: 90 },
  { key: 'durationWeeks', label: 'Duration Wks', numeric: true, width: 100 },
];

const SPEC_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', numeric: true, width: 60 },
  { key: 'recipeId', label: 'Recipe', numeric: true, width: 70 },
  { key: 'spaceWidth', label: 'Width', numeric: true },
  { key: 'spaceLength', label: 'Length', numeric: true },
  { key: 'qtyPerArea', label: 'Qty/Area', numeric: true },
  { key: 'phase', label: 'Phase' },
];

const MIX_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', numeric: true, width: 60 },
  { key: 'recipeId', label: 'Recipe', numeric: true, width: 70 },
  { key: 'catalogId', label: 'Catalog', numeric: true, width: 70 },
  { key: 'mixPct', label: 'Mix %', numeric: true, width: 70 },
  { key: 'commonItem', label: 'Common Item' },
  { key: 'location', label: 'Location' },
  { key: 'variant', label: 'Variant' },
  { key: 'startWeek', label: 'Start Wk', numeric: true, width: 80 },
  { key: 'endWeek', label: 'End Wk', numeric: true, width: 80 },
  { key: 'note', label: 'Note' },
];

interface TabItem {
  label: string;
  count: number;
  data: Record<string, unknown>[];
  columns: ColumnDef[];
  filename: string;
}

export default function ResultsViewer({ result, duration }: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs: TabItem[] = [
    { label: 'Catalogs', count: result.catalogs.length, data: result.catalogs as unknown as Record<string, unknown>[], columns: CATALOG_COLUMNS, filename: 'bln-catalogs.csv' },
    { label: 'Recipes', count: result.recipes.length, data: result.recipes as unknown as Record<string, unknown>[], columns: RECIPE_COLUMNS, filename: 'bln-recipes.csv' },
    { label: 'Events', count: result.events.length, data: result.events as unknown as Record<string, unknown>[], columns: EVENT_COLUMNS, filename: 'bln-events.csv' },
    { label: 'Specs', count: result.specs.length, data: result.specs as unknown as Record<string, unknown>[], columns: SPEC_COLUMNS, filename: 'bln-specs.csv' },
    { label: 'Mixes', count: result.mixes.length, data: result.mixes as unknown as Record<string, unknown>[], columns: MIX_COLUMNS, filename: 'bln-mixes.csv' },
  ];

  const currentTab = tabs[activeTab];
  const hasWarnings = result.warnings.length > 0;

  return (
    <Box>
      {/* Summary Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <SummaryCard label="Catalogs" value={result.catalogs.length} />
        <SummaryCard label="Recipes" value={result.recipes.length} />
        <SummaryCard label="Events" value={result.events.length} />
        <SummaryCard label="Space Specs" value={result.specs.length} />
        <SummaryCard label="Mixes" value={result.mixes.length} />
        <Box sx={{
          textAlign: 'center',
          p: 2,
          borderRadius: 2,
          backgroundColor: '#f8f8f8',
          minWidth: 130,
          flex: 1,
        }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
            {(duration / 1000).toFixed(1)}s
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>Transform Time</Typography>
        </Box>
      </Stack>

      {/* Warnings */}
      {hasWarnings && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {result.warnings.length} transform warning{result.warnings.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
            {result.warnings.slice(0, 20).map((w, i) => (
              <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                {w}
              </Typography>
            ))}
            {result.warnings.length > 20 && (
              <Typography variant="caption" color="text.secondary">
                ... and {result.warnings.length - 20} more
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {/* Tabbed Data Tables */}
      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              mb: 2,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 42 },
            }}
          >
            {tabs.map((tab, idx) => (
              <Tab
                key={idx}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{tab.label}</span>
                    <Chip
                      label={tab.count.toLocaleString()}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        backgroundColor: activeTab === idx ? PRODUCE_COLORS.primaryLight : '#e0e0e0',
                      }}
                    />
                  </Stack>
                }
              />
            ))}
          </Tabs>

          {currentTab && (
            <DataTable
              data={currentTab.data}
              columns={currentTab.columns}
              title={currentTab.label}
              downloadFilename={currentTab.filename}
              maxHeight={500}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
