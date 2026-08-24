import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Router from './components/Router';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { motion, shadows, surfaces } from './theme/tokens';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { AuthProvider } from './contexts/AuthContext';
import AuroraBackground from './components/motion/AuroraBackground';
import { ColorModeContext } from './contexts/ColorModeContext';

const STORAGE_KEY = 'toolbox-color-mode';

const getInitialMode = () => {
  const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'light' || saved === 'dark') return saved;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#0A84FF' : '#0071e3',
      dark: '#0058b0',
      light: '#2997ff',
    },
    secondary: {
      main: '#86868b',
    },
    text: mode === 'dark'
      ? { primary: '#f5f5f7', secondary: '#a1a1a6' }
      : { primary: '#1d1d1f', secondary: '#6e6e73' },
    background: mode === 'dark'
      // Not pure black: a near-black with a touch of blue gives the glass
      // panels something to sit on, so edges read as depth instead of seams.
      // transparent canvas: the AuroraBackground shows through everything.
      // Surfaces stay glassy (translucent + blur) so the colour drifts behind
      // the content instead of a flat fill.
      ? { default: 'transparent', paper: 'rgba(20,20,24,0.86)' }
      : { default: 'transparent', paper: 'rgba(255,255,255,0.86)' },
    divider: mode === 'dark' ? surfaces.dark.hairline : surfaces.light.hairline,
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    // Headings shrink on small screens rather than wrapping mid-word.
    h4: { fontWeight: 650, letterSpacing: '-0.02em', fontSize: 'clamp(1.5rem, 4.5vw, 2.125rem)' },
    h5: { fontWeight: 650, letterSpacing: '-0.015em', fontSize: 'clamp(1.25rem, 3.6vw, 1.5rem)' },
    h6: { fontWeight: 650, letterSpacing: '-0.01em' },
    // Numbers line up in columns only if the digits are the same width.
    subtitle2: { fontWeight: 600, letterSpacing: '-0.005em' },
    button: { textTransform: 'none', fontWeight: 550 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 980,
          padding: '9px 24px',
          fontSize: '0.95rem',
          minHeight: 42,
          transition: `transform ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}, box-shadow ${motion.fast}ms ${motion.ease}`,
          // A touch device has no hover, so the press itself has to answer.
          '&:active': { transform: 'scale(0.97)' },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:active': { transform: 'none' },
          },
        },
        containedPrimary: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: mode === 'dark' ? 'rgba(24,24,28,0.82)' : 'rgba(255,255,255,0.84)',
          backdropFilter: 'blur(30px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
          boxShadow: mode === 'dark' ? shadows.dark.card : shadows.light.card,
          transition: `transform ${motion.normal}ms ${motion.ease}, box-shadow ${motion.normal}ms ${motion.ease}, border-color ${motion.normal}ms ${motion.ease}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `transform ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}`,
          '&:active': { transform: 'scale(0.92)' },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:active': { transform: 'none' },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 22,
          // Full-width sheet on a phone, centred dialog with room above on desktop.
          '@media (max-width:600px)': {
            margin: 12,
            width: 'calc(100% - 24px)',
            maxHeight: 'calc(100% - 24px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 550 } },
    },
    MuiTooltip: {
      defaultProps: { enterTouchDelay: 400 },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        // Only the raised paper variants get the glass; flat/outlined stay clean.
        elevation: {
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
          },
          '&.Mui-focused': {
            backgroundColor: mode === 'dark' ? 'rgba(10,132,255,0.1)' : 'rgba(0,113,227,0.04)',
            boxShadow: mode === 'dark' ? '0 0 0 4px rgba(10,132,255,0.18)' : '0 0 0 4px rgba(0,113,227,0.12)',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? '#0A84FF' : '#0071e3',
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.95rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? '#1c1c1e' : '#ffffff',
          boxShadow: mode === 'dark' ? '0 24px 70px rgba(0,0,0,0.6)' : '0 24px 70px rgba(0,0,0,0.18)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.3rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          padding: '24px 24px 8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        head: {
          fontWeight: 600,
          color: mode === 'dark' ? '#a1a1a6' : '#6e6e73',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(10,132,255,0.08)' : 'rgba(0,113,227,0.03)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 28px rgba(0,113,227,0.4)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: mode === 'dark' ? '#1c1c1e' : '#ffffff',
          boxShadow: mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 40px rgba(0,0,0,0.14)',
        },
      },
    },
  },
});

function App() {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
  }), [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ErrorBoundary>
      <div className="App">
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuroraBackground />
            <AuthProvider>
              {/* Everything sits above the living background */}
              <Box sx={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
                <BrowserRouter basename={process.env.PUBLIC_URL}>
                  <Router />
                </BrowserRouter>
              </Box>
            </AuthProvider>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
