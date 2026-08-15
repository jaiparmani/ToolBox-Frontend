import React from 'react'
import { Container, Typography } from '@mui/material'
import NavbarComponent from '../NavbarComponent'

export default function HobbyTracker() {
  return (
    <>
      <NavbarComponent />
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Hobby Tracker</Typography>
        <Typography variant="body1" color="text.secondary">Coming soon...</Typography>
      </Container>
    </>
  )
}
