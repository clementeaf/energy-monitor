import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const status = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
        if (status === 503 || status === 502 || status === 504) {
          return failureCount < 3;
        }
        return failureCount < 1;
      },
      retryDelay: (failureCount) =>
        Math.min(1000 * 2 ** failureCount, 10000),
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
