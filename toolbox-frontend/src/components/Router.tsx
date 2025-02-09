import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function Router() {
  return (
    <BrowserRouter>
    <Routes>
    <Route path="/" element={<></>} />
    <Route path="/about" element={<h1>Hi</h1>} />
</  Routes>
</BrowserRouter>
  )
}
