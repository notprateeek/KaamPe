import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';

// The operator panel lives at /admin (no router: one path check, lazily loaded).
const AdminApp = lazy(() => import('./features/admin/AdminApp'));
const isAdminPath = window.location.pathname.replace(/\/+$/, '') === '/admin';

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
