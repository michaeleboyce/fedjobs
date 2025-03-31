// packages/utils/src/Services/JobScraperService.ts
import { JobCrawlerService } from './JobCrawlerService';
import { JobPostingData, JobCrawlerResult } from './JobCrawlerService/types';
import { JobPostingRepository, JobSourceRepository, GlobalSourceCacheRepository, employmentType, organizationType, type JobPostingRecord } from '@fedjobs/database';
import { JobSourceCacheManager } from './JobSourceCacheManager';
import { UrlNormalizationService } from './UrlNormalizationService';
import { PgEnum } from 'drizzle-orm/pg-core';

type EmploymentTypeEnum = (typeof employmentType.enumValues)[number];
type OrganizationTypeEnum = (typeof organizationType.enumValues)[number];

/**
 * Normalizes employment type strings to match database enum values
 */
function normalizeEmploymentType(type?: string): EmploymentTypeEnum | undefined {
  if (!type) return undefined;
  
  // Convert to uppercase for comparison
  const normalized = type.toUpperCase();
  
  // Map common variations to database enum values
  const typeMap: Record<string, EmploymentTypeEnum> = {
    'INTERN': 'INTERNSHIP',
    'INTERNSHIP': 'INTERNSHIP',
    'FULL TIME': 'FULL_TIME',
    'FULLTIME': 'FULL_TIME',
    'FULL-TIME': 'FULL_TIME',
    'FULL_TIME': 'FULL_TIME',
    'PART TIME': 'PART_TIME', 
    'PARTTIME': 'PART_TIME',
    'PART-TIME': 'PART_TIME',
    'PART_TIME': 'PART_TIME',
    'CONTRACT': 'CONTRACT',
    'CONTRACTOR': 'CONTRACT',
    'TEMPORARY': 'TEMPORARY',
    'TEMP': 'TEMPORARY',
    'REMOTE': 'REMOTE',
    'HYBRID': 'HYBRID',
    'FREELANCE': 'CONTRACT',
  };
  
  return typeMap[normalized] || 'OTHER';
}

/**
 * Normalizes organization type strings to match database enum values
 */
function normalizeOrganizationType(type?: string): OrganizationTypeEnum | undefined {
  if (!type) return undefined;
  
  // Convert to uppercase for comparison
  const normalized = type.toUpperCase();
  
  // Map common variations to database enum values
  const typeMap: Record<string, OrganizationTypeEnum> = {
    'GOVERNMENT': 'GOVERNMENT',
    'FEDERAL': 'GOVERNMENT',
    'STATE': 'GOVERNMENT',
    'LOCAL': 'GOVERNMENT',
    'GOV': 'GOVERNMENT',
    'NONPROFIT': 'NONPROFIT',
    'NON-PROFIT': 'NONPROFIT',
    'NON PROFIT': 'NONPROFIT',
    'NOT FOR PROFIT': 'NONPROFIT',
    'PRIVATE': 'PRIVATE',
    'PRIVATE SECTOR': 'PRIVATE',
    'CORPORATION': 'PRIVATE',
    'PUBLIC': 'PUBLIC',
    'PUBLICLY TRADED': 'PUBLIC',
    'PUBLIC COMPANY': 'PUBLIC',
    'ACADEMIC': 'ACADEMIC',
    'EDUCATION': 'ACADEMIC',
    'UNIVERSITY': 'ACADEMIC',
    'COLLEGE': 'ACADEMIC',
    'SCHOOL': 'ACADEMIC',
    'STARTUP': 'STARTUP',
    'START-UP': 'STARTUP',
    'START UP': 'STARTUP',
  };
  
  return typeMap[normalized] || 'OTHER';
}

export class JobScraperService {
  private crawler: JobCrawlerService;
  private jobPostingRepo: JobPostingRepository;
  private jobSourceRepo: JobSourceRepository;
  private cacheManager: JobSourceCacheManager;
  private urlNormalizer: UrlNormalizationService;
  private globalCacheRepo: GlobalSourceCacheRepository;
  
  constructor() {
    this.crawler = new JobCrawlerService();
    this.jobPostingRepo = new JobPostingRepository();
    this.jobSourceRepo = new JobSourceRepository();
    this.cacheManager = new JobSourceCacheManager();
    this.urlNormalizer = new UrlNormalizationService();
    this.globalCacheRepo = new GlobalSourceCacheRepository();
  }
  
