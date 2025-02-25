// File path: apps/web/app/(routes)/generate/_Components/_Subcomponents/_AdditionalInfoBox/JobInfoInput.tsx
import React from 'react';
import { JobSearch } from '@/app/(routes)/generate/_Shared/_Subcomponents/_AdditionalInfoBox/JobSearch';
import { useGenerationContext } from '@/app/(routes)/generate/_Providers/GenerationProvider'; // Adjust the import path as needed



export const JobInfoInput: React.FC = ({}) => {
  const { jobInfo, setJobDescription, setJobPostingUrl} = useGenerationContext();


  return (
    <div className="w-full text-left"> 
      <h4 className="text-md font-semibold mb-4">Input Job Information</h4>
      <JobSearch />
      <input
        type="text"
        disabled={true}
        value={jobInfo.jobPostingURL}
        onChange={(e) => setJobPostingUrl(e.target.value)}
        placeholder="Job Posting URL (if not selected above)"
        className="mb-4 mt-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
      />
      <textarea
        value={jobInfo.jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste in the job description/information"
        className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
      />
    </div>
  );
};
