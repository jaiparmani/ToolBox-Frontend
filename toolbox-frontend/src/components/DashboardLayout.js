import * as React from 'react';
import { extendTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LayersIcon from '@mui/icons-material/Layers';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import Grid from '@mui/material/Grid2';
import ExpenseTrackerPage from './screens/ExpenseTrackerPage';
import HobbyTracker from './screens/HobbyTracker.js';
import ArraySumDemo from './ArraySumDemo';
import LandingPage from './screens/LandingPage'
import QRCodeGenerator from './screens/QRCodeGenerator.js';
import UserProfilePage from './screens/UserProfilePage';
import NavbarComponent from './NavbarComponent';
const NAVIGATION = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    segment: 'expense-tracker',
    title: 'Expenses',
    icon: <BarChartIcon />,
  },
  {
    segment: 'hobby-tracker',
    title: 'Habit Tracker',
    icon: <LayersIcon />,
  },
  {
    segment: 'health-tracker',
    title: 'Health Tracker',
    icon: <FavoriteIcon />,
  },
  {
    segment: 'reports',
    title: 'Reports',
    icon: <AssessmentIcon />,
  },
  {
    segment: 'array-sum',
    title: 'Array Sum Demo',
    icon: <BarChartIcon />,
  },
  {
    kind: 'divider',
  },
  {
    kind: 'header',
    title: 'User Management',
  },
  {
    segment: 'profile',
    title: 'My Profile',
    icon: <AccountCircleIcon />,
  },
];
const demoTheme = extendTheme({
  colorSchemes: { light: true, dark: true },
  colorSchemeSelector: 'class',
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});


export default function DashboardLayoutBasic(props) {
  const { window } = props;

  // Remove this const when copying and pasting into your project.
  const demoWindow = window ? window() : undefined;

  return (
    <AppProvider
      navigation={NAVIGATION}
      theme={demoTheme}
      window={demoWindow}
    >
      <div>
        <NavbarComponent />
        <DashboardLayout sx={{ '& .MuiAppBar-positionAbsolute': { display: 'none' } }}>
          <PageContainer>
            <Grid container spacing={2}>
              <Grid xs={12}>
                <LandingPage />
              </Grid>
            </Grid>
          </PageContainer>
        </DashboardLayout>
      </div>
    </AppProvider>
  );
}
