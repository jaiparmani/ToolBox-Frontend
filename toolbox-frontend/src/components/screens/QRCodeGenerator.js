import React from 'react'
import { Container, Typography } from '@mui/material'
import NavbarComponent from '../NavbarComponent'
// import QRCodeStyling from 'qr-code-styling';

export default function QRCodeGenerator() {
  return (
    <>
      <NavbarComponent />
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>QR Code Generator</Typography>
        <Typography variant="body1" color="text.secondary">Coming soon...</Typography>
      </Container>
    </>
  )
}
