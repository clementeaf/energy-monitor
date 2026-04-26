import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MsalProvider } from '@azure/msal-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { msalInstance } from '../auth/msalInstance';
import { AppRootBoundary } from '../components/errors/AppRootBoundary';
import { SessionExpiredModal } from '../components/ui/SessionExpiredModal';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <AppRootBoundary>
      <MsalProvider instance={msalInstance}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <SessionExpiredModal />
          </QueryClientProvider>
        </GoogleOAuthProvider>
      </MsalProvider>
    </AppRootBoundary>
  );
}
