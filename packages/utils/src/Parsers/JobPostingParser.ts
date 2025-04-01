// File path: packages/utils/src/Parsers/JobPostingParser.ts
/**
 * This file contains utilities for parsing job posting text into structured data
 * that aligns with the database schema for job postings.
 */

import { aiService } from '../Services/AIService';
import { StructuredOutputResult } from '../Services/AIService/types';

/**
 * Interface representing the structure of a parsed job posting
 * Designed to align with the database schema for easy insertion
 */
export interface ParsedJobPosting {
  // Core job information
  title: string;
  organization: string;
  organizationType?: 'GOVERNMENT' | 'NONPROFIT' | 'PRIVATE' | 'PUBLIC' | 'ACADEMIC' | 'STARTUP' | 'OTHER';
  department?: string;
  location?: string;
  description: string;
  salary?: string;
  url: string;
  type?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP' | 'REMOTE' | 'HYBRID' | 'OTHER';
  
  // Additional details
  requirements?: string;
  benefits?: string;
  experience?: string;
  skills?: string[];
  
  // Application info
  applicationUrl?: string;
  contactEmail?: string;
  postedDate?: string;
  
  // Additional structured data
  structuredData?: Record<string, any>;
}

/**
 * Schema for the job posting structured output
 * This defines the JSON schema that the AI will use to structure its response
 */
export const jobPostingSchema = {
  title: { 
    type: 'string', 
    description: 'The title of the job position' 
  },
  organization: { 
    type: 'string', 
    description: 'The name of the company or organization offering the job' 
  },
  organizationType: { 
    type: 'string',
    enum: ['GOVERNMENT', 'NONPROFIT', 'PRIVATE', 'PUBLIC', 'ACADEMIC', 'STARTUP', 'OTHER'],
    description: 'The type of organization'
  },
  department: { 
    type: 'string', 
    description: 'The department or division within the organization' 
  },
  location: { 
    type: 'string', 
    description: 'The location where the job is based' 
  },
  description: { 
    type: 'string', 
    description: 'General description of the job position' 
  },
  salary: { 
    type: 'string',
    description: 'Salary information as a formatted string (e.g., "$80,000 - $100,000 per year")'
  },
  url: { 
    type: 'string', 
    description: 'URL where the job posting can be found' 
  },
  type: { 
    type: 'string',
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'REMOTE', 'HYBRID', 'OTHER'],
    description: 'Type of employment offered'
  },
  requirements: { 
    type: 'string', 
    description: 'Requirements or qualifications needed for the job' 
  },
  benefits: { 
    type: 'string',
    description: 'Benefits offered with the position'
  },
  experience: {
    type: 'string',
    description: 'Experience level required (e.g., "Entry level", "5+ years", "Senior")'
  },
  skills: { 
    type: 'array',
    items: { type: 'string' },
    description: 'Key skills required for this position'
  },
  applicationUrl: { 
    type: 'string', 
    description: 'URL where candidates can apply directly' 
  },
  contactEmail: { 
    type: 'string', 
    description: 'Email address for inquiries about the position' 
  },
  postedDate: { 
    type: 'string', 
    description: 'Date when the job was posted, in ISO format if possible' 
  }
};

/**
 * Parse a job posting text into structured data
 * 
 * @param jobText The raw text of the job posting
 * @param options Optional configuration for the parsing
 * @returns A structured job posting object
 */
export async function parseJobPosting(
  jobText: string,
  options?: {
    model?: string;
    temperature?: number;
    url?: string;
  }
): Promise<ParsedJobPosting> {
  const { 
    model = 'gpt-4o', 
    temperature = 0.2,
    url = ''
  } = options || {};

  const prompt = `
Parse the following job posting and extract all relevant information into a structured format.
Extract as much detail as possible, including title, organization, location, salary, job type, 
responsibilities, requirements, benefits, and any other information provided.

${url ? `The job posting was found at this URL: ${url}` : ''}

Here's the job posting to parse:

${jobText}
  `;
  
  try {
    // Parse using structured output
    const result = await aiService.generateStructuredOutput<ParsedJobPosting>({
      model,
      prompt,
      schema: jobPostingSchema,
      temperature,
      toolName: 'parse_job_posting',
      toolDescription: 'Parse a job posting text into a structured format with all details organized into appropriate fields'
    });
    
    // Ensure required fields are present
    const parsedJob = result.data;
    
    // If URL wasn't extracted, use the provided one
    if (!parsedJob.url && url) {
      parsedJob.url = url;
    }
    
    // Make sure we have a description
    if (!parsedJob.description && jobText) {
      parsedJob.description = jobText.slice(0, 500); // Use first 500 chars as fallback
    }
    
    return parsedJob;
  } catch (error) {
    console.error('Error parsing job posting:', error);
    throw error;
  }
}

