// File path: apps/web/app/features/generation/hooks/useGenerationManagement.ts
'use client';

import { useGenerationStore } from '@/app/store';
import { Job, DocumentInfo } from '@fedjobs/types';

/**
 * Hook for managing generation state using Zustand store
 * This hook provides a clean API for components to interact with the store
 * while encapsulating implementation details
 */
export function useGenerationManagement() {
  const {
    jobInfo,
    docInfo,
    otherInfo,
    model,
    selectedPositions,
    isGenerateEnabled,
    setJobPostingUrl,
    setJobDescription,
    setJob,
    setTcqEssayPrompt,
    setDocInfo,
    setOtherInfo,
    setModel,
    setSelectedPositions,
    initializeFromResume,
    checkGenerateEnabled,
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
    try {
      // First update job in the store
      setJob(job);
      
      // Also update the job posting URL if it has a position URI
      if (job.MatchedObjectDescriptor?.PositionURI) {
        setJobPostingUrl(job.MatchedObjectDescriptor.PositionURI);
      }
      
      // Set job description from qualifications summary if empty
      if (!jobInfo.jobDescription && job.MatchedObjectDescriptor?.QualificationSummary) {
        setJobDescription(job.MatchedObjectDescriptor.QualificationSummary);
      }
      
      // Fetch TCQ essay prompts if applicable
      await setTcqEssayPrompt();
      
      console.log('Job updated in store:', job.MatchedObjectDescriptor.PositionTitle);
      return true;
    } catch (error) {
      console.error('Error updating job:', error);
      return false;
    }
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

  // Position selection handler
  const handleSelectionChange = (newSelectedPositions: typeof selectedPositions) => {
    setSelectedPositions(newSelectedPositions);
  };

  return {
    // State
    jobInfo,
    docInfo,
    otherInfo,
    model,
    selectedPositions,
    isGenerateEnabled,
    
    // Actions
    updateJobPostingUrl,
    updateJobDescription,
    updateJob,
    updateDocInfo,
    updateOtherInfo,
    setModel,
    handleSelectionChange,
    initializeFromResume,
    
    // Direct store actions (for more complex updates)
    setDocInfo,
    setTcqEssayPrompt,
  };
}