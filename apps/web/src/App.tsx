import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';

/**
 * App – root component.
 * Wraps the router and any global providers (auth context, query client, etc.).
 * TODO: Add AuthProvider, QueryClientProvider, ThemeProvider.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
