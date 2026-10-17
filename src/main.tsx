import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';
import { loadTranslations, readSavedLanguage } from './i18n/loader';

// The operator panel lives at /admin (no router: one path check, lazily loaded).
const AdminApp = lazy(() => import('./features/admin/AdminApp'));
const isAdminPath = window.location.pathname.replace(/\/+$/, '') === '/admin';

// Load the saved language's strings before first paint so non-Hindi users never see a Hindi flash.
// Falls back to the bundled Hindi strings if the chunk fails (offline first load etc.).
loadTranslations(readSavedLanguage())
  .catch(() => undefined)
  .then(() => renderApp());

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {isAdminPath ? (
        <AppProvider>
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        </AppProvider>
      ) : (
        <App />
      )}
    </React.StrictMode>
  );
}
