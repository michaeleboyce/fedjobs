// File path: packages/utils/src/Services/JobSourceCacheManager.ts

import { GlobalSourceCacheRepository } from "@fedjobs/database/src/repositories/globalSourceCache";
import { JobSourceRepository } from "@fedjobs/database/src/repositories/jobSources";
import { JobPostingRepository } from "@fedjobs/database/src/repositories/jobPostings";
import { UrlNormalizationService } from "./UrlNormalizationService";
import { GlobalSourceCacheRecord } from "@fedjobs/database/src/schema/globalSourceCache";
import { JobPostingData } from "./JobCrawlerService/types";

/**
 * Manager service for handling job source caching across users
 */
export class JobSourceCacheManager {
  private globalCacheRepo: GlobalSourceCacheRepository;
  private jobSourceRepo: JobSourceRepository;
  private jobPostingRepo: JobPostingRepository;
  private urlNormalizer: UrlNormalizationService;
  
  constructor() {
    this.globalCacheRepo = new GlobalSourceCacheRepository();
    this.jobSourceRepo = new JobSourceRepository();
    this.jobPostingRepo = new JobPostingRepository();
    this.urlNormalizer = new UrlNormalizationService();
  }
  
  /**
   * Check if a URL exists in the global cache and is fresh
   * @param url The URL to check
   * @returns The cache entry if found and fresh, undefined otherwise
   */
  async checkCache(url: string): Promise<GlobalSourceCacheRecord | undefined> {
    try {
      // Normalize the URL for consistent comparison
      const normalizedUrl = this.urlNormalizer.normalizeUrl(url);
      
      if (!normalizedUrl) {
        console.log('[JobSourceCacheManager] Invalid URL provided');
        return undefined;
      }
      
      // Check if the URL exists in the global cache
      const cacheEntry = await this.globalCacheRepo.getByNormalizedUrl(normalizedUrl);
      
      if (!cacheEntry) {
        console.log(`[JobSourceCacheManager] No cache entry found for ${normalizedUrl}`);
        return undefined;
      }
      
      // Check if the cache entry is fresh (not expired)
      const now = new Date();
      if (cacheEntry.expiresAt && cacheEntry.expiresAt > now && cacheEntry.status === 'ACTIVE') {
        console.log(`[JobSourceCacheManager] Fresh cache entry found for ${normalizedUrl}`);
        return cacheEntry;
      }
      
      console.log(`[JobSourceCacheManager] Cache entry found but expired for ${normalizedUrl}`);
      return undefined;
    } catch (error) {
      console.error('[JobSourceCacheManager] Error checking cache:', error);
      return undefined;
    }
  }
  
  /**
   * Create a global cache entry for a URL
   * @param url The URL to cache
   * @param jobCount The number of jobs found for this source
   * @param expiryDays Number of days until the cache expires
   */
  async createCacheEntry(url: string, jobCount: number = 0, expiryDays: number = 1): Promise<GlobalSourceCacheRecord> {
    try {
      // Normalize the URL for consistent comparison
      const normalizedUrl = this.urlNormalizer.normalizeUrl(url);
      const domain = this.urlNormalizer.extractDomain(url);
      
      // Calculate expiration date
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + expiryDays);
      
      // Create a new cache entry
      const cacheEntry = await this.globalCacheRepo.insert({
        normalizedUrl,
        originalUrl: url,
        domain,
        lastCrawled: now,
        expiresAt,
        status: 'ACTIVE',
        jobCount,
        userCount: 1
      });
      
      console.log(`[JobSourceCacheManager] Created new cache entry for ${normalizedUrl}`);
      
      return cacheEntry;
    } catch (error) {
      console.error('[JobSourceCacheManager] Error creating cache entry:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing cache entry
   * @param cacheId The ID of the cache entry to update
   * @param jobCount The number of jobs found for this source
   * @param expiryDays Number of days until the cache expires
   */
  async updateCacheEntry(cacheId: number, jobCount: number, expiryDays: number = 1): Promise<GlobalSourceCacheRecord | undefined> {
    try {
      const updatedEntries = await this.globalCacheRepo.markRefreshed(cacheId, jobCount, expiryDays);
      
      if (updatedEntries.length > 0) {
        console.log(`[JobSourceCacheManager] Updated cache entry ${cacheId} with ${jobCount} jobs`);
        return updatedEntries[0];
      }
      
      return undefined;
    } catch (error) {
      console.error('[JobSourceCacheManager] Error updating cache entry:', error);
      return undefined;
    }
  }
  
  /**
   * Copy jobs from global cache to a specific user source
   * @param sourceId The ID of the user's job source
   * @param cacheId The ID of the global cache entry
   */
  async copyJobsFromCache(sourceId: number, cacheId: number): Promise<number> {
    try {
      // Get the global cache entry
      const cacheEntry = await this.globalCacheRepo.getById(cacheId);
      if (!cacheEntry) {
        throw new Error(`Cache entry ${cacheId} not found`);
      }
      
      // Find the most recent source that used this cache entry
      const sources = await this.jobSourceRepo.getByGlobalCacheId(cacheId);
      if (sources.length === 0) {
        throw new Error(`No sources found using cache entry ${cacheId}`);
      }
      
      // Find the source with the most recent jobs
      const recentSource = sources.reduce((latest, current) => {
        if (!latest.lastScraped) return current;
        if (!current.lastScraped) return latest;
        return current.lastScraped > latest.lastScraped ? current : latest;
      });
      
      // Get jobs from this source
      const jobs = await this.jobPostingRepo.getBySourceId(recentSource.id);
      console.log(`[JobSourceCacheManager] Found ${jobs.length} jobs to copy from source ${recentSource.id}`);
      
      // Copy jobs to the new source
      let copiedCount = 0;
      for (const job of jobs) {
        // Create a new job posting with the new source ID
        await this.jobPostingRepo.insert({
          sourceId,
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
          status: job.status,
          datePosted: job.datePosted,
          dateScraped: new Date(),
          structuredData: job.structuredData,
          benefits: job.benefits,
          skills: job.skills as any,
          externalId: job.externalId
        });
        
        copiedCount++;
      }
      
      console.log(`[JobSourceCacheManager] Copied ${copiedCount} jobs to source ${sourceId}`);
      
      // Increment the user count for the cache entry
      await this.globalCacheRepo.incrementUserCount(cacheId);
      
      // Update the job source to indicate it used cache
      await this.jobSourceRepo.update(sourceId, {
        lastScraped: new Date(),
        status: 'ACTIVE',
        usedCache: true
      });
      
      return copiedCount;
    } catch (error) {
      console.error('[JobSourceCacheManager] Error copying jobs from cache:', error);
      throw error;
    }
  }
}