// apps/web/app/features/jobs/actions/jobActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { type Job, type JobFeedback, type JobSearchParams } from '../types';

// API endpoint base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "https://fedjobs-api-production.up.railway.app" : "http://localhost:3001"; // Adjust port as needed

/**
 * Calculates the Levenshtein distance between two strings
 * Used for fuzzy search matching to handle typos and small variations
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Determines if a search term fuzzy matches a target string
 * @param searchTerm The term to search for
 * @param target The string to search within
 * @param threshold Maximum Levenshtein distance to consider a match (default: 2)
 */
function fuzzyMatch(searchTerm: string, target: string, threshold: number = 2): boolean {
  // Convert both to lowercase for case-insensitive comparison
  const termLower = searchTerm.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Direct includes check (fastest)
  if (targetLower.includes(termLower)) {
    return true;
  }
  
  // Direct match check for short terms (faster than edit distance for exact matches)
  if (termLower === targetLower) {
    return true;
  }
  
  // For very short search terms, be more strict to avoid false positives
  if (termLower.length <= 3) {
    return targetLower.includes(termLower);
  }

  // For longer terms, check if target has any word that's similar to the search term
  const targetWords = targetLower.split(/\s+/);
  
  for (const word of targetWords) {
    // Skip very short words
    if (word.length < 3) continue;
    
    // Check if this word is close enough to the search term
    const distance = levenshteinDistance(termLower, word);
    if (distance <= threshold) {
      return true;
    }
    
    // Also check if the word starts with the search term (prefix matching)
    if (word.startsWith(termLower)) {
      return true;
    }
    
    // Check if search term starts with this word
    if (termLower.startsWith(word) && word.length > 3) {
      return true;
    }
  }

  // Check if the search term appears as a partial match within the target
  // (for multi-word targets where the search term might span across words)
  if (targetLower.replace(/\s+/g, '').includes(termLower.replace(/\s+/g, ''))) {
    return true;
  }

  // No match found
  return false;
}

/**
 * Client-side preprocessing for job search parameters
 */
function preprocessSearchParams(params: JobSearchParams): Record<string, string> {
  const queryParams = new URLSearchParams();
  
  // Process each parameter
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return; // Skip empty values
    }
    
    // Convert to string for URLSearchParams
    const stringValue = value.toString();
    
    // Add parameters to query string
    switch (key) {
      case 'keywords':
        // Pass keywords as-is, we'll handle case-insensitivity client-side
        queryParams.append('keywords', stringValue);
        // Request for smart search if available in the API
        queryParams.append('smartSearch', 'true');
        break;
        
      case 'location':
        queryParams.append('location', stringValue);
        // Add remote/hybrid detection
        if (stringValue.toLowerCase().includes('remote') ||
            stringValue.toLowerCase().includes('work from home') ||
            stringValue.toLowerCase().includes('wfh')) {
          queryParams.append('includeRemote', 'true');
        }
        if (stringValue.toLowerCase().includes('hybrid')) {
          queryParams.append('includeHybrid', 'true');
        }
        break;
        
      default:
        queryParams.append(key, stringValue);
    }
  });
  
  // Always request case-insensitive search from the API
  // (We'll do our own client-side case-insensitive search as a fallback)
  queryParams.append('caseInsensitive', 'true');
  
  return Object.fromEntries(queryParams.entries());
}

/**
 * Perform client-side fuzzy search filtering and ranking
 * This ensures case-insensitive and fuzzy matching even if the backend doesn't support it
 */
