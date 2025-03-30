// apps/web/app/features/jobs/types/index.ts

export type JobSource = {
  id: number;
  userId: string;
  url: string;
  name: string;
  keywords: string;
  lastScraped: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  errorMessage: string | null;
  refreshFrequency: 'DAILY' | 'WEEKLY' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: number;
  sourceId: number;
  externalId: string | null;
  title: string;
  organization: string;
  organizationType: string | null;
  department: string | null;
  location: string | null;
  description: string;
  salary: string | null;
  requirements: string | null;
  url: string;
  type: string | null;
  experience: string | null;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'FILLED' | 'EXPIRED';
  datePosted: string | null;
  dateScraped: string;
  structuredData: Record<string, any>;
  benefits: string | null;
  skills: string[];
  createdAt: string;
  updatedAt: string;
};

export type JobFeedback = {
  id: number;
  userId: string;
  jobId: number;
  feedbackType: 'INTERESTED' | 'NOT_INTERESTED' | 'APPLIED' | 'SAVED' | 'VIEWED';
  reasons: string | null;
  viewed: boolean;
  createdAt: string;
  updatedAt: string;
  job?: Job;
};

export type JobSearchParams = {
  keywords?: string;
  location?: string;
  organization?: string;
  organizationType?: string;
  employmentType?: string;
  userId?: string;
};

export type NewJobSource = {
  userId: string;
  url: string;
  name: string;
  keywords?: string;
  refreshFrequency?: 'DAILY' | 'WEEKLY' | 'MANUAL';
};