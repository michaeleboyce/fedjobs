// File path: apps/web/app/store/generationStore.ts
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { DOCUMENT_TYPES } from '@fedjobs/utils';
import { Job, JobInfo, DocumentInfo, PositionSelectionState } from '@fedjobs/types';
import { getTCQEssayPrompts } from '@/app/shared/actions/usaJobsActions';

// PositionSelectionState now imported from @fedjobs/types

interface GenerationState {
  jobInfo: JobInfo;
  docInfo: DocumentInfo;
  otherInfo: string;
  model: string;
  selectedPositions: Record<string, PositionSelectionState>;
  isGenerateEnabled: boolean;
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
  
  // Model settings
  setModel: (model: string) => void;
  
  // Position selection actions
  setSelectedPositions: (selections: Record<string, PositionSelectionState>) => void;
  initializeFromResume: (positions: Array<{positionUuid: string, details: {activities: any[], accomplishments: any[]}}>) => void;
  checkGenerateEnabled: () => void;
}

export const useGenerationStore = create<GenerationState & GenerationActions>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      jobInfo: {
        jobPostingURL: '',
        jobDescription: '',
        job: undefined,
      },

      docInfo: {
        isDummy: false,
        type: DOCUMENT_TYPES[0], // Sets cover letter to default
        ecqShortTitle: 'Leading Change',
        essayPrompt: '',
        additionalDocInfo: '',
        essayPromptSuggestions: [],
        length: 500,
        lengthUnit: 'words'
      },

      otherInfo: '',
      
      model: "claude-3-7-sonnet-20250219",
      
      selectedPositions: {},
      isGenerateEnabled: false,

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
          // Ensure we have a proper job object
          console.log('Setting job in store:', job.MatchedObjectDescriptor.PositionTitle);

          // Make a deep copy to ensure reactivity
          state.jobInfo.job = JSON.parse(JSON.stringify(job));

          // Also set the URL if available
          if (job.MatchedObjectDescriptor?.PositionURI && !state.jobInfo.jobPostingURL) {
            state.jobInfo.jobPostingURL = job.MatchedObjectDescriptor.PositionURI;
          }

          // Set description if empty
          if (!state.jobInfo.jobDescription && job.MatchedObjectDescriptor?.QualificationSummary) {
            state.jobInfo.jobDescription =
              `${job.MatchedObjectDescriptor.PositionTitle}\n\n${job.MatchedObjectDescriptor.QualificationSummary}`;
          }
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
      
      setModel: (model: string) => {
        set(state => {
          state.model = model;
        });
      },
      
      setSelectedPositions: (selections) => {
        set(state => {
          state.selectedPositions = selections;
          // Check if generate button should be enabled
          get().checkGenerateEnabled();
        });
      },
      
      initializeFromResume: (positions) => {
        set(state => {
          const initialSelections = positions.reduce((acc, position) => {
            acc[position.positionUuid] = {
              selectedActivities: Array.from(
                { length: position.details.activities.length }, 
                (_, i) => i
              ),
              selectedAccomplishments: Array.from(
                { length: position.details.accomplishments.length }, 
                (_, i) => i
              ),
            };
            return acc;
          }, {} as Record<string, PositionSelectionState>);
          
          state.selectedPositions = initialSelections;
          get().checkGenerateEnabled();
        });
      },
      
      checkGenerateEnabled: () => {
        set(state => {
          const hasSelections = Object.values(state.selectedPositions).some(
            (pos) => pos.selectedActivities.length > 0 || pos.selectedAccomplishments.length > 0
          );
          state.isGenerateEnabled = hasSelections;
        });
      },
    })),
    { name: 'generation-store' }
  )
);