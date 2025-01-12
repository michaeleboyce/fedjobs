// File path: apps/web/app/(routes)/generate/_Providers/GenerationProvider.tsx
'use client'
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DocumentInfo } from '@/app/_types/DocumentInfo';
import { DOCUMENT_TYPES } from '@/app/_utils/Constants';
import { Job, JobInfo } from '@fedjobs/types';
import { getTCQEssayPrompts } from '@/app/_actions/usaJobsActions';

type GenerationContextType = {
  jobInfo: JobInfo;
  setJobPostingUrl: (url: string) => void;
  setJobDescription: (description: string) => void;
  setJob: (job: Job) => void;
  setTcqEssayPrompt: () => void;
  docInfo: DocumentInfo;  
  setDocInfo: React.Dispatch<React.SetStateAction<DocumentInfo>>;
  otherInfo: string;
  setOtherInfo: React.Dispatch<React.SetStateAction<string>>;
};

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export const useGenerationContext = () => {
    const context = useContext(GenerationContext);
    if (!context) {
        throw new Error('useGenerationContext must be used within a GenerationProvider');
    }
    return context;
};
type GenerationProviderProps = {
    children: ReactNode;
};

export const GenerationProvider: React.FC<GenerationProviderProps> = ({ children }) => {

  const [jobInfo, setJobInfo] = useState<JobInfo>({
    jobPostingURL: '',
    jobDescription: '',
    job: undefined,
  });

  const [docInfo, setDocInfo] = useState<DocumentInfo>({
    isDummy: false,
    type: DOCUMENT_TYPES[1], //Sets to 1, so that the Doc Info dropdown defaults properly to ECQ
    ecqShortTitle: 'Leading Change',
    essayPrompt: '',
    additionalDocInfo: '',
    essayPromptSuggestions: [],
    length: 500, 
    lengthUnit: 'words'
  })

  const [otherInfo, setOtherInfo] = useState<string>('');

  const setTcqEssayPrompt = async ()=> {
    if (!jobInfo.job) return;

    const job = jobInfo.job;
    if (docInfo.type.toLocaleLowerCase() === 'tcq' && job.MatchedObjectDescriptor.UserArea.Details.HiringPath.some(value => value === 'ses')    ){
      try {
          console.log(job);
          const prompts = await getTCQEssayPrompts(`${job.MatchedObjectDescriptor.UserArea.Details.Evaluations} \n ${job.MatchedObjectDescriptor.QualificationSummary}`);
          setDocInfo({...docInfo, essayPromptSuggestions: prompts });
      } catch (error) {
          console.error(`Error fetching TCQ essay topics: `, error)
      }
  } 
  }
  const setJob = async (job: Job) => {
    // const details = job.MatchedObjectDescriptor;
    // const jobInfoString = [
    //     `${details.PositionTitle}, ${details.DepartmentName}`,
    //     `Location: ${details.PositionLocationDisplay}`,
    //     `Organization: ${details.OrganizationName}`,
    //     `SubAgency: ${details.SubAgency}`,
    //     `Grade: ${details.JobGrade?.[0].Code ?? ''}`,
    //     `Schedule: ${details.PositionSchedule?.[0].Name ?? ''}`,
    //     `Open Period: ${formatDateMMDDYYYY(details.PositionStartDate)} - ${formatDateMMDDYYYY(details.PositionEndDate)}`,
    //     `Qualifications: ${details.QualificationSummary}`,
    //     `Agency Marketing Statement: ${details.UserArea.Details.AgencyMarketingStatement}`,
    //     `Major Duties: ${details.UserArea.Details.MajorDuties.join(' ')}`,
    //     `Evaluations: ${details.UserArea.Details.Evaluations}`,
    // ].join('\n');
    //setJobDescription(jobInfoString);
    setJobInfo({...jobInfo, job});
    // Update other states as necessary
};

  const setJobPostingUrl = (url: string) => {
    setJobInfo({...jobInfo, jobPostingURL: url});
  }

  const setJobDescription = (description: string) => {
    setJobInfo({...jobInfo, jobDescription: description});
  }
  const value = {
    jobInfo,
    setJobPostingUrl,
    setJobDescription,
    setJob,
    setTcqEssayPrompt,
    docInfo,
    setDocInfo,
    otherInfo,
    setOtherInfo
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
};
