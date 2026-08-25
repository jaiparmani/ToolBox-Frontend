import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import PageTransition from './motion/PageTransition'
import { authUtils } from './rest/authUtils'
import DashboardLayoutBasic from './DashboardLayout'
import HobbyTracker from './screens/HobbyTracker'
import ExpenseTrackerPage from './screens/ExpenseTrackerPage'
import ReportsPage from './screens/ReportsPage'
import HealthTrackerPage from './screens/HealthTrackerPage'
import ArraySumDemo from './ArraySumDemo'
import LoginPage from './screens/LoginPage'
import UserRegistrationPage from './screens/UserRegistrationPage'
import UserProfilePage from './screens/UserProfilePage'
import LandingPage from './screens/LandingPage'
import InboxPage from './screens/InboxPage'
import RecurringPage from './screens/RecurringPage'
import QRCodeGenerator from './screens/QRCodeGenerator'
import ApiKeysPage from './screens/ApiKeysPage'
import SplitsPage from './screens/SplitsPage'
import { Box, CircularProgress, Typography } from '@mui/material'

// Loading Component
const LoadingSpinner = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
    padding={3}
  >
    <CircularProgress size={40} sx={{ mb: 2 }} />
    <Typography variant="body1" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
   const isAuthenticated = authUtils.isAuthenticated()

   return isAuthenticated ? children : <Navigate to="/login" replace />
 }

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const isAuthenticated = authUtils.isAuthenticated()

  return !isAuthenticated ? children : <Navigate to="/" replace />
}

export default function Router() {
  const location = useLocation();
  return (
    <PageTransition key={location.pathname}>
    <Routes location={location}>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />

      <Route path="/register" element={
        <PublicRoute>
          <UserRegistrationPage />
        </PublicRoute>
      } />


      {/* Protected app: one shell (sidebar + header), all pages nested inside */}
      <Route element={<ProtectedRoute><DashboardLayoutBasic /></ProtectedRoute>}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<LandingPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/hobby-tracker" element={<HobbyTracker />} />
        <Route path="/expense-tracker" element={<ExpenseTrackerPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/health-tracker" element={<HealthTrackerPage />} />
        <Route path="/array-sum" element={<ArraySumDemo />} />
        <Route path="/splits" element={<SplitsPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="/qr-generator" element={<QRCodeGenerator />} />
      </Route>

      {/* Legacy routes - redirect to dashboard */}
      <Route path="/about" element={<Navigate to="/" replace />} />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PageTransition>
  )
}
