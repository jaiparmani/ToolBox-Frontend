import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          padding={3}
          textAlign="center"
        >
          <ErrorOutlineIcon
            sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
          />
          <Typography variant="h4" gutterBottom color="error">
            Oops! Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={this.handleReset}
              color="primary"
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              color="secondary"
            >
              Refresh Page
            </Button>
          </Box>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box mt={3} textAlign="left" maxWidth="600px">
              <Typography variant="h6" gutterBottom>
                Error Details (Development Mode):
              </Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  backgroundColor: 'grey.100',
                  padding: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.75rem'
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;