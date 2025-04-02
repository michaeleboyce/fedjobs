// src/services/scraper.service.ts
import { ICrawler } from '../interfaces/ICrawler';
import { IParser } from '../interfaces/IParser';
import { ICacheService } from '../interfaces/ICacheService';
import { ILogger } from '../interfaces/ILogger';
import { CrawlJobOptions, JobCrawlerResult, JobPostingData, UrlNormalizer } from '../types';
import { CrawlerError, ErrorCode } from '../utils/errors';
import { 
  JobPostingRepository, 
  JobSourceRepository,
  JobSourceRecord,
  employmentType,
  organizationType
} from '@fedjobs/database';

export class ScraperService {
  private crawler: ICrawler;
  private parser: IParser;
  private cacheService: ICacheService;
  private logger: ILogger;
  private jobPostingRepo: JobPostingRepository;
  private jobSourceRepo: JobSourceRepository;
  private urlNormalizer: UrlNormalizer;
  
  constructor(
    crawler: ICrawler,
    parser: IParser,
    cacheService: ICacheService,
    logger: ILogger,
    urlNormalizer: UrlNormalizer,
    jobPostingRepo: JobPostingRepository = new JobPostingRepository(),
    jobSourceRepo: JobSourceRepository = new JobSourceRepository()
  ) {
    this.crawler = crawler;
    this.parser = parser;
    this.cacheService = cacheService;
    this.logger = logger;
    this.urlNormalizer = urlNormalizer;
    this.jobPostingRepo = jobPostingRepo;
    this.jobSourceRepo = jobSourceRepo;
    
    this.logger.info('ScraperService initialized');
  }
  
