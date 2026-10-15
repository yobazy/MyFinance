'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

type Toast = { id: number; message: string; severity: AlertColor; duration: number };

type ToastContextValue = {
  toast: (message: string, severity?: AlertColor, opts?: { duration?: number }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let nextId = 1;

/** App-wide, non-blocking notifications. Replaces per-page Snackbars and `alert()`. */
export function ToastProvider(props: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const current = queue[0];

  const toast = useCallback<ToastContextValue['toast']>((message, severity = 'info', opts) => {
    const duration = opts?.duration ?? (severity === 'error' ? 8000 : 4500);
    setQueue((q) => [...q, { id: nextId++, message, severity, duration }]);
  }, []);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, 'success'),
      error: (m) => toast(m, 'error'),
      info: (m) => toast(m, 'info'),
      warning: (m) => toast(m, 'warning'),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={current?.duration}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          dismiss();
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={dismiss}
          severity={current?.severity ?? 'info'}
          variant="filled"
          sx={{ minWidth: 280, maxWidth: 520, boxShadow: '0 12px 32px rgba(0,0,0,0.25)', alignItems: 'center' }}
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
