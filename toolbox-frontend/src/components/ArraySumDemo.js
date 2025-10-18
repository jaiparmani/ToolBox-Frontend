import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { getArraySumApi } from './rest/expenseTrackerApis';

const ArraySumDemo = () => {
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    // Clear previous results when input changes
    setResult(null);
    setError(null);
  };

  const parseArrayInput = (input) => {
    // Split by comma and filter out empty strings, then convert to numbers
    return input
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '')
      .map(item => {
        const num = parseFloat(item);
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${item}`);
        }
        return num;
      });
  };

  const handleCalculateSum = () => {
    if (!inputValue.trim()) {
      setError('Please enter some numbers');
      return;
    }

    try {
      const values = parseArrayInput(inputValue);
      
      if (values.length === 0) {
        setError('Please enter valid numbers');
        return;
      }

      setLoading(true);
      setError(null);

      getArraySumApi(
        values,
        (data) => {
          setLoading(false);
          setResult(data.result);
        },
        (error) => {
          setLoading(false);
          setError('Failed to calculate sum. Please try again.');
          console.error('Array sum error:', error);
        }
      );
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleCalculateSum();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Array Sum Calculator
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid xs={12} sm={8}>
            <TextField
              fullWidth
              label="Enter numbers (comma-separated)"
              placeholder="e.g., 1, 2, 3, 4.5, -2"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              variant="outlined"
              disabled={loading}
            />
          </Grid>
          <Grid xs={12} sm={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleCalculateSum}
              disabled={loading || !inputValue.trim()}
              sx={{ height: 56 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Calculate Sum'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'success.light' }}>
          <Typography variant="h6" gutterBottom>
            Calculation Result
          </Typography>
          <Typography variant="body1">
            <strong>Input Array:</strong> [{inputValue}]
          </Typography>
          <Typography variant="body1">
            <strong>Sum:</strong> {result.sum || result}
          </Typography>
          <Typography variant="body1">
            <strong>Count:</strong> {result.count || 'N/A'}
          </Typography>
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Instructions:</strong> Enter numbers separated by commas. 
          The API will calculate the sum of all valid numbers in your input.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ArraySumDemo;