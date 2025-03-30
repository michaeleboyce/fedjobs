// packages/utils/src/Services/JobScraperService.ts
import { JobCrawlerService } from './JobCrawlerService';
import { JobPostingData, JobCrawlerResult } from './JobCrawlerService/types';
import { JobPostingRepository } from '@fedjobs/database/src/repositories/jobPostings';
import { JobSourceRepository } from '@fedjobs/database/src/repositories/jobSources';

export class JobScraperService {
  private crawler: JobCrawlerService;
  private jobPostingRepo: JobPostingRepository;
  private jobSourceRepo: JobSourceRepository;
  
  constructor() {
    this.crawler = new JobCrawlerService();
    this.jobPostingRepo = new JobPostingRepository();
    this.jobSourceRepo = new JobSourceRepository();
  }
  
  private async storeJobPosting(sourceId: number, jobData: JobPostingData) {
    try {
      // Check if job already exists with this URL
      const existingJobs = await this.jobPostingRepo.searchJobs({
        keywords: jobData.title,
        organization: jobData.organization,
        limit: 5
      });
      
      const matchingJob = existingJobs.find(job => 
        job.url === jobData.url || 
        (job.title === jobData.title && job.organization === jobData.organization)
      );
      
      if (matchingJob) {
        // Update existing job
        await this.jobPostingRepo.update(matchingJob.id, {
          description: jobData.description,
          salary: jobData.salary,
          requirements: jobData.requirements,
          isActive: true,
          dateScraped: new Date(),
          structuredData: jobData.structuredData ? 
            { ...(typeof matchingJob.structuredData === 'object' ? matchingJob.structuredData : {}), 
              ...(typeof jobData.structuredData === 'object' ? jobData.structuredData : {}) } :
            matchingJob.structuredData
        });
        return matchingJob.id;
      } else {
        // Insert new job
        const newJob = await this.jobPostingRepo.insert({
          sourceId,
          title: jobData.title,
          organization: jobData.organization,
          location: jobData.location || '',
          description: jobData.description,
          salary: jobData.salary || null,
          requirements: jobData.requirements || null,
          url: jobData.url,
          type: jobData.employmentType as any || null,
          externalId: jobData.externalId || null,
          organizationType: jobData.organizationType as any || null,
          datePosted: jobData.datePosted || new Date(),
          dateScraped: new Date(),
          structuredData: jobData.structuredData || {},
          skills: jobData.skills || []
        });
        return newJob.id;
      }
    } catch (error) {
      console.error('Error storing job posting:', error);
      throw error;
    }
  }
  
  async refreshJobSource(sourceId: number): Promise<JobCrawlerResult> {
    try {
      // Get source data
      const source = await this.jobSourceRepo.getById(sourceId);
      if (!source) {
        throw new Error(`Job source with ID ${sourceId} not found`);
      }
      
      // Update source status to PENDING
      await this.jobSourceRepo.updateStatus(sourceId, 'PENDING');
      
      // Mark existing jobs from this source as inactive
      await this.jobPostingRepo.deactivateBySourceId(sourceId);
      
      const jobsFound: JobPostingData[] = [];
      const jobsStored: number[] = [];
      
      // Crawl job site
      const result = await this.crawler.refreshJobSource(
        sourceId,
        source.url,
        source.keywords || undefined,
        {
          onJobFound: async (job) => {
            jobsFound.push(job);
            const jobId = await this.storeJobPosting(sourceId, job);
            jobsStored.push(jobId);
          },
          onError: async (error, url) => {
            console.error(`Error crawling ${url}:`, error);
            await this.jobSourceRepo.updateStatus(sourceId, 'ERROR', error.message);
          }
        }
      );
      
      // Update source status and last scraped date
      await this.jobSourceRepo.update(sourceId, {
        status: 'ACTIVE',
        lastScraped: new Date()
      });
      
      return {
        sourceId,
        url: source.url,
        jobsFound: jobsFound.length,
        jobsStored: jobsStored.length,
        dateCompleted: new Date()
      };
    } catch (error) {
      console.error(`Error refreshing job source ${sourceId}:`, error);
      
      // Update source status to ERROR
      await this.jobSourceRepo.updateStatus(
        sourceId, 
        'ERROR', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      return {
        sourceId,
        url: '',
        jobsFound: 0,
        jobsStored: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        dateCompleted: new Date()
      };
    }
  }
  
  async scheduleRefresh(frequency: string = 'DAILY'): Promise<JobCrawlerResult[]> {
    try {
      // Get sources due for refresh
      const sources = await this.jobSourceRepo.getSourcesForScheduledRefresh(frequency);
      
      const results: JobCrawlerResult[] = [];
      
      // Process each source
      for (const source of sources) {
        const result = await this.refreshJobSource(source.id);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error in scheduled refresh:', error);
      return [];
    }
  }
}