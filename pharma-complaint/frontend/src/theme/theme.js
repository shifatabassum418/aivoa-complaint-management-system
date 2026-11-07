import { createTheme } from '@mui/material/styles'

export const getAppTheme = (darkMode) =>
  createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#4F46E5', dark: '#4338CA', light: '#818CF8' },
      background: {
        default: darkMode ? '#0F1115' : '#F5F5F7',
        paper: darkMode ? '#1A1C22' : '#FFFFFF',
      },
      success: { main: '#16A34A' },
      warning: { main: '#D97706' },
      error: { main: '#DC2626' },
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      h1: { fontWeight: 800 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
    },
  })