  private async storeJobPosting(sourceId: number, jobData: JobPostingData) {
    try {
      console.log(`[JobScraperService] Storing job: "${jobData.title}" at ${jobData.organization}`);
      
      // Always insert as a new job to allow for duplicates
      console.log(`[JobScraperService] Creating new job entry for sourceId ${sourceId}`);
      const newJob = await this.jobPostingRepo.insert({
        sourceId,
        title: jobData.title,
        organization: jobData.organization,
        location: jobData.location || '',
        description: jobData.description,
        salary: jobData.salary || null,
        requirements: jobData.requirements || null,
        url: jobData.url,
        type: normalizeEmploymentType(jobData.employmentType) || null,
        externalId: jobData.externalId || null,
        organizationType: normalizeOrganizationType(jobData.organizationType) || null,
        datePosted: jobData.datePosted || new Date(),
        dateScraped: new Date(),
        structuredData: jobData.structuredData || {},
        skills: jobData.skills || []
      });
      
      console.log(`[JobScraperService] Successfully stored job with ID: ${newJob.id}`);
      return newJob.id;
    } catch (error) {
      console.error('[JobScraperService] Error storing job posting:', error);
      throw error;
    }
  }
  
  async refreshJobSource(sourceId: number, callbacks?: {
    onJobFound?: (job: JobPostingData) => Promise<void>;
    onComplete?: (jobs: JobPostingData[]) => Promise<void>;
    onError?: (error: Error, url: string) => Promise<void>;
  }, forceRefresh: boolean = false): Promise<JobCrawlerResult> {
    console.log(`[JobScraperService] refreshJobSource called for sourceId ${sourceId}, forceRefresh: ${forceRefresh}`);
    try {
      console.log(`[JobScraperService] Starting refresh for job source ${sourceId}`);
      
      // Get source data
      const source = await this.jobSourceRepo.getById(sourceId);
      if (!source) {
        console.error(`[JobScraperService] Job source with ID ${sourceId} not found`);
        throw new Error(`Job source with ID ${sourceId} not found`);
      }
      
      console.log(`[JobScraperService] Found source ${sourceId}: ${source.name}, URL: ${source.url}`);
      
      
      // Update source status to PENDING
      await this.jobSourceRepo.updateStatus(sourceId, 'PENDING');
      
      // Check if we can use a cached version (unless forceRefresh is true)
      console.log(`[JobScraperService] Checking if we can use a cached version for source ${sourceId}`);
      console.log(`[JobScraperService] Current globalCacheId: ${source.globalCacheId}, forceRefresh: ${forceRefresh}`);
      
      if (!forceRefresh && !source.globalCacheId) {
        console.log(`[JobScraperService] No globalCacheId yet, checking cache for URL: ${source.url}`);
        // Check if there's a fresh cache entry for this URL
        const cacheEntry = await this.cacheManager.checkCache(source.url);
        
        if (cacheEntry) {
          console.log(`[JobScraperService] Using cached data for source ${sourceId} from global cache ${cacheEntry.id}`);
          console.log(`[JobScraperService] Cache entry details: ${JSON.stringify(cacheEntry)}`);
          
          // Mark existing jobs from this source as inactive
          console.log(`[JobScraperService] Deactivating existing jobs for source ${sourceId}`);
          await this.jobPostingRepo.deactivateBySourceId(sourceId);
          
          // Link this source to the global cache
          console.log(`[JobScraperService] Linking source ${sourceId} to global cache ${cacheEntry.id}`);
          await this.jobSourceRepo.linkToGlobalCache(sourceId, cacheEntry.id, true);
          
          // Copy jobs from cache to this source
          console.log(`[JobScraperService] Copying jobs from cache ${cacheEntry.id} to source ${sourceId}`);
          const jobCount = await this.cacheManager.copyJobsFromCache(sourceId, cacheEntry.id);
          console.log(`[JobScraperService] Copied ${jobCount} jobs from cache`);
          
          // Update source status
          console.log(`[JobScraperService] Updating source ${sourceId} status to ACTIVE`);
          await this.jobSourceRepo.update(sourceId, {
            status: 'ACTIVE',
            lastScraped: new Date()
          });
          
          // If callbacks are provided, get jobs and call the appropriate callbacks
          if (callbacks?.onComplete) {
            console.log(`[JobScraperService] Calling onComplete callback for source ${sourceId}`);
            const jobs = await this.jobPostingRepo.getBySourceId(sourceId);
            // Convert database JobPostingRecord array to JobPostingData array
            const jobsData = jobs.map((job: JobPostingRecord) => ({
              title: job.title,
              organization: job.organization,
              location: job.location || undefined,
              description: job.description,
              salary: job.salary || undefined,
              requirements: job.requirements || undefined,
              url: job.url,
              employmentType: job.type || undefined,
              experience: job.experience || undefined,
              skills: job.skills as string[] || [],
              benefits: job.benefits || undefined,
              organizationType: job.organizationType || undefined,
              datePosted: job.datePosted || undefined,
              dateScraped: job.dateScraped,
              structuredData: job.structuredData as Record<string, any> || {},
              externalId: job.externalId || undefined
            } as JobPostingData));
            await callbacks.onComplete(jobsData);
          }
          
          console.log(`[JobScraperService] Completed cache-based refresh for source ${sourceId}`);
          return {
            sourceId,
            url: source.url,
            jobsFound: cacheEntry.jobCount ?? 0,
            jobsStored: cacheEntry.jobCount ?? 0,
            usedCache: true,
            dateCompleted: new Date()
          };
        } else {
          console.log(`[JobScraperService] No cache entry found for URL: ${source.url}`);
        }
      } else {
        console.log(`[JobScraperService] Source already has globalCacheId: ${source.globalCacheId}`);
      }
      
      // If we reach here, we need to crawl the source
      console.log(`[JobScraperService] No cache available for source ${sourceId}, proceeding with fresh crawl`);
      
      // Mark existing jobs from this source as inactive
      console.log(`[JobScraperService] Deactivating existing jobs before fresh crawl for source ${sourceId}`);
      await this.jobPostingRepo.deactivateBySourceId(sourceId);
      
      const jobsFound: JobPostingData[] = [];
      const jobsStored: number[] = [];
      
      console.log(`[JobScraperService] Starting actual crawler for source ${sourceId}, URL: ${source.url}`);
      console.log(`[JobScraperService] Keywords: ${source.keywords || 'none'}`);
      
      try {
        // Crawl job site
        console.log(`[JobScraperService] Calling crawler.refreshJobSource for source ${sourceId}`);
        await this.crawler.refreshJobSource(
          sourceId,
          source.url,
          source.keywords || undefined,
          {
            onJobFound: async (job) => {
              console.log(`[JobScraperService] Found job: ${job.title} at ${job.organization}`);
              jobsFound.push(job);
              const jobId = await this.storeJobPosting(sourceId, job);
              jobsStored.push(jobId);
              
              // Call user-provided callback if available
              if (callbacks?.onJobFound) {
                console.log(`[JobScraperService] Calling onJobFound callback for job ${job.title}`);
                await callbacks.onJobFound(job);
              }
            },
            onError: async (error, url) => {
              console.error(`[JobScraperService] Error crawling ${url}:`, error);
              await this.jobSourceRepo.updateStatus(sourceId, 'ERROR', error.message);
              
              // Call user-provided callback if available
              if (callbacks?.onError) {
                console.log(`[JobScraperService] Calling onError callback for URL ${url}`);
                await callbacks.onError(error, url);
              }
            }
          }
        );
        console.log(`[JobScraperService] Crawler finished for source ${sourceId}, found ${jobsFound.length} jobs`);
      } catch (error) {
        console.error(`[JobScraperService] Exception in crawler.refreshJobSource for source ${sourceId}:`, error);
        throw error;
      }
      
      // Update source status and last scraped date
      await this.jobSourceRepo.update(sourceId, {
        status: 'ACTIVE',
        lastScraped: new Date(),
        usedCache: false
      });
      
      // Create or update global cache entry
      try {
        let globalCacheId = source.globalCacheId;
        
        if (!globalCacheId) {
          // Create a new cache entry
          const normalizedUrl = this.urlNormalizer.normalizeUrl(source.url);
          const existingCache = await this.globalCacheRepo.getByNormalizedUrl(normalizedUrl);
          
          if (existingCache) {
            // Use existing cache entry
            globalCacheId = existingCache.id;
            await this.cacheManager.updateCacheEntry(globalCacheId, jobsFound.length);
          } else {
            // Create new cache entry
            const cacheEntry = await this.cacheManager.createCacheEntry(source.url, jobsFound.length);
            globalCacheId = cacheEntry.id;
          }
          
          // Link source to global cache
          await this.jobSourceRepo.linkToGlobalCache(sourceId, globalCacheId, false);
        } else {
          // Update existing cache entry
          await this.cacheManager.updateCacheEntry(globalCacheId, jobsFound.length);
        }
      } catch (error) {
        console.error(`Error updating global cache for source ${sourceId}:`, error);
        // Non-critical error, continue with source update
      }
      
      // Call user-provided completion callback if available
      if (callbacks?.onComplete) {
        await callbacks.onComplete(jobsFound);
      }
      
      return {
        sourceId,
        url: source.url,
        jobsFound: jobsFound.length,
        jobsStored: jobsStored.length,
        usedCache: false,
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
      
      // Call user-provided error callback if available
      if (callbacks?.onError && error instanceof Error) {
        await callbacks.onError(error, '');
      }
      
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