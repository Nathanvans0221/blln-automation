import type { ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { PRODUCE_COLORS } from '../theme/produceTheme';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            BLN Data Sync
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Bell Nursery → PRODUCE
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: PRODUCE_COLORS.background,
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          backgroundColor: PRODUCE_COLORS.darkGray,
          color: PRODUCE_COLORS.white,
        }}
      >
        <Typography variant="body2" align="center">
          BLN Automation • Silver Fern
        </Typography>
      </Box>
    </Box>
  );
}
