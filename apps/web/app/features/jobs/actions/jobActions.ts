// File path: apps/web/app/features/jobs/actions/jobActions.ts
// apps/web/app/features/jobs/actions/jobActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { type Job, type JobFeedback } from '../types';

// API endpoint base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Search for jobs
export async function searchJobs(params: {
  keywords?: string;
  location?: string;
  organization?: string;
  organizationType?: string;
  employmentType?: string;
  userId?: string;
  limit?: number;
}): Promise<Job[]> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    console.log(`[Client] Searching jobs with params: ${queryParams.toString()}`);
    console.log(`[Client] API URL: ${API_BASE_URL}/api/job-postings/search?${queryParams.toString()}`);
    
    const response = await fetch(`${API_BASE_URL}/api/job-postings/search?${queryParams.toString()}`, {
      cache: 'no-store'
    });
    
    console.log(`[Client] Search jobs response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Client] Search jobs error response: ${errorText}`);
      throw new Error(`Failed to search jobs: ${response.statusText}. ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[Client] Retrieved ${data.length} jobs`);
    return data;
  } catch (error) {
    console.error('[Client] Error searching jobs:', error);
    throw error;
  }
}

// Get a specific job
export async function getJobById(jobId: number): Promise<Job> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-postings/${jobId}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    throw error;
  }
}

// Get similar jobs
export async function getSimilarJobs(
  jobId: number,
  options?: {
    userId?: string;
    limit?: number;
  }
): Promise<Job[]> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    
    if (options?.userId) {
      queryParams.append('userId', options.userId);
    }
    
    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    
    const url = `${API_BASE_URL}/api/job-postings/${jobId}/similar${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log(`[Client] Fetching similar jobs from: ${url}`);
    
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    console.log(`[Client] Similar jobs response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Client] Similar jobs error response:`, errorText);
      throw new Error(`Failed to fetch similar jobs: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[Client] Retrieved ${data.length} similar jobs`);
    return data;
  } catch (error) {
    console.error(`[Client] Error fetching similar jobs for job ${jobId}:`, error);
    throw error;
  }
}

// Get recommended jobs for a user
export async function getRecommendedJobs(
  userId: string,
  limit?: number
): Promise<Job[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/job-postings/recommended/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        cache: 'no-store'
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recommended jobs: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching recommended jobs for user ${userId}:`, error);
    throw error;
  }
}

// Provide feedback on a job
export async function provideJobFeedback(
  jobId: number,
  data: {
    userId: string;
    feedbackType: 'INTERESTED' | 'NOT_INTERESTED' | 'APPLIED' | 'SAVED' | 'VIEWED';
    reasons?: string;
  }
): Promise<JobFeedback> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-postings/${jobId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to provide job feedback: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Revalidate related paths
    revalidatePath('/jobs');
    revalidatePath(`/jobs/${jobId}`);
    
    return result;
  } catch (error) {
    console.error(`Error providing feedback for job ${jobId}:`, error);
    throw error;
  }
}

// Get user's job feedback
export async function getUserJobFeedback(
  userId: string,
  feedbackType?: string
): Promise<JobFeedback[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (feedbackType) {
      queryParams.append('type', feedbackType);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/job-postings/feedback/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        cache: 'no-store'
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user job feedback: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching job feedback for user ${userId}:`, error);
    throw error;
  }
}