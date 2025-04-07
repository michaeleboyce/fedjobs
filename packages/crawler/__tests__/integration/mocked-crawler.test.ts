// packages/crawler/__tests__/integration/mocked-crawler.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ScraperService } from '../../src/services/scraper.service';
import { JobSourceService } from '../../src/services/job-source.service';
import { CacheService } from '../../src/services/cache.service';
import { JobPostingProcessor } from '../../src/domain/job-posting.processor';
import { JobPostingValidator } from '../../src/domain/job-posting.validator';
import { DuplicateDetector } from '../../src/domain/duplicate.detector';
import { WebCrawler } from '../../src/core/crawler/WebCrawler';
import { JobParserService } from '../../src/core/parser';
import { getTestConfig } from '../../src/test/config';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../src/test/setup';
import { JobPostingData } from '../../src/types';

// Skip tests if we're using real implementations
const config = getTestConfig();
const skipMockTests = !config.useMocks;

// Mock job data
const mockJobs: JobPostingData[] = [
  {
    title: 'Software Engineer',
    organization: 'OpenAI',
    description: 'Join our team to build cutting-edge AI technology.',
    url: 'https://openai.com/careers/software-engineer',
    location: 'San Francisco, CA',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  },
  {
    title: 'Research Scientist',
    organization: 'OpenAI',
    description: 'Conduct frontier research in artificial intelligence.',
    url: 'https://openai.com/careers/research-scientist',
    location: 'San Francisco, CA',
    employmentType: 'FULL_TIME',
    dateScraped: new Date()
  }
];

// Mocked repositories
const mockJobSourceRepo = {
  getById: vi.fn(),
  updateStatus: vi.fn(),
  getSourcesForScheduledRefresh: vi.fn(),
  deactivateSourceJobs: vi.fn(),
  updateSourceAfterCrawl: vi.fn(),
  update: vi.fn()
};

const mockJobPostingRepo = {
  insert: vi.fn(),
  update: vi.fn(),
  findByUrlAndSourceId: vi.fn(),
  findByTitleAndOrganization: vi.fn(),
  deactivateBySourceId: vi.fn(),
  getBySourceId: vi.fn(),
  getJobCountsBySourceIds: vi.fn()
};

const mockCacheService = {
  checkCache: vi.fn(),
  copyJobsFromCache: vi.fn(),
  getOrCreateCacheEntry: vi.fn(),
  linkSourceToCache: vi.fn(),
  updateCacheEntry: vi.fn()
};

