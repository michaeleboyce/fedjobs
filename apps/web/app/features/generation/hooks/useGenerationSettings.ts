// File path: apps/web/app/features/generation/hooks/useGenerationSettings.ts
import { useState, useEffect } from 'react';
import { DOCUMENT_TYPES } from '@fedjobs/types';
import { DocumentInfo } from '@fedjobs/types';
import { Job, JobInfo } from '@fedjobs/types';
import { getTCQEssayPrompts } from '@/app/shared/actions/usaJobsActions';

export function useGenerationSettings() {
  // Job information
  const [jobInfo, setJobInfo] = useState<JobInfo>({
    jobPostingURL: '',
    jobDescription: '',
    job: undefined,
  });
  
  // Document information
  const [docInfo, setDocInfo] = useState<DocumentInfo>({
    isDummy: false,
    type: DOCUMENT_TYPES[0], // Default to Cover Letter
    ecqShortTitle: undefined,
    essayPrompt: '',
    essayPromptSuggestions: [],
    additionalDocInfo: '',
    length: 500, 
    lengthUnit: 'words'
  });
  
  // Other information
  const [otherInfo, setOtherInfo] = useState<string>('');
  
  // Update job information
  const setJobPostingUrl = (url: string) => {
    setJobInfo(prev => ({ ...prev, jobPostingURL: url }));
  };
  
  const setJobDescription = (description: string) => {
    setJobInfo(prev => ({ ...prev, jobDescription: description }));
  };
  
  // Update job and potentially fetch TCQ prompts
  const setJob = async (job: Job) => {
    console.log('setJob called in useGenerationSettings with job:', 
                job.MatchedObjectDescriptor.PositionTitle);
    
    setJobInfo(prev => {
      const updated = { ...prev, job };
      console.log('Updated jobInfo in useGenerationSettings:', 
                 JSON.stringify({ 
                   title: job.MatchedObjectDescriptor.PositionTitle,
                   url: updated.jobPostingURL 
                 }));
      return updated;
    });
    
    // Check if TCQ prompts should be fetched
    if (docInfo.type.toLowerCase() === 'tcq' && 
        job.MatchedObjectDescriptor.UserArea.Details.HiringPath.some(value => value === 'ses')) {
      try {
        const prompts = await getTCQEssayPrompts(
          `${job.MatchedObjectDescriptor.UserArea.Details.Evaluations} \n ${job.MatchedObjectDescriptor.QualificationSummary}`
        );
        
        setDocInfo(prev => ({
          ...prev,
          essayPromptSuggestions: prompts
        }));
      } catch (error) {
        console.error('Error fetching TCQ essay prompts:', error);
      }
    }
  };
  
  // Update document information
  const updateDocInfo = (updates: Partial<DocumentInfo>) => {
    setDocInfo(prev => ({
      ...prev,
      ...updates
    }));
  };
  
  // Return settings state and handlers
  return {
    jobInfo,
    docInfo,
    otherInfo,
    
    setJobPostingUrl,
    setJobDescription,
    setJob,
    updateDocInfo,
    setOtherInfo,
  };
}