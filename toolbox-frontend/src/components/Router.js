import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayoutBasic from './DashboardLayout'
import HobbyTracker from './screens/HobbyTracker'
import ExpenseTrackerPage from './screens/ExpenseTrackerPage'
import ArraySumDemo from './ArraySumDemo'
import UserRegistrationPage from './screens/UserRegistrationPage'
import LoginPage from './screens/LoginPage'
import UserProfilePage from './screens/UserProfilePage'
import LandingPage from './screens/LandingPage'
import QRCodeGenerator from './screens/QRCodeGenerator'
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
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return isAuthenticated ? children : <Navigate to="/register" replace />
}

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />
}

export default function Router() {
  return (
    <Routes>
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

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayoutBasic />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayoutBasic />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <UserProfilePage />
        </ProtectedRoute>
      } />

      <Route path="/hobby-tracker" element={
        <ProtectedRoute>
          <HobbyTracker />
        </ProtectedRoute>
      } />

      <Route path="/expense-tracker" element={
        <ProtectedRoute>
          <ExpenseTrackerPage />
        </ProtectedRoute>
      } />

      <Route path="/array-sum" element={
        <ProtectedRoute>
          <ArraySumDemo />
        </ProtectedRoute>
      } />

      <Route path="/qr-generator" element={
        <ProtectedRoute>
          <QRCodeGenerator />
        </ProtectedRoute>
      } />

      {/* Legacy routes - redirect to dashboard */}
      <Route path="/about" element={<Navigate to="/" replace />} />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
