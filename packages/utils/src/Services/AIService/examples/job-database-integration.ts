// File path: packages/utils/src/Services/AIService/examples/job-database-integration.ts

import { parseJobPosting, extractMultipleJobPostings, ParsedJobPosting } from '../../../Parsers/JobPostingParser';

/**
 * This example demonstrates how to integrate the job posting parser with a database.
 * 
 * Note: This is an example using type definitions and would need to be adapted
 * to your actual database implementation.
 */

// Types representing database records (would typically come from database package)
interface JobSource {
  id: number;
  name: string;
  url: string;
  userId: string;
}

interface JobPostingRecord {
  sourceId: number;
  externalId?: string;
  title: string;
  organization: string;
  organizationType?: string;
  department?: string;
  location?: string;
  description: string;
  salary?: string;
  requirements?: string;
  url: string;
  type?: string;
  experience?: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'FILLED' | 'EXPIRED';
  datePosted?: Date;
  dateScraped: Date;
  structuredData?: Record<string, any>;
  benefits?: string;
  skills?: string[];
}

/**
 * Convert a ParsedJobPosting from the parser to a database record format
 */
function convertToDbRecord(
  job: ParsedJobPosting, 
  sourceId: number,
  externalId?: string
): JobPostingRecord {
  return {
    sourceId,
    externalId: externalId, // Removed the null default
    title: job.title,
    organization: job.organization,
    organizationType: job.organizationType,
    department: job.department,
    location: job.location,
    description: job.description,
    salary: job.salary,
    requirements: job.requirements,
    url: job.url,
    type: job.type,
    experience: job.experience,
    isActive: true,
    status: 'ACTIVE',
    datePosted: job.postedDate ? new Date(job.postedDate) : undefined,
    dateScraped: new Date(),
    structuredData: job.structuredData || {},
    benefits: job.benefits,
    skills: job.skills || []
  };
}

/**
 * Example function that parses job text and converts it to database format
 */
async function parseAndCreateJobRecord(
  jobText: string,
  source: JobSource,
  externalId?: string
): Promise<JobPostingRecord> {
  try {
    // 1. Parse the job text using our parser
    const parsedJob = await parseJobPosting(jobText, {
      url: source.url,
      model: 'gpt-4o' // Use the best available model for accuracy
    });
    
    // 2. Convert the parsed job to database record format
    const jobRecord = convertToDbRecord(parsedJob, source.id, externalId);
    
    // 3. In a real implementation, you would save this to the database
    // For example: await jobPostingRepo.create(jobRecord);
    
    return jobRecord;
  } catch (error) {
    console.error('Error parsing and creating job record:', error);
    throw error;
  }
}

/**
 * Process multiple job postings from a page
 */
async function processJobsPage(
  pageText: string,
  source: JobSource
): Promise<JobPostingRecord[]> {
  try {
    // 1. Extract multiple jobs from the page
    const parsedJobs = await extractMultipleJobPostings(pageText, {
      url: source.url
    });
    
    // 2. Convert each job to a database record
    const jobRecords = parsedJobs.map((job: ParsedJobPosting) => 
      convertToDbRecord(job, source.id)
    );
    
    // 3. In a real implementation, you would save these to the database
    // For example: await jobPostingRepo.createMany(jobRecords);
    
    return jobRecords;
  } catch (error) {
    console.error('Error processing jobs page:', error);
    throw error;
  }
}

// Example of using these functions
async function demoIntegration() {
  // Mock source data
  const mockSource: JobSource = {
    id: 1,
    name: 'TechInnovate Careers',
    url: 'https://careers.techinnovate.com',
    userId: 'user123'
  };
  
  // Example job posting
  const jobText = `
  # Senior Software Engineer
  
  **Location:** New York, NY
  **Salary:** $120,000 - $150,000
  
  TechInnovate is seeking a Senior Software Engineer to join our team.
  The ideal candidate will have experience with JavaScript, React, and Node.js.
  
  Requirements:
  - 5+ years experience
  - BS in Computer Science or related field
  `;
  
  try {
    // Process a single job posting
    const jobRecord = await parseAndCreateJobRecord(jobText, mockSource);
    console.log('Created job record:', jobRecord);
    
    // Process a page with multiple listings (abbreviated in this example)
    const pageText = `
    # TechInnovate Open Positions
    
    ## Senior Software Engineer
    New York, NY | $120k-$150k
    
    ## UX Designer
    Remote | $90k-$110k
    `;
    
    const multipleRecords = await processJobsPage(pageText, mockSource);
    console.log(`Created ${multipleRecords.length} job records`);
  } catch (error) {
    console.error('Integration demo error:', error);
  }
}

// Export the integration functions
export {
  parseAndCreateJobRecord,
  processJobsPage,
  convertToDbRecord,
  demoIntegration
};

// For standalone testing (comment out in production)
// demoIntegration().catch(console.error);

/**
 * This module demonstrates how to:
 * 1. Parse job posting text using AI
 * 2. Convert the structured output to database format
 * 3. Process single jobs and multiple listings
 * 
 * Integration points:
 * - The convertToDbRecord function bridges the AI parser output to db format
 * - Error handling ensures robust processing
 * - Functions are modular and can be incorporated into your existing workflows
 */