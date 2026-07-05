import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFB238',      // --heat-amber
      contrastText: '#0A0B0D',
    },
    secondary: {
      main: '#FF5A46',      // --heat-red
      contrastText: '#F2F1ED',
    },
    info: {
      main: '#5CC8FF',      // --signal-cyan
    },
    success: {
      main: '#4ADE9C',      // --clear-mint
    },
    background: {
      default: '#0A0B0D',   // --bg
      paper: '#15171A',     // --surface
    },
    text: {
      primary: '#F2F1ED',   // --text-primary
      secondary: '#9C9FA4', // --text-secondary
      disabled: '#6B6E73',  // --text-muted
    },
    divider: '#2A2D31',     // --border
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Space Grotesk", "IBM Plex Mono", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
      color: '#F2F1ED',
    },
    h2: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '1.375rem',
      color: '#F2F1ED',
    },
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      color: '#F2F1ED',
    },
    h5: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      color: '#F2F1ED',
    },
    h6: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      color: '#F2F1ED',
    },
    body1: {
      fontFamily: '"IBM Plex Sans", sans-serif',
      color: '#F2F1ED',
      fontSize: '1rem',
    },
    body2: {
      fontFamily: '"IBM Plex Sans", sans-serif',
      color: '#9C9FA4',
      fontSize: '0.9rem',
    },
    button: {
      fontFamily: '"IBM Plex Sans", sans-serif',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#15171A', // --surface
          border: '1px solid #2A2D31', // --border
          borderRadius: 12,
          boxShadow: 'none',
          backgroundImage: 'none', // Remove default MUI dark mode gradient overlay
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#15171A', // --surface
          borderBottom: '1px solid #2A2D31',
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
  },
});
