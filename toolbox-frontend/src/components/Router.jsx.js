import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './screens/LandingPage'
import HobbyTracker from './screens/HobbyTracker'
import { DashboardLayout } from '@toolpad/core/DashboardLayout'

export default function Router() {
  return (
   <DashboardLayout />
  )
}
