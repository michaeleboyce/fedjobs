// File path: apps/web/app/features/jobs/components/JobSourceManager/index.tsx
// apps/web/app/features/jobs/components/JobSourceManager/index.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getJobSources, refreshJobSource, cancelJobSourceRefresh } from '../../actions/jobSourceActions';
import { type JobSource } from '../../types';
import JobSourceList from './JobSourceList';
import JobSourceForm from './JobSourceForm';
import { Button } from '@/app/shared/components/ui/Button';
import useWebSocketConnection from '@/app/shared/hooks/useWebSocketConnection';

interface JobSourceManagerProps {
  userId: string;
}

export default function JobSourceManager({ userId }: JobSourceManagerProps) {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Connect to WebSocket for real-time updates
  const { isConnected, addMessageHandler } = useWebSocketConnection(userId);

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Include job counts with the sources
      const fetchedSources = await getJobSources(userId, true);
      setSources(fetchedSources);
    } catch (err) {
      setError('Failed to load job sources. Please try again.');
      console.error('Error fetching job sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [userId]);
  
  // Set up WebSocket handlers for real-time updates
  useEffect(() => {
    // Handler for when a new job is found during crawling
    const jobFoundHandler = addMessageHandler('job_found', (message) => {
      const { sourceId, jobTitle, organization } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          // Increment found jobs count
          const foundJobsCount = (source.foundJobsCount || 0) + 1;
          // Update progress message with latest job
          return {
            ...source,
            isProcessing: true,
            foundJobsCount,
            progressMessage: `Found job: ${jobTitle} at ${organization} (${foundJobsCount} total)`,
            lastUpdateTime: now,
            processingTimedOut: false // Reset timeout flag on activity
          };
        }
        return source;
      }));
    });
    
    // Handler for when crawling completes
    const crawlCompleteHandler = addMessageHandler('crawl_complete', (message) => {
      const { sourceId, jobCount, status, usedCache, globalCacheId, cacheExpiresAt } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          // Create message based on whether cache was used
          const progressMessage = usedCache 
            ? `Used cached data. ${jobCount} jobs added.` 
            : `Crawl complete. Found ${jobCount} jobs.`;
            
          return {
            ...source,
            status: status,
            isProcessing: false,
            jobCount: jobCount,
            progressMessage: progressMessage,
            lastUpdateTime: now,
            processingTimedOut: false,
            usedCache: usedCache || source.usedCache,
            usedCacheForLastUpdate: usedCache,
            globalCacheId: globalCacheId || source.globalCacheId,
            cacheExpiresAt: cacheExpiresAt
          };
        }
        return source;
      }));
      
      // Refresh to get the full updated source data
      fetchSources();
    });
    
    // Handler for crawl errors
    const crawlErrorHandler = addMessageHandler('crawl_error', (message) => {
      const { sourceId, error, status } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          return {
            ...source,
            status: status,
            isProcessing: false,
            errorMessage: error,
            progressMessage: `Error: ${error}`,
            lastUpdateTime: now,
            processingTimedOut: false
          };
        }
        return source;
      }));
      
      // Refresh to get the full updated source data
      fetchSources();
    });
    
    // Handler for crawl cancellation
    const crawlCancelledHandler = addMessageHandler('crawl_cancelled', (message) => {
      const { sourceId, message: cancelMessage } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          return {
            ...source,
            status: 'ACTIVE',
            isProcessing: false,
            progressMessage: cancelMessage || 'Crawl cancelled',
            lastUpdateTime: now,
            processingTimedOut: false
          };
        }
        return source;
      }));
      
      // Refresh to get the full updated source data
      fetchSources();
    });
    
    // Clean up handlers on unmount
    return () => {
      jobFoundHandler();
      crawlCompleteHandler();
      crawlErrorHandler();
      crawlCancelledHandler();
    };
  }, [addMessageHandler, userId]);

  const handleRefresh = async (sourceId: number, forceRefresh: boolean = false) => {
    try {
      const now = new Date().toISOString();
      
      // Update local state to show pending status
      setSources(prev => 
        prev.map(source => 
          source.id === sourceId 
            ? { 
                ...source, 
                status: 'PENDING',
                isProcessing: true,
                foundJobsCount: 0,
                progressMessage: forceRefresh 
                  ? 'Starting fresh job crawl (bypassing cache)...' 
                  : 'Starting job crawl...',
                processingStartTime: now,
                lastUpdateTime: now,
                processingTimedOut: false
              } 
            : source
        )
      );
      
      // Call API to start refresh with forceRefresh flag
      const result = await refreshJobSource(sourceId, forceRefresh);
      
      // Update if we used the cache
      if (result.usedCache) {
        setSources(prev => 
          prev.map(source => 
            source.id === sourceId 
              ? { 
                  ...source,
                  usedCache: true,
                  usedCacheForLastUpdate: true,
                  progressMessage: 'Using cached job data...',
                } 
              : source
          )
        );
      }
      
      // Three polling mechanisms for resilience:
      // 1. WebSockets for real-time updates (primary)
      // 2. Regular polling as backup
      // 3. Timeout detection to handle stalled jobs
      
      // Set up regular polling as backup
      const pollInterval = setInterval(async () => {
        try {
          // Fetch fresh data regardless of WebSocket connection
          // This ensures we eventually recover even if WebSockets fail
          const updatedSources = await getJobSources(userId, true);
          
          setSources(prev => {
            // Merge the updated sources with our existing state
            return prev.map(source => {
              const updatedSource = updatedSources.find(s => s.id === source.id);
              
              // If this is the source we're refreshing
              if (source.id === sourceId) {
                if (!updatedSource) return source;
                
                // If the status has changed from PENDING, stop processing
                if (source.status === 'PENDING' && updatedSource.status !== 'PENDING') {
                  return {
                    ...updatedSource,
                    isProcessing: false,
                    progressMessage: 'Refresh completed',
                    processingTimedOut: false
                  };
                }
                
                // Preserve our UI state but update any server-side changes
                return {
                  ...updatedSource,
                  isProcessing: source.isProcessing,
                  foundJobsCount: source.foundJobsCount || 0,
                  progressMessage: source.progressMessage,
                  processingStartTime: source.processingStartTime,
                  lastUpdateTime: source.lastUpdateTime
                };
              }
              
              // For other sources, use the updated data
              return updatedSource || source;
            });
          });
          
          // Check if we should stop polling
          const currentSources = sources;
          const thisSource = currentSources.find(s => s.id === sourceId);
          
          if (thisSource && thisSource.status !== 'PENDING') {
            clearInterval(pollInterval);
            clearInterval(timeoutDetectionInterval);
          }
        } catch (error) {
          console.error('Error polling for source updates:', error);
          // On error, just keep polling - we'll detect timeout separately
        }
      }, 10000); // Poll every 10 seconds
      
      // Set up timeout detection - if we don't get updates for a while, mark as timed out
      const timeoutDetectionInterval = setInterval(() => {
        setSources(prev => 
          prev.map(source => {
            if (source.id === sourceId && source.status === 'PENDING') {
              // Check if we've received an update in the last 2 minutes
              const lastUpdate = source.lastUpdateTime ? new Date(source.lastUpdateTime).getTime() : 0;
              const now = Date.now();
              const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
              
              // If it's been more than 2 minutes, mark as potentially timed out
              if (minutesSinceUpdate > 2) {
                return {
                  ...source,
                  processingTimedOut: true,
                  progressMessage: 'Job crawl may have stalled. You can cancel and try again.'
                };
              }
            }
            return source;
          })
        );
      }, 30000); // Check every 30 seconds
      
      // Set a hard timeout to stop everything after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(timeoutDetectionInterval);
        
        // Final status update - if still pending, assume it failed
        setSources(prev => 
          prev.map(source => {
            if (source.id === sourceId && source.status === 'PENDING') {
              return {
                ...source,
                status: 'ERROR',
                isProcessing: false,
                errorMessage: 'Job crawl timed out after 10 minutes',
                processingTimedOut: true
              };
            }
            return source;
          })
        );
        
        // Fetch fresh data to ensure we're up to date
        fetchSources();
      }, 600000); // 10 minutes
    } catch (err) {
      setError('Failed to refresh job source. Please try again.');
      console.error(`Error refreshing job source ${sourceId}:`, err);
      // Reset status on error
      fetchSources();
    }
  };

  // Handler for canceling/resetting a job crawl
  const handleCancelCrawl = async (sourceId: number) => {
    try {
      // Immediately update UI state to show cancellation is happening
      setSources(prev => 
        prev.map(source => 
          source.id === sourceId 
            ? { 
                ...source, 
                progressMessage: 'Cancelling crawl...',
              } 
            : source
        )
      );
      
      // Call server to cancel the crawl
      await cancelJobSourceRefresh(sourceId);
      
      // Update local state to reflect cancellation
      setSources(prev => 
        prev.map(source => 
          source.id === sourceId 
            ? { 
                ...source, 
                status: 'ACTIVE', // Set back to active
                isProcessing: false,
                foundJobsCount: undefined,
                progressMessage: 'Crawl cancelled',
                processingStartTime: undefined,
                lastUpdateTime: undefined,
                processingTimedOut: undefined
              } 
            : source
        )
      );
      
      // Register a handler for the cancellation confirmation
      const cancelHandler = addMessageHandler('crawl_cancelled', (message) => {
        if (message.data.sourceId === sourceId) {
          // Refresh to get the latest data
          fetchSources();
        }
      });
      
      // Clean up the handler after a short delay
      setTimeout(() => {
        cancelHandler();
      }, 5000);
      
      // Refresh to get the latest data anyway after a short delay
      setTimeout(() => {
        fetchSources();
      }, 1000);
    } catch (err) {
      setError('Failed to cancel job source crawl. Please try again.');
      console.error(`Error canceling job source crawl ${sourceId}:`, err);
      // Try to fetch sources to recover
      fetchSources();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchSources();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Job Sources</h2>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          Add New Source
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
          <JobSourceForm 
            userId={userId}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center">
          <p>Loading job sources...</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-md">
          <p className="text-gray-500">
            No job sources found. Add a new source to start tracking job postings.
          </p>
        </div>
      ) : (
        <JobSourceList 
          sources={sources} 
          onRefresh={handleRefresh}
          onDelete={fetchSources}
          onCancelCrawl={handleCancelCrawl}
        />
      )}
    </div>
  );
}