function clientSideFuzzySearch(jobs: Job[], searchParams: JobSearchParams): Job[] {
  // If no keywords, return all jobs
  if (!searchParams.keywords || searchParams.keywords.trim() === '') {
    return jobs;
  }
  
  const keywords = searchParams.keywords.toLowerCase().trim().split(/\s+/);
  
  // First pass: Filter jobs that match our search criteria
  let filteredJobs = jobs.filter((job) => {
    // Check for keyword matches across different fields
    for (const keyword of keywords) {
      // Skip very short keywords (like "a", "an", "the")
      if (keyword.length < 2) continue;
      
      // Check each field for matches
      if (
        fuzzyMatch(keyword, job.title) ||
        fuzzyMatch(keyword, job.organization) ||
        fuzzyMatch(keyword, job.description) ||
        (job.department && fuzzyMatch(keyword, job.department)) ||
        (job.skills && job.skills.some(skill => fuzzyMatch(keyword, skill)))
      ) {
        return true;
      }
    }
    
    return false;
  });
  
  // If no matches with fuzzy search, try a more lenient approach with partial matches
  if (filteredJobs.length === 0) {
    const singleKeyword = searchParams.keywords.toLowerCase().trim();
    
    filteredJobs = jobs.filter((job) => {
      // Look for partial matches in longer text fields
      return (
        job.title.toLowerCase().includes(singleKeyword) ||
        job.organization.toLowerCase().includes(singleKeyword) ||
        job.description.toLowerCase().includes(singleKeyword) ||
        (job.department && job.department.toLowerCase().includes(singleKeyword)) ||
        (job.skills && job.skills.some(skill => skill.toLowerCase().includes(singleKeyword)))
      );
    });
  }
  
  // Second pass: Calculate relevance scores
  const scoredJobs = filteredJobs.map((job) => {
    let score = 0;
    
    // Calculate score based on different factors
    for (const keyword of keywords) {
      // Check title matches (highest priority)
      const titleLower = job.title.toLowerCase();
      if (titleLower.includes(keyword)) {
        score += 10;
        // Exact title match is worth even more
        if (titleLower === keyword) {
          score += 20;
        }
        // Title starts with keyword
        else if (titleLower.startsWith(keyword)) {
          score += 15;
        }
      }
      
      // Check organization matches
      if (job.organization.toLowerCase().includes(keyword)) {
        score += 8;
      }
      
      // Check description matches (with position bonus)
      const descLower = job.description.toLowerCase();
      if (descLower.includes(keyword)) {
        score += 5;
        // Bonus if keyword appears early in the description
        const keywordIndex = descLower.indexOf(keyword);
        if (keywordIndex < 100) {
          score += 3;
        }
      }
      
      // Check skills matches (high relevance)
      if (job.skills && job.skills.length > 0) {
        const exactSkillMatch = job.skills.some(skill => skill.toLowerCase() === keyword);
        if (exactSkillMatch) {
          score += 12; // Exact skill match is very relevant
        } else {
          const partialSkillMatch = job.skills.some(skill => skill.toLowerCase().includes(keyword));
          if (partialSkillMatch) {
            score += 8;
          }
        }
      }
    }
    
    // Add recency bonus for newer jobs
    if (job.datePosted) {
      const postDate = new Date(job.datePosted);
      const now = new Date();
      const daysSincePosted = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Jobs posted in the last 14 days get a bonus
      if (daysSincePosted <= 14) {
        score += Math.max(0, 10 - Math.floor(daysSincePosted / 2)); // More recent = more points
      }
    }
    
    // Return the job with its score
    return { ...job, relevanceScore: score };
  });
  
  // Sort by relevance score (descending)
  scoredJobs.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  
  // Remove the temporary score property
  return scoredJobs.map(({ relevanceScore, ...rest }: any) => rest);
}

// Search for jobs with enhanced fuzzy search
export async function searchJobs(params: JobSearchParams = {}): Promise<Job[]> {
  try {
    // Preprocess the search parameters
    const enhancedParams = preprocessSearchParams(params);
    
    // Build query string
    const queryParams = new URLSearchParams(enhancedParams);
    
    console.log(`[Client] Searching jobs with params: ${queryParams.toString()}`);
    
    const response = await fetch(`${API_BASE_URL}/api/job-postings/search?${queryParams.toString()}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Client] Search jobs error response: ${errorText}`);
      throw new Error(`Failed to search jobs: ${response.statusText}. ${errorText}`);
    }
    
    const data: Job[] = await response.json();
    console.log(`[Client] Retrieved ${data.length} jobs`);
    
    // Apply client-side fuzzy search and sorting
    const processedResults = clientSideFuzzySearch(data, params);
    
    return processedResults;
  } catch (error) {
    console.error('[Client] Error searching jobs:', error);
    return []; // Return empty array for better UX
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching job ${jobId}:`, errorMessage);
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
    
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch similar jobs: ${response.statusText}. ${errorText}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Client] Error fetching similar jobs for job ${jobId}:`, errorMessage);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching recommended jobs for user ${userId}:`, errorMessage);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error providing feedback for job ${jobId}:`, errorMessage);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching job feedback for user ${userId}:`, errorMessage);
    throw error;
  }
}