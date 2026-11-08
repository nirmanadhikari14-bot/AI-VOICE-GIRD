import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const desktopQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8000,
      gcTime: 5 * 60 * 1000,
      retry: (count, err: any) => {
        if (err?.status === 401 || err?.status === 403) return false;
        return count < 2;
      },
      refetchOnWindowFocus: true,
    },
  },
});

export const clearDesktopQueryCache = () => {
  desktopQueryClient.clear();
};

export const QueryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={desktopQueryClient}>{children}</QueryClientProvider>;
};

