import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '../i18n/I18nProvider';
import '../styles/tokens.css';
import '../styles/base.css';
import './styles/site.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/forms.css';
import './styles/envelope.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
