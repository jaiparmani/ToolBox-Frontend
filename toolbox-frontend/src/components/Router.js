import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { authUtils } from './rest/authUtils'
import DashboardLayoutBasic from './DashboardLayout'
import { Box, CircularProgress } from '@mui/material'

// Critical path — always eager (first paint, auth gate)
import LoginPage from './screens/LoginPage'
import LandingPage from './screens/LandingPage'

// Everything else — lazy chunks, loaded on first navigation to that route
const ExpenseTrackerPage  = lazy(() => import('./screens/ExpenseTrackerPage'))
const ReportsPage         = lazy(() => import('./screens/ReportsPage'))
const UserRegistrationPage = lazy(() => import('./screens/UserRegistrationPage'))
const UserProfilePage     = lazy(() => import('./screens/UserProfilePage'))
const StoryPage           = lazy(() => import('./screens/StoryPage'))
const InboxPage           = lazy(() => import('./screens/InboxPage'))
const RecurringPage       = lazy(() => import('./screens/RecurringPage'))
const ForgotPasswordPage  = lazy(() => import('./screens/ForgotPasswordPage'))
const ResetPasswordPage   = lazy(() => import('./screens/ResetPasswordPage'))
const ApiKeysPage         = lazy(() => import('./screens/ApiKeysPage'))
const SplitsPage          = lazy(() => import('./screens/SplitsPage'))
const MoneyUniversePage   = lazy(() => import('./screens/MoneyUniversePage'))
const CashFlowPulsePage   = lazy(() => import('./screens/CashFlowPulsePage'))
const GuidePage           = lazy(() => import('./screens/GuidePage'))
const ShareTargetPage     = lazy(() => import('./screens/ShareTargetPage'))
const CrimeScenePage      = lazy(() => import('./screens/CrimeScenePage'))

const Spinner = () => (
  <Box display="flex" alignItems="center" justifyContent="center" minHeight="200px">
    <CircularProgress size={32} />
  </Box>
)

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authUtils.isAuthenticated()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const isAuthenticated = authUtils.isAuthenticated()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

export default function Router() {
  const location = useLocation();
  return (
    <Suspense fallback={<Spinner />}>
      <Routes location={location}>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><UserRegistrationPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute><DashboardLayoutBasic /></ProtectedRoute>}>
          <Route path="/"               element={<LandingPage />} />
          <Route path="/dashboard"      element={<LandingPage />} />
          <Route path="/story"          element={<StoryPage />} />
          <Route path="/inbox"          element={<InboxPage />} />
          <Route path="/recurring"      element={<RecurringPage />} />
          <Route path="/profile"        element={<UserProfilePage />} />
          <Route path="/expense-tracker" element={<ExpenseTrackerPage />} />
          <Route path="/universe"       element={<MoneyUniversePage />} />
          <Route path="/pulse"          element={<CashFlowPulsePage />} />
          <Route path="/reports"        element={<ReportsPage />} />
          <Route path="/splits"         element={<SplitsPage />} />
          <Route path="/guide"          element={<GuidePage />} />
          <Route path="/how-to"         element={<Navigate to="/guide" replace />} />
          <Route path="/api-keys"       element={<ApiKeysPage />} />
          <Route path="/share"          element={<ShareTargetPage />} />
          <Route path="/verdict"        element={<CrimeScenePage />} />
          <Route path="/health-tracker" element={<Navigate to="/" replace />} />
          <Route path="/hobby-tracker"  element={<Navigate to="/" replace />} />
          <Route path="/array-sum"      element={<Navigate to="/" replace />} />
          <Route path="/qr-generator"   element={<Navigate to="/" replace />} />
        </Route>

        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
