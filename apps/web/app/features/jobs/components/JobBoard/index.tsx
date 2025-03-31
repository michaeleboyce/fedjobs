// File path: apps/web/app/features/jobs/components/JobBoard/index.tsx
// apps/web/app/features/jobs/components/JobBoard/index.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { searchJobs, getRecommendedJobs } from '../../actions/jobActions';
import { type Job, type JobSearchParams } from '../../types';
import JobFilter from './JobFilter';
import JobList from './JobList';
import JobDetailPanel from './JobDetailPanel';

interface JobBoardProps {
  userId: string;
}

export default function JobBoard({ userId }: JobBoardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<JobSearchParams>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'search' | 'recommended'>('search');

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Always include the userId in search params
      const params = { ...searchParams, userId };
      const fetchedJobs = await searchJobs(params);
      setJobs(fetchedJobs);
    } catch (err) {
      setError('Failed to load jobs. Please try again.');
      console.error('Error fetching jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendedJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedJobs = await getRecommendedJobs(userId);
      setRecommendedJobs(fetchedJobs);
    } catch (err) {
      setError('Failed to load recommended jobs. Please try again.');
      console.error('Error fetching recommended jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load based on view mode
    if (viewMode === 'search') {
      fetchJobs();
    } else {
      fetchRecommendedJobs();
    }
  }, [viewMode, userId]);

  // When search params change, fetch jobs if in search mode
  useEffect(() => {
    if (viewMode === 'search') {
      fetchJobs();
    }
  }, [searchParams, viewMode]);

  const handleSearch = (params: JobSearchParams) => {
    setSearchParams(params);
    setViewMode('search');
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleCloseJobDetail = () => {
    setSelectedJob(null);
  };

  const handleJobFeedbackUpdate = () => {
    // Refresh both job lists when feedback is provided
    if (viewMode === 'search') {
      fetchJobs();
    } else {
      fetchRecommendedJobs();
    }
    
    // Always refresh recommended jobs since they're based on feedback
    fetchRecommendedJobs();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Jobs</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('search')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'search' 
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Search Jobs
          </button>
          <button
            onClick={() => setViewMode('recommended')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'recommended' 
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recommended
          </button>
        </div>
      </div>

      {viewMode === 'search' && (
        <JobFilter onSearch={handleSearch} initialValues={searchParams} />
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 flex">
        <div className={`flex-1 ${selectedJob ? 'hidden md:block' : ''}`}>
          {isLoading ? (
            <div className="p-8 text-center">
              <p>Loading jobs...</p>
            </div>
          ) : viewMode === 'search' && jobs.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-md">
              <p className="text-gray-500">
                No jobs found matching your criteria. Try adjusting your search filters.
              </p>
            </div>
          ) : viewMode === 'recommended' && recommendedJobs.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-md">
              <p className="text-gray-500">
                No recommended jobs yet. Provide feedback on jobs you're interested in to get recommendations.
              </p>
            </div>
          ) : (
            <JobList 
              jobs={viewMode === 'search' ? jobs : recommendedJobs} 
              onSelectJob={handleSelectJob}
              selectedJobId={selectedJob?.id || null}
            />
          )}
        </div>

        {selectedJob && (
          <div className={`w-full md:w-1/2 lg:w-2/5 border-l border-gray-200 ${selectedJob ? 'block' : 'hidden'}`}>
            <JobDetailPanel 
              job={selectedJob} 
              userId={userId}
              onClose={handleCloseJobDetail}
              onFeedbackUpdate={handleJobFeedbackUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}