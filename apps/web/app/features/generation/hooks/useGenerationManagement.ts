// File path: apps/web/app/features/generation/hooks/useGenerationManagement.ts
'use client';

import { useGenerationStore } from '@/app/store';
import { Job } from '@fedjobs/types';
import { DocumentInfo } from '@/app/features/generation/types/DocumentInfo';

export function useGenerationManagement() {
  const {
    jobInfo,
    docInfo,
    otherInfo,
    setJobPostingUrl,
    setJobDescription,
    setJob,
    setTcqEssayPrompt,
    setDocInfo,
    setOtherInfo,
  } = useGenerationStore();

  // Set job info with a URL
  const updateJobPostingUrl = (url: string) => {
    setJobPostingUrl(url);
  };

  // Set job info with a description
  const updateJobDescription = (description: string) => {
    setJobDescription(description);
  };

  // Set job and fetch TCQ essay prompts if applicable
  const updateJob = async (job: Job) => {
    setJob(job);
    await setTcqEssayPrompt();
  };

  // Update document info
  const updateDocInfo = (newDocInfo: Partial<DocumentInfo>) => {
    setDocInfo(current => ({
      ...current,
      ...newDocInfo
    }));
  };

  // Update other info
  const updateOtherInfo = (info: string) => {
    setOtherInfo(info);
  };

  return {
    // State
    jobInfo,
    docInfo,
    otherInfo,
    
    // Actions
    updateJobPostingUrl,
    updateJobDescription,
    updateJob,
    updateDocInfo,
    updateOtherInfo,
    
    // Direct store actions (for more complex updates)
    setDocInfo,
    setTcqEssayPrompt,
  };
}