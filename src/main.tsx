import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ZoomProvider } from './components/layout/ZoomProvider';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ZoomProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ZoomProvider>
  </React.StrictMode>
);
