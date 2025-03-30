// apps/web/app/features/jobs/components/JobBoard/JobList.tsx
"use client";

import React from 'react';
import { format, parseISO } from 'date-fns';
import { type Job } from '../../types';

interface JobListProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  selectedJobId: number | null;
}

export default function JobList({ jobs, onSelectJob, selectedJobId }: JobListProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="overflow-y-auto h-full">
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={`p-4 border rounded-md cursor-pointer transition-colors ${
              selectedJobId === job.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
            onClick={() => onSelectJob(job)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-lg">{job.title}</h3>
              <div className="text-sm text-gray-500">
                {job.datePosted ? formatDate(job.datePosted) : 'Recent'}
              </div>
            </div>
            
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{job.organization}</span>
                {job.location && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{job.location}</span>
                  </>
                )}
                {job.type && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                      {job.type.replace('_', ' ')}
                    </span>
                  </>
                )}
              </div>
              
              <p className="text-gray-700 line-clamp-2">
                {job.description.length > 150
                  ? `${job.description.slice(0, 150)}...`
                  : job.description}
              </p>
              
              {job.salary && (
                <div className="mt-2 text-green-600 font-medium">
                  {job.salary}
                </div>
              )}
              
              {job.skills && job.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.skills.slice(0, 3).map((skill, index) => (
                    <span 
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                      +{job.skills.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}