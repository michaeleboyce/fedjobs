// File path: apps/web/app/features/generation/components/DocumentInfo/JobInfoInput.tsx
import React from 'react';
import { useGenerationContext } from '../../providers/GenerationProvider';
import { JobSearch } from './JobSearch';

export function JobInfoInput() {
  const { jobInfo, setJobDescription } = useGenerationContext();

  return (
    <div className="w-full text-left mb-6"> 
      <h4 className="text-md font-semibold mb-4">Input Job Information</h4>
      
      {/* Job search component */}
      <JobSearch />
      
      {/* Job URL (disabled, updated by JobSearch) */}
      <input
        type="text"
        disabled
        value={jobInfo.jobPostingURL}
        className="mb-4 mt-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white bg-gray-100"
        placeholder="Job Posting URL (select job above)"
      />
      
      {/* Job description */}
      <textarea
        value={jobInfo.jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste in the job description/information"
        className="mb-4 w-full text-base p-2 border border-gray-300 rounded-md bg-white"
      />
    </div>
  );
}