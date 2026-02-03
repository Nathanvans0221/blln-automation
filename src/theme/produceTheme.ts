import { createTheme } from '@mui/material/styles';

// PRODUCE brand colors
export const PRODUCE_COLORS = {
  primary: '#DB6E14',      // Main orange
  primaryDark: '#A34900',  // Darker orange
  primaryLight: '#F4D3B8', // Desaturated/light
  background: '#FFF3E5',   // Lightest background
  darkGray: '#3F4948',     // Dark gray for text
  white: '#FFFFFF',
  black: '#000000',
};

const produceTheme = createTheme({
  palette: {
    primary: {
      main: PRODUCE_COLORS.primary,
      dark: PRODUCE_COLORS.primaryDark,
      light: PRODUCE_COLORS.primaryLight,
      contrastText: PRODUCE_COLORS.white,
    },
    secondary: {
      main: PRODUCE_COLORS.darkGray,
      contrastText: PRODUCE_COLORS.white,
    },
    background: {
      default: PRODUCE_COLORS.background,
      paper: PRODUCE_COLORS.white,
    },
    text: {
      primary: PRODUCE_COLORS.darkGray,
      secondary: PRODUCE_COLORS.primaryDark,
    },
  },
  typography: {
    fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: PRODUCE_COLORS.darkGray,
    },
    h2: {
      fontWeight: 600,
      color: PRODUCE_COLORS.darkGray,
    },
    h3: {
      fontWeight: 600,
      color: PRODUCE_COLORS.darkGray,
    },
    h4: {
      fontWeight: 600,
      color: PRODUCE_COLORS.darkGray,
    },
    h5: {
      fontWeight: 500,
      color: PRODUCE_COLORS.darkGray,
    },
    h6: {
      fontWeight: 500,
      color: PRODUCE_COLORS.darkGray,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(219, 110, 20, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: PRODUCE_COLORS.primary,
        },
      },
    },
  },
});

export default produceTheme;
