// File path: apps/web/app/(routes)/generate/resume/[id]/PageClient.tsx
'use client'
import React from 'react';
import { GenerationProvider } from '@/app/features/generation/providers/GenerationProvider'
import { ResumeObject } from '@/app/shared/types/Resume';
import { DocumentGenerationManager } from '../../../../features/generation/components/DocumentGenerationManager';
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