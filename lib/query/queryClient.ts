import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - tokens rarely change
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
      retry: 1, // Retry once on failure
      refetchOnWindowFocus: false, // Don't refetch on window focus
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});
