// File path: apps/web/app/(routes)/generate/resume/[id]/PageClient.tsx
'use client'
import React from 'react';
import { GenerationProvider } from '@/app/(routes)/generate/_Providers/GenerationProvider'
import { ResumeObject } from '@/app/_classes/Resume';
import GenerationManager  from '@/app/(routes)/generate/resume/[id]/_Components/GenerationManager'; // Adjust the import path as needed
import { QueryClient, QueryClientProvider } from 'react-query';
const queryClient = new QueryClient();

type PageClientProps = {
  resume: ResumeObject;
  userEmail: string;
};

export const PageClient: React.FC<PageClientProps> = ({ resume, userEmail }) => {

  return (
      <GenerationProvider>
          <QueryClientProvider client={queryClient}>
            <GenerationManager resume={resume} userEmail={userEmail} />
          </QueryClientProvider>
      </GenerationProvider>

  );
}

