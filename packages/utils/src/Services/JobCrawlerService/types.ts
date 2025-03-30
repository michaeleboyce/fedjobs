// packages/utils/src/Services/JobCrawlerService/types.ts

export interface JobPostingData {
  title: string;
  organization: string;
  location?: string;
  description: string;
  salary?: string;
  requirements?: string;
  url: string;
  employmentType?: string;
  experience?: string;
  skills?: string[];
  benefits?: string;
  organizationType?: string;
  datePosted?: Date;
  dateScraped: Date;
  structuredData?: Record<string, any>;
  externalId?: string;
}

export interface JobCrawlerResult {
  sourceId: number;
  url: string;
  jobsFound: number;
  jobsStored: number;
  error?: string;
  dateCompleted: Date;
}

export interface JobSourceRefreshRequest {
  sourceId: number;
  url: string;
  keywords?: string;
  userId: string;
}