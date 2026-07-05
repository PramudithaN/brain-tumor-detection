import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#0F6674',      // Clinical teal-blue
      light: '#3f93a1',
      dark: '#003c4a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E8593C',      // Warm coral for CTA/results accent
      light: '#ff8a68',
      dark: '#af2913',
      contrastText: '#ffffff',
    },
    error: {
      main: '#D32F2F',      // Standard clinical error/failure
    },
    background: {
      default: '#F7FAFC',   // Clean off-white medical app background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',   // Deep slate text for readability
      secondary: '#64748B', // Slate gray for helper text
    },
  },
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#1E293B',
    },
    h5: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h6: {
      fontWeight: 600,
      color: '#1E293B',
    },
    body1: {
      color: '#1E293B',
    },
    body2: {
      color: '#64748B',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
          border: '1px solid #E2E8F0',
        },
      },
    },
  },
});
