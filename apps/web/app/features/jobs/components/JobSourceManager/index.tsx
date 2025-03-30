// apps/web/app/features/jobs/components/JobSourceManager/index.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { getJobSources, refreshJobSource } from '../../actions/jobSourceActions';
import { type JobSource } from '../../types';
import JobSourceList from './JobSourceList';
import JobSourceForm from './JobSourceForm';
import { Button } from '../../../../shared/components/ui/Button';

interface JobSourceManagerProps {
  userId: string;
}

export default function JobSourceManager({ userId }: JobSourceManagerProps) {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedSources = await getJobSources(userId);
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

  const handleRefresh = async (sourceId: number) => {
    try {
      // Update local state to show pending status
      setSources(prev => 
        prev.map(source => 
          source.id === sourceId 
            ? { ...source, status: 'PENDING' } 
            : source
        )
      );
      
      // Call API to start refresh
      await refreshJobSource(sourceId);
      
      // Refresh the list after a short delay to allow the backend to update status
      setTimeout(() => {
        fetchSources();
      }, 1000);
    } catch (err) {
      setError('Failed to refresh job source. Please try again.');
      console.error(`Error refreshing job source ${sourceId}:`, err);
      // Reset status on error
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
        />
      )}
    </div>
  );
}