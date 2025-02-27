// File path: apps/web/app/(routes)/generate/resume/[id]/PageClient.tsx
'use client'
import React from 'react';
import { GenerationProvider } from '@/app/(routes)/generate/_Providers/GenerationProvider'
import { ResumeObject } from '@/app/_classes/Resume';
import { DocumentGenerationManager } from '../../DocumentGenerationManager';
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
        <DocumentGenerationManager 
          resume={resume}
          userEmail={userEmail}
          employmentHistory={[]}  // Empty arrays since we're using the resume prop
          otherPositions={[]}     // These will be used for similar positions if needed
        />
      </QueryClientProvider>
    </GenerationProvider>
  );
}