import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardLayoutBasic from './DashboardLayout'
import HobbyTracker from './screens/HobbyTracker'
import ExpenseTrackerPage from './screens/ExpenseTrackerPage'

export default function Router() {
  return (
    <Routes>
    <Route path="/" element={<>12312</>} />
    <Route path="/about" element={<h1>Hi</h1>} />
    <Route path="/hobby-tracker" element={<HobbyTracker/>} />
    <Route path="/expense-tracker" element={<ExpenseTrackerPage/>} />

</  Routes>

  )
}
