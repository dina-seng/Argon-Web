import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { SessionExpiryWatcher } from './features/auth/SessionExpiryWatcher';
import { AuthProvider } from './hooks/useAuth';

/**
 * App – root component.
 * Wraps the router and any global providers (auth context, query client, etc.).
 * TODO: Add AuthProvider, QueryClientProvider, ThemeProvider.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionExpiryWatcher />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