/**
 * Parse a job posting text into structured data and return the raw response as well
 * 
 * @param jobText The raw text of the job posting
 * @param options Optional configuration for the parsing
 * @returns The structured output result with both structured data and raw response
 */
export async function parseJobPostingWithRaw(
  jobText: string,
  options?: {
    model?: string;
    temperature?: number;
    url?: string;
  }
): Promise<StructuredOutputResult<ParsedJobPosting>> {
  const { 
    model = 'gpt-4o', 
    temperature = 0.2,
    url = ''
  } = options || {};

  const prompt = `
Parse the following job posting and extract all relevant information into a structured format.
Extract as much detail as possible, including title, organization, location, salary, job type, 
responsibilities, requirements, benefits, and any other information provided.

${url ? `The job posting was found at this URL: ${url}` : ''}

Here's the job posting to parse:

${jobText}
  `;
  
  try {
    // Parse using structured output
    const result = await aiService.generateStructuredOutput<ParsedJobPosting>({
      model,
      prompt,
      schema: jobPostingSchema,
      temperature,
      toolName: 'parse_job_posting',
      toolDescription: 'Parse a job posting text into a structured format with all details organized into appropriate fields'
    });
    
    // Ensure required fields are present
    if (!result.data.url && url) {
      result.data.url = url;
    }
    
    // Make sure we have a description
    if (!result.data.description && jobText) {
      result.data.description = jobText.slice(0, 500); // Use first 500 chars as fallback
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing job posting with raw:', error);
    throw error;
  }
}

/**
 * Extract multiple job postings from a page or document containing multiple listings
 * 
 * @param pageText The text content of the page with multiple job listings
 * @param options Optional configuration for the parsing
 * @returns Array of parsed job posting objects
 */
export async function extractMultipleJobPostings(
  pageText: string,
  options?: {
    model?: string;
    temperature?: number;
    url?: string;
    keywords?: string[];
  }
): Promise<ParsedJobPosting[]> {
  const { 
    model = 'gpt-4o', 
    temperature = 0.2,
    url = '',
    keywords = []
  } = options || {};

  // Create a schema for multiple job postings
  const multipleJobsSchema = {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        properties: jobPostingSchema
      }
    }
  };

  const keywordsStr = keywords.length > 0 
    ? `Focus on jobs related to these keywords: ${keywords.join(', ')}.` 
    : '';

  const prompt = `
Analyze the following page content and extract all job listings it contains.
${url ? `The content was found at this URL: ${url}.` : ''}
${keywordsStr}

For each job listing you can identify, extract all available information into a structured format.
If there's only one job posting on the page, return it as a single item in the array.

Return the data as a JSON array of job objects under a "jobs" key.

Page Content:
${pageText.slice(0, 15000)} // Limit to 15k chars to avoid token limit issues
  `;
  
  try {
    // Parse using structured output
    const result = await aiService.generateStructuredOutput<{ jobs: ParsedJobPosting[] }>({
      model,
      prompt,
      schema: multipleJobsSchema,
      temperature,
      toolName: 'extract_job_listings',
      toolDescription: 'Extract multiple job listings from a page and parse each into structured format'
    });
    
    // Process each job to ensure required fields and URLs
    const jobs = result.data.jobs.map(job => {
      // If URL wasn't extracted, use the provided one
      if (!job.url && url) {
        job.url = url;
      }
      
      // Make sure we have a description
      if (!job.description) {
        job.description = 'No description provided.';
      }
      
      return job;
    });
    
    return jobs;
  } catch (error) {
    console.error('Error extracting multiple job postings:', error);
    throw error;
  }
}