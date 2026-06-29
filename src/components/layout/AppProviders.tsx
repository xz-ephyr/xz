import type { ReactNode } from 'react';
import { ZoomProvider } from './ZoomProvider';
import { ToastProvider } from '../ui/Toast';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ZoomProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ZoomProvider>
  );
}