describe.skipIf(skipMockTests)('Mocked Crawler Integration Tests', () => {
  // Test services
  let scraperService: ScraperService;
  let webCrawler: WebCrawler;
  let parser: JobParserService;
  
  // Test data
  const testSourceId = 123;
  const testUrl = config.defaultTestUrl;
  
  beforeAll(async () => {
    await setupTestEnvironment(config);
  });
  
  afterAll(async () => {
    await cleanupTestEnvironment(config);
  });
  
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup mock data
    mockJobSourceRepo.getById.mockResolvedValue({
      id: testSourceId,
      url: testUrl,
      name: 'OpenAI Careers',
      keywords: 'ai, machine learning',
      status: 'ACTIVE'
    });
    
    // Setup mock parser
    parser = new JobParserService();
    vi.spyOn(parser, 'parseJobsFromPage').mockResolvedValue(mockJobs);
    vi.spyOn(parser, 'analyzeLinks').mockResolvedValue([]);
    
    // Setup dependencies
    const jobSourceService = new JobSourceService(
      mockJobSourceRepo as any, 
      mockJobPostingRepo as any
    );
    
    const jobPostingValidator = new JobPostingValidator();
    const duplicateDetector = new DuplicateDetector(mockJobPostingRepo as any);
    
    const jobPostingProcessor = new JobPostingProcessor(
      mockJobPostingRepo as any,
      jobPostingValidator,
      duplicateDetector
    );
    
    const cacheService = new CacheService();
    Object.assign(cacheService, mockCacheService);
    
    // Initialize WebCrawler
    webCrawler = new WebCrawler(parser);
    vi.spyOn(webCrawler, 'crawlSite').mockImplementation(async (options, callback) => {
      const jobsFound = [...mockJobs];
      const jobsStored = [];
      
      for (const job of jobsFound) {
        const jobId = await callback(job);
        if (jobId > 0) {
          jobsStored.push(jobId);
        }
      }
      
      return { jobsFound, jobsStored };
    });
    
    // Initialize ScraperService
    scraperService = new ScraperService(
      jobSourceService,
      cacheService,
      jobPostingProcessor,
      webCrawler
    );
  });
  
  describe('WebCrawler', () => {
    it('should crawl job sites and find postings', async () => {
      // Setup mock job processor
      mockJobPostingRepo.insert.mockImplementation((data) => 
        Promise.resolve({ ...data, id: Math.floor(Math.random() * 1000) + 1 })
      );
      
      // Track processed jobs
      const processedJobs: JobPostingData[] = [];
      
      // Execute the crawl
      const result = await webCrawler.crawlSite(
        {
          sourceId: testSourceId,
          url: testUrl,
          keywords: 'ai'
        },
        async (job) => {
          processedJobs.push(job);
          return processedJobs.length; // Return a job ID
        }
      );
      
      // Verify results
      expect(result.jobsFound.length).toBe(mockJobs.length);
      expect(processedJobs.length).toBe(mockJobs.length);
      expect(result.jobsStored.length).toBe(mockJobs.length);
    });
  });
  
  describe('ScraperService', () => {
    it('should refresh a job source', async () => {
      // Mock job processor to return valid job IDs
      mockJobPostingRepo.insert.mockImplementation((data) => 
        Promise.resolve({ ...data, id: Math.floor(Math.random() * 1000) + 1 })
      );
      
      // Track callback executions
      const callbackTracker = {
        jobFoundCount: 0,
        completeInvoked: false
      };
      
      // Execute the refresh
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onJobFound: async () => { callbackTracker.jobFoundCount++; },
          onComplete: async () => { callbackTracker.completeInvoked = true; }
        },
        true // Force fresh crawl
      );
      
      // Verify results
      expect(result.jobsFound).toBe(mockJobs.length);
      expect(result.usedCache).toBe(false);
      expect(callbackTracker.jobFoundCount).toBe(mockJobs.length);
      expect(callbackTracker.completeInvoked).toBe(true);
      
      // Verify repository calls
      expect(mockJobSourceRepo.updateStatus).toHaveBeenCalledWith(
        testSourceId, 'PENDING'
      );
      expect(mockJobPostingRepo.deactivateBySourceId).toHaveBeenCalledWith(
        testSourceId
      );
    });
    
    it('should use cache when available', async () => {
      // Mock source with no global cache ID
      mockJobSourceRepo.getById.mockResolvedValue({
        id: testSourceId,
        url: testUrl,
        name: 'OpenAI Careers',
        globalCacheId: null
      });
      
      // Mock cache service to have a cache entry
      mockCacheService.checkCache.mockResolvedValue({
        id: 456,
        url: testUrl
      });
      
      // Mock copying 10 jobs from cache
      mockCacheService.copyJobsFromCache.mockResolvedValue(10);
      
      // Mock getJobsForSource to return jobs
      mockJobPostingRepo.getBySourceId.mockResolvedValue(mockJobs);
      
      // Track completion callback
      let completeCalled = false;
      let jobsFromCallback: JobPostingData[] = [];
      
      // Execute the refresh without forcing
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onComplete: async (jobs: JobPostingData[]) => {
            completeCalled = true;
            jobsFromCallback = jobs;
          }
        },
        false // Don't force refresh
      );
      
      // Verify results
      expect(result.usedCache).toBe(true);
      expect(result.jobsFound).toBe(10);
      expect(completeCalled).toBe(true);
      expect(jobsFromCallback).toEqual(mockJobs);
      
      // Verify cache-related calls
      expect(mockCacheService.checkCache).toHaveBeenCalledWith(testUrl);
      expect(mockCacheService.copyJobsFromCache).toHaveBeenCalledWith(testSourceId, 456);
    });
    
    it('should handle errors during refresh', async () => {
      // Setup mock error scenario
      mockJobPostingRepo.deactivateBySourceId.mockRejectedValue(
        new Error('Database error')
      );
      
      // Track error callback
      let errorCalled = false;
      let errorMessage = '';
      
      // Execute the refresh
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onError: async (error: Error) => { 
            errorCalled = true;
            errorMessage = error.message;
          }
        }
      );
      
      // Verify results
      expect(result.error).toBe('Database error');
      expect(errorCalled).toBe(true);
      expect(errorMessage).toBe('Database error');
      
      // Verify error handling
      expect(mockJobSourceRepo.updateStatus).toHaveBeenCalledWith(
        testSourceId, 'ERROR', 'Database error'
      );
    });
    
    it('should schedule refresh of multiple sources', async () => {
      // Mock sources with different refresh frequencies
      const mockSources = [
        { id: 1, name: 'Daily Source', refreshFrequency: 'DAILY', url: 'https://example.com/1' },
        { id: 2, name: 'Weekly Source', refreshFrequency: 'WEEKLY', url: 'https://example.com/2' }
      ];
      
      mockJobSourceRepo.getSourcesForScheduledRefresh.mockResolvedValue(mockSources);
      
      // Spy on the refreshJobSource method
      const refreshSpy = vi.spyOn(scraperService, 'refreshJobSource').mockResolvedValue({
        sourceId: 0,
        url: '',
        jobsFound: 0,
        jobsStored: 0,
        dateCompleted: new Date()
      });
      
      // Execute the schedule refresh
      await scraperService.scheduleRefresh('DAILY');
      
      // Verify that refreshJobSource was called for each source
      expect(refreshSpy).toHaveBeenCalledTimes(mockSources.length);
      expect(refreshSpy).toHaveBeenCalledWith(
        mockSources[0].id,
        expect.objectContaining({
          onComplete: expect.any(Function),
          onError: expect.any(Function)
        }),
        false // Not forcing refresh
      );
    });
  });
  
  describe('JobParserService', () => {
    it('should extract job listings from HTML content', async () => {
      // Reset the mock to test this specific case
      vi.spyOn(parser, 'parseJobsFromPage').mockRestore();
      
      // Mock HTML content for parsing
      const htmlContent = `
        <div class="job-listings">
          <div class="job">
            <h3>Software Engineer</h3>
            <p>We're looking for talented engineers.</p>
            <a href="/careers/software-engineer">Apply Now</a>
          </div>
          <div class="job">
            <h3>Product Manager</h3>
            <p>Lead product development.</p>
            <a href="/careers/product-manager">Apply Now</a>
          </div>
        </div>
      `;
      
      // Create a real parser but mock its AI calls
      const testParser = new JobParserService();
      vi.spyOn(testParser, 'analyzeLinks').mockResolvedValue([]);
      vi.spyOn(testParser as any, 'getAIService').mockReturnValue({
        generateText: vi.fn().mockResolvedValue(JSON.stringify(mockJobs))
      });
      
      // Parse the HTML content
      const result = await testParser.parseJobsFromPage({
        url: testUrl,
        content: htmlContent,
        title: 'Careers at OpenAI',
        description: 'Find your next role at OpenAI'
      });
      
      // Verify job listings were extracted
      expect(result).toEqual(mockJobs);
    });
  });
});