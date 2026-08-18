import React from 'react'
import { Container, Typography, Box } from '@mui/material'
import NavbarComponent from '../NavbarComponent'
import QrCode2Icon from '@mui/icons-material/QrCode2'
// import QRCodeStyling from 'qr-code-styling';

export default function QRCodeGenerator() {
  return (
    <>
      <NavbarComponent />
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            py: 8,
            px: 3,
            borderRadius: '28px',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(circle at 20% 20%, rgba(255,159,10,0.3), transparent 45%),
                radial-gradient(circle at 80% 80%, rgba(255,214,10,0.25), transparent 50%)
              `,
              opacity: (theme) => (theme.palette.mode === 'dark' ? 1 : 0.5),
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                width: 64, height: 64, borderRadius: '18px',
                background: 'linear-gradient(135deg, #FF9F0A, #FFD60A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
                boxShadow: '0 12px 28px rgba(255,159,10,0.4)',
              }}
            >
              <QrCode2Icon sx={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Typography variant="h4" gutterBottom>QR Code Generator</Typography>
            <Typography variant="body1" color="text.secondary">Coming soon...</Typography>
          </Box>
        </Box>
      </Container>
    </>
  )
}
