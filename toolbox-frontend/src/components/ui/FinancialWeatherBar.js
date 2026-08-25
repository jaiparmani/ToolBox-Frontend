import React from 'react';
import { useNavigate } from 'react-router-dom';
import FinancialWeather from './FinancialWeather';
import { useMoney } from '../../contexts/MoneyContext';

/**
 * Drop-in Financial Weather that reads the shared money state from context, so
 * any screen shows the same climate with zero wiring: <FinancialWeatherBar />.
 * `compact` renders the inline pill (for headers). Hidden while there's no
 * projection to read from, so screens degrade cleanly.
 */
export default function FinancialWeatherBar({ compact, sx }) {
  const navigate = useNavigate();
  const { projection, pulse, loading } = useMoney();
  if (!loading && !projection) return null;
  return (
    <FinancialWeather
      projection={projection}
      pulse={pulse}
      loading={loading}
      compact={compact}
      onClick={() => navigate('/reports')}
      sx={sx}
    />
  );
}
