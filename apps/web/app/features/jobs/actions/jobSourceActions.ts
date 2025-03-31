// apps/web/app/features/jobs/actions/jobSourceActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { type JobSource, type Job } from '../types';

// API endpoint base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Get all job sources for a user
export async function getJobSources(userId: string, includeCounts: boolean = false): Promise<JobSource[]> {
  try {
    const url = new URL(`${API_BASE_URL}/api/job-sources`);
    url.searchParams.append('userId', userId);
    
    if (includeCounts) {
      url.searchParams.append('includeCounts', 'true');
    }
    
    const response = await fetch(url.toString(), {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job sources: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching job sources:', error);
    throw error;
  }
}

// Get jobs from a specific source
export async function getJobsBySource(sourceId: number): Promise<Job[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-sources/${sourceId}/jobs`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching jobs for source ${sourceId}:`, error);
    throw error;
  }
}

// Create a new job source
export async function createJobSource(data: {
  userId: string;
  url: string;
  name: string;
  keywords?: string;
  refreshFrequency?: string;
}): Promise<JobSource> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create job source: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Revalidate related paths
    revalidatePath('/jobs');
    revalidatePath('/job-sources');
    
    return result;
  } catch (error) {
    console.error('Error creating job source:', error);
    throw error;
  }
}

// Update a job source
export async function updateJobSource(
  sourceId: number,
  data: Partial<{
    name: string;
    keywords: string;
    refreshFrequency: string;
    status: string;
  }>
): Promise<JobSource> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-sources/${sourceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update job source: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Revalidate related paths
    revalidatePath('/jobs');
    revalidatePath('/job-sources');
    revalidatePath(`/job-sources/${sourceId}`);
    
    return result;
  } catch (error) {
    console.error(`Error updating job source ${sourceId}:`, error);
    throw error;
  }
}

// Delete a job source
export async function deleteJobSource(sourceId: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-sources/${sourceId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete job source: ${response.statusText}`);
    }
    
    // Revalidate related paths
    revalidatePath('/jobs');
    revalidatePath('/job-sources');
    
    return;
  } catch (error) {
    console.error(`Error deleting job source ${sourceId}:`, error);
    throw error;
  }
}

// Refresh a job source
export async function refreshJobSource(
  sourceId: number, 
  forceRefresh: boolean = false
): Promise<{ message: string; sourceId: number; status: string; usedCache?: boolean }> {
  try {
    const url = new URL(`${API_BASE_URL}/api/job-sources/${sourceId}/refresh`);
    
    // Add forceRefresh parameter if specified
    if (forceRefresh) {
      url.searchParams.append('forceRefresh', 'true');
    }
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh job source: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Revalidate related paths
    revalidatePath('/jobs');
    revalidatePath('/job-sources');
    revalidatePath(`/job-sources/${sourceId}`);
    
    return result;
  } catch (error) {
    console.error(`Error refreshing job source ${sourceId}:`, error);
    throw error;
  }
}

// Cancel a job source refresh
export async function cancelJobSourceRefresh(sourceId: number): Promise<{ message: string; sourceId: number; status: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/job-sources/${sourceId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel job source refresh: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Revalidate related paths
    revalidatePath('/jobs');
    revalidatePath('/job-sources');
    revalidatePath(`/job-sources/${sourceId}`);
    
    return result;
  } catch (error) {
    console.error(`Error canceling job source refresh ${sourceId}:`, error);
    throw error;
  }
}