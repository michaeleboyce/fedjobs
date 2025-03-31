// File path: apps/web/app/features/jobs/components/JobSourceManager/JobSourceList.tsx
// apps/web/app/features/jobs/components/JobSourceManager/JobSourceList.tsx
"use client";

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { type JobSource } from '../../types';
import { Button } from '../../../../shared/components/ui/Button';
import { deleteJobSource } from '../../actions/jobSourceActions';

interface JobSourceListProps {
  sources: JobSource[];
  onRefresh: (sourceId: number, forceRefresh?: boolean) => void;
  onDelete: () => void;
  onCancelCrawl: (sourceId: number) => void;
}

/**
 * Calculates and formats time elapsed since a given start time
 */
function getTimeElapsed(startTimeStr: string): string {
  const startTime = new Date(startTimeStr).getTime();
  const now = Date.now();
  const elapsedMs = now - startTime;
  
  // Format as minutes:seconds
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  
  // If more than 5 minutes have passed, show a warning indication
  const isLongRunning = minutes >= 5;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}${isLongRunning ? ' (!long-running)' : ''}`;
}

export default function JobSourceList({ sources, onRefresh, onDelete, onCancelCrawl }: JobSourceListProps) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleDelete = async (sourceId: number) => {
    if (confirm('Are you sure you want to delete this job source? All associated job postings will be removed.')) {
      try {
        setIsDeleting(sourceId);
        await deleteJobSource(sourceId);
        onDelete();
      } catch (error) {
        console.error('Error deleting job source:', error);
        alert('Failed to delete job source. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Menu for refresh options
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <div 
          key={source.id} 
          className="p-4 border border-gray-200 rounded-md bg-white shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-lg">{source.name}</h3>
              <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{source.url}</p>
              
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(source.status)}`}>
                  {source.status}
                </span>
                
                {source.keywords && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    Keywords: {source.keywords}
                  </span>
                )}
                
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                  {source.refreshFrequency}
                </span>
                
                {/* Badge to show if source used cache */}
                {source.usedCacheForLastUpdate && (
                  <span 
                    className="text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-800 cursor-help"
                    title="This source used data from the global job cache. To fetch fresh data, use the 'Force Fresh Crawl' option."
                  >
                    From Cache
                  </span>
                )}
              </div>
              
              {source.lastScraped && (
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {format(parseISO(source.lastScraped), 'MMM d, yyyy h:mm a')}
                  {source.usedCacheForLastUpdate && source.cacheExpiresAt && (
                    <span className="ml-2 text-cyan-600">
                      (Cache expires: {format(parseISO(source.cacheExpiresAt), 'MMM d, yyyy h:mm a')})
                    </span>
                  )}
                </p>
              )}
              
              {source.errorMessage && (
                <p className="text-xs text-red-500 mt-2">
                  Error: {source.errorMessage}
                </p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <div className="flex space-x-2">
                {/* Refresh dropdown - either standard refresh or force refresh */}
                <div className="relative">
                  {/* Main refresh button */}
                  <Button
                    onClick={() => {
                      if (source.status === 'PENDING' || source.isProcessing) {
                        return;
                      }
                      
                      if (openMenu === source.id) {
                        // Close menu if clicking the button while menu is open
                        setOpenMenu(null);
                      } else {
                        // Normal refresh if not showing menu
                        onRefresh(source.id);
                      }
                    }}
                    onMouseEnter={() => setOpenMenu(source.id)}
                    disabled={source.status === 'PENDING' || source.isProcessing}
                    variant="outline"
                    size="sm"
                    className={`${source.status === 'PENDING' || source.isProcessing ? 'animate-pulse' : ''} relative`}
                  >
                    {source.status === 'PENDING' || source.isProcessing ? 'Crawling...' : 'Refresh Now'}
                  </Button>
                  
                  {/* Dropdown menu for refresh options */}
                  {openMenu === source.id && !(source.status === 'PENDING' || source.isProcessing) && (
                    <div 
                      className="absolute z-10 right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                      onMouseLeave={() => setOpenMenu(null)}
                    >
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        <button
                          onClick={() => {
                            onRefresh(source.id);
                            setOpenMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          Standard Refresh
                        </button>
                        <button
                          onClick={() => {
                            onRefresh(source.id, true);
                            setOpenMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
                          role="menuitem"
                        >
                          Force Fresh Crawl
                          <span className="block text-xs text-gray-500">Skip cache, fetch fresh data</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Cancel/Reset button that appears during processing */}
                {(source.status === 'PENDING' || source.isProcessing) && (
                  <Button
                    onClick={() => onCancelCrawl(source.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              
              {/* Show job count badge if available */}
              {source.jobCount !== undefined && source.status !== 'PENDING' && !source.isProcessing && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  {source.jobCount} jobs
                </span>
              )}
              
              {/* Progress bar and details for jobs being processed */}
              {(source.status === 'PENDING' || source.isProcessing) && (
                <div className="mt-2 w-full">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-progress-indeterminate"></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 mt-1">
                      {source.progressMessage || 'Searching for job listings. This may take a few minutes...'}
                    </p>
                    
                    {/* Time elapsed indicator */}
                    {source.processingStartTime && (
                      <p className="text-xs text-gray-400 mt-1">
                        {getTimeElapsed(source.processingStartTime)}
                      </p>
                    )}
                  </div>
                  
                  {source.foundJobsCount !== undefined && source.foundJobsCount > 0 && (
                    <div className="text-xs text-gray-600 mt-1 font-medium">
                      Found {source.foundJobsCount} job listings so far
                    </div>
                  )}
                </div>
              )}
              
              <Button
                onClick={() => handleDelete(source.id)}
                disabled={isDeleting === source.id}
                variant="outline"
                size="sm"
                className="text-red-500 hover:bg-red-50"
              >
                {isDeleting === source.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}