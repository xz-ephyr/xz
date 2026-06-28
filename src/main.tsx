import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ZoomProvider } from './components/layout/ZoomProvider';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ZoomProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ZoomProvider>
  </React.StrictMode>
);
