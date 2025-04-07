// packages/crawler/__tests__/integration/web-crawler.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { WebCrawler } from '../../src/core/crawler/WebCrawler';
import { JobParserService } from '../../src/core/parser';
import { ScraperService } from '../../src/services/scraper.service';
import { JobSourceService } from '../../src/services/job-source.service';
import { CacheService } from '../../src/services/cache.service';
import { JobPostingProcessor } from '../../src/domain/job-posting.processor';
import { JobPostingValidator } from '../../src/domain/job-posting.validator';
import { DuplicateDetector } from '../../src/domain/duplicate.detector';
import { 
  createTestEnvironment, 
  cleanupTestEnvironment, 
  getTestConfig 
} from './test-environment';
import { 
  createMockRepositories, 
  createMockCrawler, 
  createMockParser,
  MockPlaywrightCrawler  
} from './test-mocks';
import { mockJobSite, mockJobPostings, mockOpenAIJobs, mockOpenAIContent } from './test-data';

// Test configuration
const config = getTestConfig();

describe('Web Crawler Integration', () => {
  // Test services and components
  let webCrawler: WebCrawler | MockPlaywrightCrawler;
  let scraperService: ScraperService;
  let mockRepositories: any;
  let testSourceId: number;
  
  // Setup before all tests
  beforeAll(async () => {
    // Initialize the test environment
    await createTestEnvironment(config);
    
    // Create source ID for testing
    testSourceId = 123; // We'll use a fixed ID for tests
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  
  // Reset services before each test
  beforeEach(async () => {
    // Create mocked or real repositories based on config
    if (config.useMocks) {
      // Setup with mocks
      mockRepositories = createMockRepositories();
      
      const jobSourceService = new JobSourceService(
        mockRepositories.jobSourceRepo, 
        mockRepositories.jobPostingRepo
      );
      
      const jobPostingValidator = new JobPostingValidator();
      const duplicateDetector = new DuplicateDetector(mockRepositories.jobPostingRepo);
      
      const jobPostingProcessor = new JobPostingProcessor(
        mockRepositories.jobPostingRepo,
        jobPostingValidator,
        duplicateDetector
      );
      
      const cacheService = new CacheService();
      
      // Create mock or real parser based on config
      const parser = config.useRealParser 
        ? new JobParserService() 
        : createMockParser();
      
      // Create mock or real WebCrawler based on config
      webCrawler = config.useRealCrawler 
        ? new WebCrawler(parser as JobParserService) 
        : createMockCrawler(parser as any);
      
      // Create ScraperService with mocked dependencies
      scraperService = new ScraperService(
        jobSourceService,
        cacheService,
        jobPostingProcessor,
        webCrawler as any
      );
      
      // Setup mock data
      mockRepositories.jobSourceRepo.getById.mockResolvedValue({
        id: testSourceId,
        url: mockJobSite.url,
        name: 'Test Source',
        keywords: 'test, jobs',
        status: 'ACTIVE'
      });
      
      // If using mock parser but real WebCrawler, mock the parser's methods
      if (config.useRealCrawler && !config.useRealParser) {
        const mockParser = createMockParser();
        vi.spyOn(parser as any, 'parseJobsFromPage').mockImplementation(mockParser.parseJobsFromPage);
        vi.spyOn(parser as any, 'analyzeLinks').mockImplementation(mockParser.analyzeLinks);
      }
    } else {
      // Setup with real dependencies
      // This would require configuring the test to use real connections and APIs
      const jobSourceRepo = new JobSourceService(
        /* Use real repositories here */
        {} as any,
        {} as any
      );
      
      const jobPostingValidator = new JobPostingValidator();
      const jobPostingRepo = {} as any; // Real repo would go here
      const duplicateDetector = new DuplicateDetector(jobPostingRepo);
      
      const jobPostingProcessor = new JobPostingProcessor(
        jobPostingRepo,
        jobPostingValidator,
        duplicateDetector
      );
      
      const cacheService = new CacheService();
      const parser = new JobParserService();
      webCrawler = new WebCrawler(parser);
      
      scraperService = new ScraperService(
        jobSourceRepo,
        cacheService,
        jobPostingProcessor,
        webCrawler
      );
    }
  });
  
  // Clean up after each test
  afterEach(async () => {
    // Reset or clean up any state
    if (config.useMocks) {
      // Reset mock calls
      Object.values(mockRepositories).forEach((repo: any) => {
        Object.values(repo).forEach((fn: any) => {
          if (typeof fn === 'function' && fn.mockReset) {
            fn.mockReset();
          }
        });
      });
    }
  });
  
  describe('WebCrawler', () => {
    it('should crawl job sites and find job postings', async () => {
      // Skip if using real crawler without mocks (needs more setup)
      if (config.useRealCrawler && !config.useMocks) {
        return;
      }
      
      // Setup mock behavior for crawler
      if (!config.useRealCrawler && webCrawler instanceof MockPlaywrightCrawler) {
        webCrawler.setMockJobs(mockJobPostings);
      } else if (config.useRealCrawler && config.useMocks) {
        // If using real crawler with mocks, mock the parseJobsFromPage method
        const mockParser = createMockParser();
        mockParser.parseJobsFromPage.mockResolvedValue(mockJobPostings);
        vi.spyOn((webCrawler as any).parser, 'parseJobsFromPage').mockImplementation(mockParser.parseJobsFromPage);
      }
      
      // Track processed jobs
      const processedJobs: any[] = [];
      
      // Execute the crawl
      const result = await (webCrawler as any).crawlSite(
        {
          sourceId: testSourceId,
          url: mockJobSite.url,
          keywords: 'test'
        },
        async (job: any) => {
          processedJobs.push(job);
          return processedJobs.length; // Return a job ID
        }
      );
      
      // Verify results
      expect(result.jobsFound.length).toBeGreaterThan(0);
      expect(processedJobs.length).toBe(mockJobPostings.length);
      expect(result.jobsStored.length).toBe(mockJobPostings.length);
    });
    
    it('should cancel an active crawler', async () => {
      // Skip if using real crawler without mocks
      if (config.useRealCrawler && !config.useMocks) {
        return;
      }
      
      // Test cancelCrawler functionality
      const cancelled = await (webCrawler as any).cancelCrawler(testSourceId);
      
      // Verify result
      expect(cancelled).toBe(true);
    });
    
    // Test with parsed OpenAI content if using real parser
    if (config.useRealParser) {
      it('should extract job listings from OpenAI careers page content', async () => {
        const parser = new JobParserService();
        
        // Mock the analyzeLinks method to avoid making actual API calls
        vi.spyOn(parser, 'analyzeLinks').mockResolvedValue([]);
        
        // Parse the mockOpenAIContent
        const jobListings = await parser.parseJobsFromPage({
          url: mockOpenAIContent.url,
          content: mockOpenAIContent.html,
          title: mockOpenAIContent.title,
          description: 'Careers at OpenAI'
        });
        
        // Verify job listings were extracted
        expect(jobListings.length).toBeGreaterThan(0);
        
        // Check specific job details
        const jobs = jobListings.filter(job => 
          job.title.includes('Security Engineer')
        );
        expect(jobs.length).toBeGreaterThan(0);
        
        // Verify organization is set correctly
        const jobWithOrg = jobListings.find(job => job.organization);
        expect(jobWithOrg?.organization.toLowerCase()).toContain('openai');
      });
    }
  });
  
  describe('ScraperService', () => {
    it('should refresh a job source', async () => {
      // Skip if using real services without mocks
      if (!config.useMocks) {
        return;
      }
      
      // Setup mock behavior for crawler
      if (!config.useRealCrawler && webCrawler instanceof MockPlaywrightCrawler) {
        webCrawler.setMockJobs(mockJobPostings);
      } else if (config.useRealCrawler && config.useMocks) {
        // If using real crawler with mocks, spy on its methods
        vi.spyOn(webCrawler as any, 'crawlSite').mockImplementation(async (options: any, callback: any) => {
          // Simulate job processing
          const jobsFound = mockJobPostings;
          const jobsStored = [];
          
          for (const job of mockJobPostings) {
            const jobId = await callback(job);
            if (jobId > 0) {
              jobsStored.push(jobId);
            }
          }
          
          return { jobsFound, jobsStored };
        });
      }
      
      // Mock job processor to return valid job IDs
      mockRepositories.jobPostingRepo.insert.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: Math.floor(Math.random() * 1000) + 1 })
      );
      
      // Track callback executions
      const callbackTracker = {
        jobFound: 0,
        complete: false,
        error: false
      };
      
      // Execute the refresh
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onJobFound: async () => { callbackTracker.jobFound++; },
          onComplete: async () => { callbackTracker.complete = true; },
          onError: async () => { callbackTracker.error = true; }
        },
        true // Force fresh crawl
      );
      
      // Verify results
      expect(result.jobsFound).toBeGreaterThan(0);
      expect(result.usedCache).toBe(false);
      
      // Verify repository calls
      expect(mockRepositories.jobSourceRepo.updateSourceStatus).toHaveBeenCalledWith(
        testSourceId, 'PENDING'
      );
      expect(mockRepositories.jobPostingRepo.deactivateBySourceId).toHaveBeenCalledWith(
        testSourceId
      );
    });
    
    it('should use cache when available', async () => {
      // Skip if using real services
      if (!config.useMocks) {
        return;
      }
      
      // Mock source with no global cache ID yet
      mockRepositories.jobSourceRepo.getById.mockResolvedValue({
        id: testSourceId,
        url: mockJobSite.url,
        name: 'Test Source',
        globalCacheId: null
      });
      
      // Mock cache service to return a cache entry
      mockRepositories.cacheService.checkCache.mockResolvedValue({
        id: 456,
        url: mockJobSite.url
      });
      
      // Mock that we copied 10 jobs from cache
      mockRepositories.cacheService.copyJobsFromCache.mockResolvedValue(10);
      
      // Mock getJobsForSource to return jobs
      mockRepositories.jobPostingRepo.getBySourceId.mockResolvedValue(mockJobPostings);
      
      // Execute the refresh without forcing
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onComplete: async (jobs: any[]) => {
            expect(jobs.length).toBeGreaterThan(0);
          }
        },
        false // Don't force refresh
      );
      
      // Verify results
      expect(result.usedCache).toBe(true);
      expect(result.jobsFound).toBe(10);
      
      // Verify cache-related calls
      expect(mockRepositories.cacheService.checkCache).toHaveBeenCalledWith(mockJobSite.url);
      expect(mockRepositories.cacheService.copyJobsFromCache).toHaveBeenCalledWith(testSourceId, 456);
    });
    
    it('should handle errors during refresh', async () => {
      // Skip if using real services
      if (!config.useMocks) {
        return;
      }
      
      // Setup mock error scenario
      mockRepositories.jobPostingRepo.deactivateBySourceId.mockRejectedValue(
        new Error('Database error')
      );
      
      // Track error callback
      let errorCalled = false;
      
      // Execute the refresh
      const result = await scraperService.refreshJobSource(
        testSourceId,
        {
          onError: async () => { errorCalled = true; }
        },
        true // Force fresh crawl
      );
      
      // Verify results
      expect(result.error).toBe('Database error');
      expect(errorCalled).toBe(true);
      
      // Verify error handling
      expect(mockRepositories.jobSourceRepo.updateSourceStatus).toHaveBeenCalledWith(
        testSourceId, 'ERROR', 'Database error'
      );
    });
    
    it('should schedule refresh of multiple sources', async () => {
      // Skip if using real services
      if (!config.useMocks) {
        return;
      }
      
      // Mock sources with different refresh frequencies
      const mockSources = [
        { id: 1, name: 'Daily Source', refreshFrequency: 'DAILY', url: 'https://example.com/1' },
        { id: 2, name: 'Weekly Source', refreshFrequency: 'WEEKLY', url: 'https://example.com/2' }
      ];
      
      mockRepositories.jobSourceRepo.getSourcesForFrequency.mockResolvedValue(mockSources);
      
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
  
  // Only run real parser tests with mock data if the flag is set
  if (config.useRealParser && config.useMocks) {
    describe('Real parser with mock data', () => {
      it('should parse sample HTML with real parser', async () => {
        // Create a real parser instance
        const parser = new JobParserService();
        
        // Parse the mock job site HTML
        const result = await parser.parseJobsFromPage({
          url: mockJobSite.url,
          content: mockJobSite.html,
          title: mockJobSite.title,
          description: mockJobSite.description
        });
        
        // We should find at least one job
        expect(result.length).toBeGreaterThan(0);
        
        // Check that found jobs have required fields
        for (const job of result) {
          expect(job.title).toBeDefined();
          expect(job.organization).toBeDefined();
          expect(job.description).toBeDefined();
          expect(job.url).toBeDefined();
        }
      });
    });
  }
});