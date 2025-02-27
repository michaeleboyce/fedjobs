'use client';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { PositionsProvider } from '../features/positions/context';
import { GenerationProvider } from '../features/generation/providers/GenerationProvider';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PositionsProvider>
        <GenerationProvider>
          {children}
        </GenerationProvider>
      </PositionsProvider>
    </QueryClientProvider>
  );
}
