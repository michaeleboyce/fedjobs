import { AnalyzeLinksInput, JobPostingData, ParsePageInput, PageClassificationResult } from '../types';
import { AIService } from '@fedjobs/utils';

export interface IParser {
  // New methods for the refactored page analysis flow
  classifyPage(input: ParsePageInput): Promise<PageClassificationResult>;
  parseJobListingPage(input: ParsePageInput): Promise<{ jobs: JobPostingData[], links: string[] }>;
  parseSingleJobPage(input: ParsePageInput): Promise<JobPostingData | null>;
  
  // Prioritize links based on likelihood of being job-related
  prioritizeLinks(input: AnalyzeLinksInput): Promise<{
    prioritizedLinks: string[],
    scores: Record<string, number>
  }>;
  
  // Original methods (some may be refactored or deprecated)
  parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]>;
  analyzeLinks(input: AnalyzeLinksInput): Promise<string[]>;
  enrichJobData(job: JobPostingData): Promise<JobPostingData>;
  getAIService(): AIService;
}