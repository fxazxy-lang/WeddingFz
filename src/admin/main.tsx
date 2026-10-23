import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import './admin.css';
import { App } from './App';
import { ToastProvider } from './hooks';
import { AdminI18nProvider } from './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminI18nProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AdminI18nProvider>
  </StrictMode>,
);
