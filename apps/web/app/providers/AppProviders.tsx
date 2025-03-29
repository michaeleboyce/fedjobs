// File path: apps/web/app/providers/AppProviders.tsx
'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

/**
 * AppProviders component that wraps the application with global providers
 * 
 * This component is responsible for setting up:
 * 1. React Query provider for data fetching
 * 2. Other global providers as needed
 * 
 * Note: State management is now primarily handled through Zustand stores
 * accessed via custom hooks, reducing the need for Context providers.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  // Create a client for React Query that persists between renders but is
  // recreated if the component unmounts/remounts
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
