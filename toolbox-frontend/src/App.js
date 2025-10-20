import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import Router from './components/Router';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
