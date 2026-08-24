import React, { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext(() => {});

/** Wrap the app once; call useToast() anywhere to fire a themed snackbar. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
