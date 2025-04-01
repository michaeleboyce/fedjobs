// File path: apps/web/app/features/jobs/components/JobSourceManager/index.tsx
"use client";

import React, { useState, useEffect } from 'react';
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
  // State management
  const [sources, setSources] = useState<JobSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // WebSocket connection for real-time updates
  const { addMessageHandler } = useWebSocketConnection(userId);

  // ===== DATA FETCHING =====
  const fetchSources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedSources = await getJobSources(userId, true); // Include job counts
      setSources(fetchedSources);
    } catch (err) {
      setError('Failed to load job sources. Please try again.');
      console.error('Error fetching job sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sources on mount
  useEffect(() => {
    fetchSources();
  }, [userId]);
  
  // ===== WEBSOCKET HANDLERS =====
  useEffect(() => {
    // Job found during crawling
    const jobFoundHandler = addMessageHandler('job_found', (message) => {
      const { sourceId, jobTitle, organization } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          const foundJobsCount = (source.foundJobsCount || 0) + 1;
          return {
            ...source,
            isProcessing: true,
            foundJobsCount,
            errorMessage: '',
            progressMessage: `Found job: ${jobTitle} at ${organization} (${foundJobsCount} total)`,
            lastUpdateTime: now,
            processingTimedOut: false
          };
        }
        return source;
      }));
    });
    
    // Crawl completed
    const crawlCompleteHandler = addMessageHandler('crawl_complete', (message) => {
      const { sourceId, jobCount, status, usedCache, globalCacheId, cacheExpiresAt } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          const progressMessage = usedCache 
            ? `Used cached data. ${jobCount} jobs added.` 
            : `Crawl complete. Found ${jobCount} jobs.`;
            
          return {
            ...source,
            status,
            isProcessing: false,
            jobCount,
            progressMessage,
            lastUpdateTime: now,
            errorMessage: '',
            processingTimedOut: false,
            usedCache: usedCache || source.usedCache,
            usedCacheForLastUpdate: usedCache,
            globalCacheId: globalCacheId || source.globalCacheId,
            cacheExpiresAt
          };
        }
        return source;
      }));
      
      fetchSources(); // Refresh to get full updated data
    });
    
    // Crawl error
    const crawlErrorHandler = addMessageHandler('crawl_error', (message) => {
      const { sourceId, error, status } = message.data;
      const now = new Date().toISOString();
      
      setSources(prev => prev.map(source => {
        if (source.id === sourceId) {
          return {
            ...source,
            status,
            isProcessing: false,
            errorMessage: error,
            progressMessage: `Error: ${error}`,
            lastUpdateTime: now,
            processingTimedOut: false
          };
        }
        return source;
      }));
      
      fetchSources(); // Refresh to get full updated data
    });
    
    // Crawl cancelled
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
            errorMessage: '',
            lastUpdateTime: now,
            processingTimedOut: false
          };
        }
        return source;
      }));
      
      fetchSources(); // Refresh to get full updated data
    });
    
    // Clean up handlers on unmount
    return () => {
      jobFoundHandler();
      crawlCompleteHandler();
      crawlErrorHandler();
      crawlCancelledHandler();
    };
  }, [addMessageHandler, userId]);

  // ===== HANDLERS =====
  
  // Refresh a job source (start crawling)
  const handleRefresh = async (sourceId: number, forceRefresh: boolean = false) => {
    try {
      const now = new Date().toISOString();
      
      // Update UI to show pending status
      updateSourceStatus(sourceId, {
        status: 'PENDING',
        isProcessing: true,
        foundJobsCount: 0,
        errorMessage: '',
        progressMessage: forceRefresh 
          ? 'Starting fresh job crawl (bypassing cache)...' 
          : 'Starting job crawl...',
        processingStartTime: now,
        lastUpdateTime: now,
        processingTimedOut: false
      });
      
      // Call API to start refresh
      const result = await refreshJobSource(sourceId, forceRefresh);
      
      // Update if we used the cache
      if (result.usedCache) {
        updateSourceStatus(sourceId, {
          usedCache: true,
          usedCacheForLastUpdate: true,
          progressMessage: 'Using cached job data...',
        });
      }
      
      // Set up monitoring for the refresh process
      setupRefreshMonitoring(sourceId);
    } catch (err) {
      setError('Failed to refresh job source. Please try again.');
      console.error(`Error refreshing job source ${sourceId}:`, err);
      fetchSources(); // Reset status on error
    }
  };
  
  // Helper to update a single source's status
  const updateSourceStatus = (sourceId: number, updates: Partial<JobSource>) => {
    setSources(prev => prev.map(source => 
      source.id === sourceId ? { ...source, ...updates } : source
    ));
  };
  
  // Setup monitoring for a refresh operation
  const setupRefreshMonitoring = (sourceId: number) => {
    // Set up regular polling as backup to WebSockets
    const pollInterval = setInterval(async () => {
      try {
        const updatedSources = await getJobSources(userId, true);
        
        setSources(prev => {
          return prev.map(source => {
            const updatedSource = updatedSources.find(s => s.id === source.id);
            
            if (source.id === sourceId) {
              if (!updatedSource) return source;
              
              // If status changed from PENDING, stop processing
              if (source.status === 'PENDING' && updatedSource.status !== 'PENDING') {
                return {
                  ...updatedSource,
                  isProcessing: false,
                  progressMessage: 'Refresh completed',
                  processingTimedOut: false
                };
              }
              
              // Preserve UI state but update server-side changes
              return {
                ...updatedSource,
                isProcessing: source.isProcessing,
                foundJobsCount: source.foundJobsCount || 0,
                progressMessage: source.progressMessage,
                processingStartTime: source.processingStartTime,
                lastUpdateTime: source.lastUpdateTime
              };
            }
            
            // For other sources, use updated data
            return updatedSource || source;
          });
        });
        
        // Check if we should stop polling
        const thisSource = sources.find(s => s.id === sourceId);
        if (thisSource && thisSource.status !== 'PENDING') {
          clearInterval(pollInterval);
          clearInterval(timeoutDetectionInterval);
        }
      } catch (error) {
        console.error('Error polling for source updates:', error);
        // Keep polling - we'll detect timeout separately
      }
    }, 10000); // Poll every 10 seconds
    
    // Set up timeout detection
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
    
    // Set a hard timeout after 10 minutes
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
      
      fetchSources(); // Get fresh data
    }, 600000); // 10 minutes
  };

  // Cancel an ongoing crawl
  const handleCancelCrawl = async (sourceId: number) => {
    try {
      // Update UI immediately
      updateSourceStatus(sourceId, {
        progressMessage: 'Cancelling crawl...',
      });
      
      // Call server to cancel
      await cancelJobSourceRefresh(sourceId);
      
      // Update local state
      updateSourceStatus(sourceId, {
        status: 'ACTIVE',
        isProcessing: false,
        foundJobsCount: undefined,
        progressMessage: 'Crawl cancelled',
        processingStartTime: undefined,
        lastUpdateTime: undefined,
        processingTimedOut: undefined
      });
      
      // Handle cancellation confirmation
      const cancelHandler = addMessageHandler('crawl_cancelled', (message) => {
        if (message.data.sourceId === sourceId) {
          fetchSources();
        }
      });
      
      // Clean up after a delay
      setTimeout(() => {
        cancelHandler();
        fetchSources();
      }, 5000);
    } catch (err) {
      setError('Failed to cancel job source crawl. Please try again.');
      console.error(`Error canceling job source crawl ${sourceId}:`, err);
      fetchSources(); // Try to recover
    }
  };

  // Handle form submission
  const handleFormSuccess = () => {
    setShowForm(false);
    fetchSources();
  };

  // ===== RENDER =====
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