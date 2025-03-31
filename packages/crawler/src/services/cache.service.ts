import { 
  GlobalSourceCacheRepository, 
  JobSourceRepository, 
  JobPostingRepository 
} from "@fedjobs/database";
import { UrlNormalizationService } from "@fedjobs/utils";
import { GlobalSourceCacheRecord, JobSourceRecord, JobPostingRecord } from "@fedjobs/database";

/**
 * Service to manage global job source caching between users
 */
export class CacheService {
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
        console.log('[CacheService] Invalid URL provided');
        return undefined;
      }
      
      // Check if the URL exists in the global cache
      const cacheEntry = await this.globalCacheRepo.getByNormalizedUrl(normalizedUrl);
      
      if (!cacheEntry) {
        console.log(`[CacheService] No cache entry found for ${normalizedUrl}`);
        return undefined;
      }
      
      // Check if the cache entry is fresh (not expired)
      const now = new Date();
      if (cacheEntry.expiresAt && cacheEntry.expiresAt > now && cacheEntry.status === 'ACTIVE') {
        console.log(`[CacheService] Fresh cache entry found for ${normalizedUrl}`);
        return cacheEntry;
      }
      
      console.log(`[CacheService] Cache entry found but expired for ${normalizedUrl}`);
      return undefined;
    } catch (error) {
      console.error('[CacheService] Error checking cache:', error);
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
      
      if (!normalizedUrl || !domain) {
        throw new Error(`Invalid URL: ${url}`);
      }
      
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
      
      console.log(`[CacheService] Created new cache entry for ${normalizedUrl}`);
      
      return cacheEntry;
    } catch (error) {
      console.error('[CacheService] Error creating cache entry:', error);
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
        console.log(`[CacheService] Updated cache entry ${cacheId} with ${jobCount} jobs`);
        return updatedEntries[0];
      }
      
      return undefined;
    } catch (error) {
      console.error('[CacheService] Error updating cache entry:', error);
      return undefined;
    }
  }
  
  /**
   * Get or create a global cache entry for a URL
   * @param url The URL to check or create an entry for
   * @param jobCount The number of jobs found (when creating)
   * @param expiryDays Days until expiration (when creating)
   */
  async getOrCreateCacheEntry(url: string, jobCount: number = 0, expiryDays: number = 1): Promise<GlobalSourceCacheRecord> {
    try {
      const normalizedUrl = this.urlNormalizer.normalizeUrl(url);
      
      // Check if entry already exists
      const existingEntry = await this.globalCacheRepo.getByNormalizedUrl(normalizedUrl);
      
      if (existingEntry) {
        // Update existing entry
        const updated = await this.updateCacheEntry(existingEntry.id, jobCount, expiryDays);
        return updated || existingEntry;
      } else {
        // Create new entry
        return this.createCacheEntry(url, jobCount, expiryDays);
      }
    } catch (error) {
      console.error('[CacheService] Error in getOrCreateCacheEntry:', error);
      throw error;
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
      
      // Sort sources by last scraped date (most recent first)
      const sortedSources = sources.filter(s => s.lastScraped !== null)
        .sort((a, b) => {
          const dateA = a.lastScraped ? new Date(a.lastScraped).getTime() : 0;
          const dateB = b.lastScraped ? new Date(b.lastScraped).getTime() : 0;
          return dateB - dateA;
        });
      
      // Use the most recent source, or first one if no lastScraped date exists
      const recentSource = sortedSources.length > 0 ? sortedSources[0] : sources[0];
      
      // Get jobs from this source
      const jobs = await this.jobPostingRepo.getBySourceId(recentSource.id);
      console.log(`[CacheService] Found ${jobs.length} jobs to copy from source ${recentSource.id}`);
      
      if (jobs.length === 0) {
        console.log(`[CacheService] No jobs found for source ${recentSource.id}, cache may be stale`);
        return 0;
      }
      
      // Copy jobs to the new source
      const jobsToInsert = jobs.map(job => ({
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
      }));
      
      // Bulk insert jobs
      const insertedJobs = await this.jobPostingRepo.bulkInsert(jobsToInsert);
      
      console.log(`[CacheService] Copied ${insertedJobs.length} jobs to source ${sourceId}`);
      
      // Increment the user count for the cache entry
      await this.globalCacheRepo.incrementUserCount(cacheId);
      
      // Update the job source to indicate it used cache
      await this.jobSourceRepo.update(sourceId, {
        lastScraped: new Date(),
        status: 'ACTIVE',
        usedCache: true,
        globalCacheId: cacheId
      });
      
      return insertedJobs.length;
    } catch (error) {
      console.error('[CacheService] Error copying jobs from cache:', error);
      throw error;
    }
  }
  
  /**
   * Link a job source to a global cache entry
   * @param sourceId The ID of the job source to link
   * @param cacheId The ID of the global cache entry
   * @param usedCache Whether the source used the cache
   */
  async linkSourceToCache(sourceId: number, cacheId: number, usedCache: boolean = false): Promise<void> {
    try {
      await this.jobSourceRepo.update(sourceId, {
        globalCacheId: cacheId,
        usedCache
      });
      console.log(`[CacheService] Linked source ${sourceId} to cache ${cacheId}`);
    } catch (error) {
      console.error('[CacheService] Error linking source to cache:', error);
      throw error;
    }
  }
} 