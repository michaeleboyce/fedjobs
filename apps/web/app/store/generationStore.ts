'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DOCUMENT_TYPES } from '@fedjobs/utils';
import { Job, JobInfo } from '@fedjobs/types';
import { DocumentInfo } from '@/app/features/generation/types/DocumentInfo';
import { getTCQEssayPrompts } from '@/app/shared/actions/usaJobsActions';

interface GenerationState {
  jobInfo: JobInfo;
  docInfo: DocumentInfo;
  otherInfo: string;
}

interface GenerationActions {
  // Job info actions
  setJobPostingUrl: (url: string) => void;
  setJobDescription: (description: string) => void;
  setJob: (job: Job) => void;
  setTcqEssayPrompt: () => Promise<void>;
  
  // Document info actions
  setDocInfo: (docInfo: DocumentInfo | ((prev: DocumentInfo) => DocumentInfo)) => void;
  setOtherInfo: (otherInfo: string) => void;
}

export const useGenerationStore = create<GenerationState & GenerationActions>()(
  immer((set, get) => ({
    // Initial state
    jobInfo: {
      jobPostingURL: '',
      jobDescription: '',
      job: undefined,
    },
    
    docInfo: {
      isDummy: false,
      type: DOCUMENT_TYPES[1], // Sets to ECQ as default
      ecqShortTitle: 'Leading Change',
      essayPrompt: '',
      additionalDocInfo: '',
      essayPromptSuggestions: [],
      length: 500,
      lengthUnit: 'words'
    },
    
    otherInfo: '',
    
    // Actions
    setJobPostingUrl: (url: string) => {
      set(state => {
        state.jobInfo.jobPostingURL = url;
      });
    },
    
    setJobDescription: (description: string) => {
      set(state => {
        state.jobInfo.jobDescription = description;
      });
    },
    
    setJob: (job: Job) => {
      set(state => {
        state.jobInfo.job = job;
      });
    },
    
    setTcqEssayPrompt: async () => {
      const { jobInfo, docInfo } = get();
      
      if (!jobInfo.job) return;
      
      const job = jobInfo.job;
      
      if (
        docInfo.type.toLowerCase() === 'tcq' && 
        job.MatchedObjectDescriptor.UserArea.Details.HiringPath.some(value => value === 'ses')
      ) {
        try {
          console.log(job);
          const prompts = await getTCQEssayPrompts(
            `${job.MatchedObjectDescriptor.UserArea.Details.Evaluations} \n ${job.MatchedObjectDescriptor.QualificationSummary}`
          );
          
          set(state => {
            state.docInfo.essayPromptSuggestions = prompts;
          });
        } catch (error) {
          console.error(`Error fetching TCQ essay topics: `, error);
        }
      }
    },
    
    setDocInfo: (docInfoUpdate) => {
      set(state => {
        if (typeof docInfoUpdate === 'function') {
          state.docInfo = docInfoUpdate(state.docInfo);
        } else {
          state.docInfo = docInfoUpdate;
        }
      });
    },
    
    setOtherInfo: (otherInfo: string) => {
      set(state => {
        state.otherInfo = otherInfo;
      });
    },
  }))
);