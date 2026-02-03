import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PRODUCE_COLORS } from '../theme/produceTheme';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

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

export default function Dashboard() {
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
          title="Pending Changes"
          value={0}
          subtitle="Ready to import"
        />
        <StatusCard
          title="Recipes"
          value={0}
          subtitle="In database"
        />
        <StatusCard
          title="Validation"
          value="N/A"
          color={PRODUCE_COLORS.darkGray}
        />
      </Stack>

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
              disabled
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
              disabled
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
