// File path: apps/web/app/features/jobs/components/JobBoard/JobSimilarList.tsx
// apps/web/app/features/jobs/components/JobBoard/JobSimilarList.tsx
"use client";

import React from 'react';
import { type Job } from '../../types';

interface JobSimilarListProps {
  jobs: Job[];
  currentJobId: number;
  onSelectJob: (job: Job) => void;
}

export default function JobSimilarList({ jobs, currentJobId, onSelectJob }: JobSimilarListProps) {
  // Filter out the current job if it somehow appears in the list
  const filteredJobs = jobs.filter(job => job.id !== currentJobId);
  
  if (filteredJobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {filteredJobs.map((job) => (
        <div
          key={job.id}
          onClick={() => onSelectJob(job)}
          className="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
        >
          <div className="font-medium">{job.title}</div>
          <div className="text-sm text-gray-600">
            {job.organization}
            {job.location && ` • ${job.location}`}
          </div>
          {job.salary && (
            <div className="text-sm text-green-600 mt-1">
              {job.salary}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}