  /**
   * Normalizes employment type strings to match database enum values
   */
  private normalizeEmploymentType(type?: string): (typeof employmentType.enumValues)[number] | undefined {
    if (!type) return undefined;
    
    // Convert to uppercase for comparison
    const normalized = type.toUpperCase();
    
    // Map common variations to database enum values
    const typeMap: Record<string, (typeof employmentType.enumValues)[number]> = {
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
  private normalizeOrganizationType(type?: string): (typeof organizationType.enumValues)[number] | undefined {
    if (!type) return undefined;
    
    // Convert to uppercase for comparison
    const normalized = type.toUpperCase();
    
    // Map common variations to database enum values
    const typeMap: Record<string, (typeof organizationType.enumValues)[number]> = {
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
  
  /**
   * Validate that the content is actually a job posting
   * @param jobData Job data to validate
   * @returns Whether the content is a valid job posting
   */
  private async validateJobPosting(jobData: JobPostingData): Promise<{ isValid: boolean; reasons?: string[] }> {
    try {
      // Check for minimum required fields
      if (!jobData.title || !jobData.organization || !jobData.description) {
        return { 
          isValid: false, 
          reasons: [
            'Missing required fields',
            !jobData.title ? 'No job title' : '',
            !jobData.organization ? 'No organization' : '',
            !jobData.description ? 'No job description' : ''
          ].filter(Boolean) as string[]
        };
      }
      
      // Check for minimum description length
      if (jobData.description.length < 50) {
        return { isValid: false, reasons: ['Job description too short'] };
      }
      
      // Check for suspicious titles
      const suspiciousTitlePatterns = [
        /404 not found/i,
        /home page/i,
        /welcome/i,
        /index/i,
        /login/i,
        /sign[ -]?in/i,
        /register/i,
        /about us/i,
        /privacy/i,
        /terms/i
      ];
      
      if (suspiciousTitlePatterns.some(pattern => pattern.test(jobData.title))) {
        return { isValid: false, reasons: ['Suspicious job title indicates this is not a job posting'] };
      }
      
      // Use AI to verify this is an actual job posting
      const prompt = `
        Determine if the following content is a legitimate job posting. Analyze the title, organization, and description.

        Title: ${jobData.title}
        Organization: ${jobData.organization}
        ${jobData.location ? `Location: ${jobData.location}` : ''}
        
        Description snippet: ${jobData.description.substring(0, 500)}...
        
        A legitimate job posting typically:
        1. Has a specific job title (not generic page titles like "Home", "About Us", etc.)
        2. Describes specific responsibilities, requirements, or qualifications
        3. Mentions employment details such as job type, hours, or compensation
        4. Has a professional tone consistent with job advertisements
        
        Return a JSON object with:
        {
          "isLegitimateJob": true/false,
          "confidence": 0-1 (how confident you are in this assessment),
          "reasons": ["list", "of", "reasons", "for", "your", "decision"]
        }
      `;
      
      try {
        const aiResponse = await this.parser.getAIService().generateText({
          prompt,
          model: "gpt-4o",
          temperature: 0.1,
          maxTokens: 1000
        });
        
        // Parse the AI response
        try {
          // This regex matches any JSON object in the text
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const validation = JSON.parse(jsonMatch[0]);
            
            if (!validation.isLegitimateJob && validation.confidence > 0.7) {
              this.logger.info(`AI determined content is not a legitimate job (${(validation.confidence*100).toFixed(1)}% confident)`);
              return { 
                isValid: false, 
                reasons: validation.reasons || ['AI determined this is not a legitimate job posting'] 
              };
            }
          }
        } catch (e) {
          this.logger.error('Error parsing AI validation response:', { error: e });
          // Continue with basic validation if AI parsing fails
        }
      } catch (error) {
        this.logger.error('Error in AI job validation:', { error });
        // Continue with basic validation if AI call fails
      }
      
      return { isValid: true };
    } catch (error) {
      this.logger.error('Error validating job posting:', { error });
      // Default to valid if validation fails to prevent blocking legitimate jobs
      return { isValid: true };
    }
  }
  
  /**
   * Check if a job posting already exists in the database
   * @param sourceId Source ID to check against
   * @param jobData Job data to check
   * @returns Existing job ID if found, null otherwise
   */
  private async checkForExistingJob(sourceId: number, jobData: JobPostingData): Promise<number | null> {
    try {
      // First check for exact URL match within this source
      const existingByUrl = await this.jobPostingRepo.findByUrlAndSourceId(jobData.url, sourceId);
      if (existingByUrl) {
        this.logger.info(`Found existing job with matching URL: ${existingByUrl.id}`);
        return existingByUrl.id;
      }
      
      // Next check for title + organization match within this source
      const existingByTitleOrg = await this.jobPostingRepo.findByTitleAndOrganization(
        jobData.title, 
        jobData.organization,
        sourceId
      );
      
      if (existingByTitleOrg) {
        this.logger.info(`Found existing job with matching title and organization: ${existingByTitleOrg.id}`);
        return existingByTitleOrg.id;
      }
      
      // No match found
      return null;
    } catch (error) {
      this.logger.error('Error checking for existing job:', { error });
      return null;
    }
  }
  
  /**
   * Store a job posting in the database
   * @param sourceId Source ID to associate the job with
   * @param jobData Job data to store
   * @returns ID of the created or updated job posting
   */
  private async storeJobPosting(sourceId: number, jobData: JobPostingData): Promise<number> {
    try {
      this.logger.info(`Processing job: "${jobData.title}" at ${jobData.organization}`);
      
      // Step 1: Validate the job posting
      const validation = await this.validateJobPosting(jobData);
      if (!validation.isValid) {
        this.logger.info(`Skipping invalid job posting: ${validation.reasons?.join(', ')}`);
        return -1; // Invalid job
      }
      
      // Step 2: Check for duplicates
      const existingJobId = await this.checkForExistingJob(sourceId, jobData);
      
      // Step 3: Either update existing or create new job
      if (existingJobId) {
        // Update existing job
        this.logger.info(`Updating existing job with ID: ${existingJobId}`);
        
        await this.jobPostingRepo.update(existingJobId, {
          title: jobData.title,
          organization: jobData.organization,
          location: jobData.location || '',
          description: jobData.description,
          salary: jobData.salary || null,
          requirements: jobData.requirements || null,
          url: jobData.url,
          type: this.normalizeEmploymentType(jobData.employmentType) || null,
          externalId: jobData.externalId || null,
          organizationType: this.normalizeOrganizationType(jobData.organizationType) || null,
          dateScraped: new Date(), // Update scrape date
          isActive: true, // Mark as active
          structuredData: {
            ...(jobData.structuredData || {}),
            updateHistory: [
              ...(jobData.structuredData?.updateHistory || []),
              { date: new Date().toISOString(), action: 'updated' }
            ]
          },
          skills: jobData.skills || []
        });
        
        return existingJobId;
      } else {
        // Create new job
        this.logger.info(`Creating new job entry for sourceId ${sourceId}`);
        
        const newJob = await this.jobPostingRepo.insert({
          sourceId,
          title: jobData.title,
          organization: jobData.organization,
          location: jobData.location || '',
          description: jobData.description,
          salary: jobData.salary || null,
          requirements: jobData.requirements || null,
          url: jobData.url,
          type: this.normalizeEmploymentType(jobData.employmentType) || null,
          externalId: jobData.externalId || null,
          organizationType: this.normalizeOrganizationType(jobData.organizationType) || null,
          datePosted: jobData.datePosted || new Date(),
          dateScraped: new Date(),
          structuredData: {
            ...(jobData.structuredData || {}),
            creationHistory: [
              { date: new Date().toISOString(), action: 'created' }
            ]
          },
          skills: jobData.skills || []
        });
        
        this.logger.info(`Successfully stored new job with ID: ${newJob.id}`);
        return newJob.id;
      }
    } catch (error) {
      this.logger.error('Error storing job posting:', { error });
      throw new CrawlerError(
        'Failed to store job posting',
        ErrorCode.UNEXPECTED_ERROR,
        error instanceof Error ? error : undefined,
        { sourceId, jobTitle: jobData.title }
      );
    }
  }
  
  /**
   * Cancel an active job refresh
   * @param sourceId ID of the source to cancel
   * @returns Whether cancellation was successful
   */
  async cancelRefresh(sourceId: number): Promise<boolean> {
    try {
      this.logger.info(`Cancelling refresh for source ${sourceId}`);
      
      // Get the source to ensure it exists
      const source = await this.jobSourceRepo.getById(sourceId);
      if (!source) {
        this.logger.error(`Job source with ID ${sourceId} not found`);
        return false;
      }
      
      // Cancel the crawler
      const cancelled = await this.crawler.cancelCrawler(sourceId);
      
      // Update status to ACTIVE in the database
      await this.jobSourceRepo.updateStatus(sourceId, 'ACTIVE');
      
      return cancelled;
    } catch (error) {
      this.logger.error(`Error cancelling refresh for source ${sourceId}:`, { error });
      return false;
    }
  }
  
  /**
   * Schedule refresh of job sources based on frequency
   * @param frequency The refresh frequency (DAILY, WEEKLY, etc)
   * @returns A promise that resolves when the refresh scheduling is complete
   */
  async scheduleRefresh(frequency: string): Promise<void> {
    try {
      this.logger.info(`Scheduling refresh for ${frequency} frequency sources`);
      
      // Get sources with the specified refresh frequency
      const sources = await this.jobSourceRepo.getSourcesForScheduledRefresh(frequency);
      this.logger.info(`Found ${sources.length} sources with ${frequency} refresh frequency`);
      
      // Process each source
      for (const source of sources) {
        try {
          this.logger.info(`Scheduling refresh for source ${source.id}: ${source.name || source.url}`);
          
          // Queue up the refresh operation
          this.refreshJobSource(source.id, {
            onComplete: async (jobs) => {
              this.logger.info(`Scheduled refresh completed for source ${source.id} with ${jobs.length} jobs`);
            },
            onError: async (error) => {
              this.logger.error(`Error in scheduled refresh for source ${source.id}:`, { error });
            }
          }, false).catch(error => {
            this.logger.error(`Failed to refresh source ${source.id}:`, { error });
          });
          
          // Small delay between sources to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          this.logger.error(`Error processing source ${source.id}:`, { error });
          // Continue with next source
        }
      }
      
      this.logger.info(`Scheduled refresh initialized for ${sources.length} sources`);
    } catch (error) {
      this.logger.error(`Error in scheduleRefresh:`, { error });
      throw new CrawlerError(
        'Failed to schedule refresh',
        ErrorCode.UNEXPECTED_ERROR,
        error instanceof Error ? error : undefined,
        { frequency }
      );
    }
  }
  
  /**
   * Refresh a job source by crawling it for job listings
   * @param sourceId ID of the source to refresh
   * @param callbacks Optional callbacks for job events
   * @param forceRefresh Whether to skip the cache and force a fresh crawl
   * @returns Crawl result information
   */
  async refreshJobSource(
    sourceId: number,
    callbacks?: {
      onJobFound?: (job: JobPostingData) => Promise<void>;
      onComplete?: (jobs: JobPostingData[]) => Promise<void>;
      onError?: (error: Error, url: string) => Promise<void>;
    },
    forceRefresh: boolean = false
  ): Promise<JobCrawlerResult> {
    this.logger.info(`Starting refresh for job source ${sourceId}, forceRefresh: ${forceRefresh}`);
    try {
      // Get source data
      const source = await this.jobSourceRepo.getById(sourceId);
      if (!source) {
        throw new CrawlerError(
          `Job source with ID ${sourceId} not found`,
          ErrorCode.INVALID_ARGUMENTS
        );
      }
      
      // Update source status to PENDING
      await this.jobSourceRepo.updateStatus(sourceId, 'PENDING');
      
      // Check if we can use a cached version (unless forceRefresh is true)
      if (!forceRefresh && !source.globalCacheId) {
        this.logger.info(`Checking cache for URL: ${source.url}`);
        
        // Check if there's a fresh cache entry for this URL
        const cacheEntry = await this.cacheService.checkCache(source.url);
        
        if (cacheEntry) {
          this.logger.info(`Using cached data for source ${sourceId} from global cache ${cacheEntry.id}`);
          
          // Mark existing jobs from this source as inactive
          this.logger.info(`Deactivating existing jobs for source ${sourceId}`);
          await this.jobPostingRepo.deactivateBySourceId(sourceId);
          
          // Copy jobs from cache to this source
          this.logger.info(`Copying jobs from cache ${cacheEntry.id} to source ${sourceId}`);
          const jobCount = await this.cacheService.copyJobsFromCache(sourceId, cacheEntry.id);
          
          // If callbacks are provided, get jobs and call the appropriate callbacks
          if (callbacks?.onComplete) {
            const jobs = await this.jobPostingRepo.getBySourceId(sourceId);
            // Convert database records to JobPostingData
            const jobsData = jobs.map((job: any) => ({
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
          
          // Update the job source to reflect cache usage
          await this.jobSourceRepo.update(sourceId, {
            status: 'ACTIVE',
            lastScraped: new Date(),
            usedCache: true,
            usedCacheForLastUpdate: true,
            globalCacheId: cacheEntry.id
          });
          
          return {
            sourceId,
            url: source.url,
            jobsFound: jobCount,
            jobsStored: jobCount,
            usedCache: true,
            dateCompleted: new Date()
          };
        }
      }
      
      // Need to perform a fresh crawl
      this.logger.info(`Performing fresh crawl for source ${sourceId}, URL: ${source.url}`);
      
      // Mark existing jobs from this source as inactive
      await this.jobPostingRepo.deactivateBySourceId(sourceId);
      
      const jobsFound: JobPostingData[] = [];
      const jobsStored: number[] = [];
      
      // Crawl the job site
      const crawlOptions: CrawlJobOptions = {
        url: source.url,
        keywords: source.keywords || undefined,
        maxJobs: 50,
        sourceId,
        onJobFound: async (job) => {
          this.logger.info(`Found job: ${job.title} at ${job.organization}`);
          
          // Store the job and get its ID
          const jobId = await this.storeJobPosting(sourceId, job);
          
          // Only process valid jobs that were successfully stored (jobId > 0)
          if (jobId > 0) {
            // Add to the list of processed jobs
            jobsFound.push(job);
            jobsStored.push(jobId);
            
            // Call the onJobFound callback only for valid jobs
            if (callbacks?.onJobFound) {
              await callbacks.onJobFound(job);
            }
          } else {
            this.logger.info(`Skipping invalid job: ${job.title}`);
          }
        },
        onError: async (error, url) => {
          this.logger.error(`Error crawling ${url}:`, { error });
          
          if (callbacks?.onError) {
            await callbacks.onError(error, url);
          }
        }
      };
      
      // Perform the actual crawl
      const crawlResults = await this.crawler.crawlJobSite(crawlOptions);
      
      // Update source status and last scraped date
      await this.jobSourceRepo.update(sourceId, {
        status: 'ACTIVE',
        lastScraped: new Date(),
        usedCache: false,
        usedCacheForLastUpdate: false
      });
      
      // Create or update global cache entry
      try {
        let globalCacheId = source.globalCacheId;
        
        if (!globalCacheId) {
          // Get or create a cache entry
          const cacheEntry = await this.cacheService.createCacheEntry(source.url, jobsFound.length);
          globalCacheId = cacheEntry.id;
          
          // Link source to global cache
          await this.cacheService.linkSourceToCache(sourceId, globalCacheId, false);
        } else {
          // Update existing cache entry
          await this.cacheService.updateCacheEntry(globalCacheId, jobsFound.length);
        }
      } catch (error) {
        this.logger.error(`Error updating cache for source ${sourceId}:`, { error });
        // Continue despite cache error since we have the main job data
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
      this.logger.error(`Error refreshing job source ${sourceId}:`, { error });
      
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
      
      // Create a properly structured error to return
      const crawlerError = new CrawlerError(
        `Failed to refresh job source ${sourceId}`,
        ErrorCode.UNEXPECTED_ERROR,
        error instanceof Error ? error : undefined,
        { sourceId }
      );
      
      return {
        sourceId,
        url: '',
        jobsFound: 0,
        jobsStored: 0,
        error: crawlerError.message,
        dateCompleted: new Date()
      };
    }
  }
}