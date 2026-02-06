import { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { PRODUCE_COLORS } from '../theme/produceTheme';

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown) => string;
  numeric?: boolean;
}

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: ColumnDef[];
  title?: string;
  defaultRowsPerPage?: number;
  downloadFilename?: string;
  maxHeight?: number;
  compact?: boolean;
}

type Order = 'asc' | 'desc';

function descendingComparator(a: Record<string, unknown>, b: Record<string, unknown>, orderBy: string): number {
  const aVal = a[orderBy];
  const bVal = b[orderBy];

  if (aVal == null && bVal == null) return 0;
  if (aVal == null) return 1;
  if (bVal == null) return -1;

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return bVal - aVal;
  }

  return String(bVal).localeCompare(String(aVal));
}

function getComparator(order: Order, orderBy: string) {
  return order === 'desc'
    ? (a: Record<string, unknown>, b: Record<string, unknown>) => descendingComparator(a, b, orderBy)
    : (a: Record<string, unknown>, b: Record<string, unknown>) => -descendingComparator(a, b, orderBy);
}

function generateCSV(data: Record<string, unknown>[], columns: ColumnDef[]): string {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      const str = col.format ? col.format(val) : String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DataTable({
  data,
  columns,
  title,
  defaultRowsPerPage = 25,
  downloadFilename,
  maxHeight = 600,
  compact = false,
}: DataTableProps) {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<string>(columns[0]?.key ?? '');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search, columns]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort(getComparator(order, orderBy));
  }, [filteredData, order, orderBy]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const handleSort = (columnKey: string) => {
    const isAsc = orderBy === columnKey && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnKey);
  };

  const handleDownload = () => {
    const csv = generateCSV(sortedData, columns);
    triggerDownload(csv, downloadFilename || `${title || 'data'}.csv`);
  };

  const cellPadding = compact ? '6px 8px' : '8px 16px';
  const fontSize = compact ? '0.8rem' : '0.875rem';

  return (
    <Box>
      {/* Header bar */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          )}
          <Chip
            label={`${filteredData.length.toLocaleString()} row${filteredData.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ backgroundColor: PRODUCE_COLORS.primaryLight }}
          />
          {search && filteredData.length !== data.length && (
            <Chip
              label={`${data.length - filteredData.length} filtered out`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 220 }}
          />
          <Tooltip title="Download as CSV">
            <IconButton onClick={handleDownload} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight, borderRadius: 2 }}>
        <Table stickyHeader size={compact ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || (col.numeric ? 'right' : 'left')}
                  sx={{
                    fontWeight: 700,
                    fontSize,
                    padding: cellPadding,
                    backgroundColor: PRODUCE_COLORS.darkGray,
                    color: PRODUCE_COLORS.white,
                    width: col.width,
                    whiteSpace: 'nowrap',
                    '& .MuiTableSortLabel-root': { color: `${PRODUCE_COLORS.white} !important` },
                    '& .MuiTableSortLabel-root.Mui-active': { color: `${PRODUCE_COLORS.primaryLight} !important` },
                    '& .MuiTableSortLabel-icon': { color: `${PRODUCE_COLORS.primaryLight} !important` },
                  }}
                >
                  <TableSortLabel
                    active={orderBy === col.key}
                    direction={orderBy === col.key ? order : 'asc'}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {search ? 'No matching rows' : 'No data'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  hover
                  sx={{
                    '&:nth-of-type(even)': { backgroundColor: 'rgba(0,0,0,0.02)' },
                  }}
                >
                  {columns.map((col) => {
                    const val = row[col.key];
                    const display = col.format ? col.format(val) : String(val ?? '');
                    return (
                      <TableCell
                        key={col.key}
                        align={col.align || (col.numeric ? 'right' : 'left')}
                        sx={{
                          fontSize,
                          padding: cellPadding,
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={display}
                      >
                        {display}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
}
