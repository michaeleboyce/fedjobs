// File path: apps/web/app/features/jobs/components/JobBoard/JobDetailPanel.tsx
// apps/web/app/features/jobs/components/JobBoard/JobDetailPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { type Job } from '../../types';
import { Button } from '../../../../shared/components/ui/Button';
import { Textarea } from '../../../../shared/components/ui/Textarea';
import { provideJobFeedback, getSimilarJobs } from '../../actions/jobActions';
import JobSimilarList from './JobSimilarList';

interface JobDetailPanelProps {
  job: Job;
  userId: string;
  onClose: () => void;
  onFeedbackUpdate: () => void;
}

export default function JobDetailPanel({ job, userId, onClose, onFeedbackUpdate }: JobDetailPanelProps) {
  const [feedbackMode, setFeedbackMode] = useState<'INTERESTED' | 'NOT_INTERESTED' | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  useEffect(() => {
    // Mark job as viewed when opened
    provideJobFeedback(job.id, {
      userId,
      feedbackType: 'VIEWED'
    }).catch(error => {
      console.error('Error marking job as viewed:', error);
    });
    
    // Load similar jobs
    loadSimilarJobs();
  }, [job.id, userId]);

  const loadSimilarJobs = async () => {
    try {
      setIsLoadingSimilar(true);
      const similar = await getSimilarJobs(job.id, { userId, limit: 3 });
      setSimilarJobs(similar);
    } catch (error) {
      console.error('Error loading similar jobs:', error);
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const handleFeedback = async (type: 'INTERESTED' | 'NOT_INTERESTED') => {
    if (type === feedbackMode) {
      // Toggle off if clicking the same button
      setFeedbackMode(null);
      return;
    }
    
    setFeedbackMode(type);
    
    if (type === 'NOT_INTERESTED') {
      // Auto-submit for not interested (unless user wants to add a reason)
      await submitFeedback(type);
    }
  };

  const submitFeedback = async (type: 'INTERESTED' | 'NOT_INTERESTED' = feedbackMode as any) => {
    if (!type) return;
    
    try {
      setIsSubmitting(true);
      
      await provideJobFeedback(job.id, {
        userId,
        feedbackType: type,
        reasons: feedbackReason || undefined
      });
      
      // Reset form
      setFeedbackMode(null);
      setFeedbackReason('');
      
      // Notify parent
      onFeedbackUpdate();
      
      // If user is not interested, close the panel
      if (type === 'NOT_INTERESTED') {
        onClose();
      } else {
        // Reload similar jobs as recommendations may change
        loadSimilarJobs();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="font-medium">Job Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold">{job.title}</h1>
            <div className="mt-1 text-gray-600">
              {job.organization}
              {job.department && ` • ${job.department}`}
            </div>
            {job.location && (
              <div className="mt-1 text-gray-600">
                {job.location}
              </div>
            )}
            
            <div className="mt-3 flex flex-wrap gap-2">
              {job.type && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                  {job.type.replace('_', ' ')}
                </span>
              )}
              {job.organizationType && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm">
                  {job.organizationType}
                </span>
              )}
              {job.datePosted && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm">
                  Posted: {formatDate(job.datePosted)}
                </span>
              )}
            </div>
          </div>
          
          {job.salary && (
            <div>
              <h3 className="font-medium text-lg">Salary</h3>
              <div className="mt-1 text-green-600">{job.salary}</div>
            </div>
          )}
          
          <div>
            <h3 className="font-medium text-lg">Description</h3>
            <div className="mt-2 text-gray-700 whitespace-pre-line">
              {job.description}
            </div>
          </div>
          
          {job.requirements && (
            <div>
              <h3 className="font-medium text-lg">Requirements</h3>
              <div className="mt-2 text-gray-700 whitespace-pre-line">
                {job.requirements}
              </div>
            </div>
          )}
          
          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="font-medium text-lg">Skills</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {job.benefits && (
            <div>
              <h3 className="font-medium text-lg">Benefits</h3>
              <div className="mt-2 text-gray-700 whitespace-pre-line">
                {job.benefits}
              </div>
            </div>
          )}
          
          <div>
            <h3 className="font-medium text-lg">Apply</h3>
            <div className="mt-2">
              <a 
                href={job.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View Original Job Posting
              </a>
            </div>
          </div>
          
          {/* Similar Jobs */}
          {!isLoadingSimilar && similarJobs.length > 0 && (
            <div>
              <h3 className="font-medium text-lg">Similar Jobs</h3>
              <div className="mt-2">
                <JobSimilarList 
                  jobs={similarJobs}
                  currentJobId={job.id}
                  onSelectJob={(selectedJob) => {
                    // Close current job details
                    onClose();
                    // We don't have direct access to the parent's onSelectJob function
                    // Just close this panel, the parent will handle job selection
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {feedbackMode ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              {feedbackMode === 'INTERESTED' ? (
                'Why are you interested in this job?'
              ) : (
                'Why are you not interested in this job? (Optional)'
              )}
            </div>
            
            <Textarea
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder="Add your feedback here..."
              rows={3}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setFeedbackMode(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => submitFeedback()}
                disabled={isSubmitting || (feedbackMode === 'INTERESTED' && !feedbackReason.trim())}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => handleFeedback('NOT_INTERESTED')}
            >
              Not Interested
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => handleFeedback('INTERESTED')}
            >
              Interested
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}